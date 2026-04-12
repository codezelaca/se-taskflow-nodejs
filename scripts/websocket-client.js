const net = require("net");
const crypto = require("crypto");
const { URL } = require("url");

const DEFAULT_URL = "ws://localhost:3000/ws/tasks";

const OPCODES = {
  TEXT: 0x1,
  CLOSE: 0x8,
  PING: 0x9,
  PONG: 0xa,
};

const targetUrl = new URL(process.argv[2] || DEFAULT_URL);
const port =
  Number(targetUrl.port) || (targetUrl.protocol === "wss:" ? 443 : 80);

// Keep this script simple: only ws:// (non-TLS) for local demos.
if (targetUrl.protocol === "wss:") {
  console.error("This demo client supports ws:// only.");
  process.exit(1);
}

const createMaskingKey = () => crypto.randomBytes(4);

// Client frames must be masked per WebSocket protocol rules.
const encodeClientFrame = (payload, opcode = OPCODES.TEXT) => {
  const data = Buffer.isBuffer(payload)
    ? payload
    : Buffer.from(
        typeof payload === "string" ? payload : JSON.stringify(payload),
      );

  const mask = createMaskingKey();
  const length = data.length;
  let header;

  if (length < 126) {
    header = Buffer.alloc(2);
    header[1] = 0x80 | length;
  } else if (length < 65536) {
    header = Buffer.alloc(4);
    header[1] = 0x80 | 126;
    header.writeUInt16BE(length, 2);
  } else {
    header = Buffer.alloc(10);
    header[1] = 0x80 | 127;
    header.writeBigUInt64BE(BigInt(length), 2);
  }

  header[0] = 0x80 | opcode;

  const masked = Buffer.alloc(length);
  for (let i = 0; i < length; i += 1) {
    masked[i] = data[i] ^ mask[i % 4];
  }

  return Buffer.concat([header, mask, masked]);
};

// Decode server frames from raw TCP stream bytes.
const decodeFrames = (buffer) => {
  const frames = [];
  let offset = 0;

  while (offset + 2 <= buffer.length) {
    const byte1 = buffer[offset];
    const byte2 = buffer[offset + 1];
    const opcode = byte1 & 0x0f;
    let payloadLength = byte2 & 0x7f;
    let headerLength = 2;

    if (payloadLength === 126) {
      if (offset + 4 > buffer.length) break;
      payloadLength = buffer.readUInt16BE(offset + 2);
      headerLength = 4;
    } else if (payloadLength === 127) {
      if (offset + 10 > buffer.length) break;
      const lengthValue = buffer.readBigUInt64BE(offset + 2);
      if (lengthValue > BigInt(Number.MAX_SAFE_INTEGER)) {
        throw new Error("Frame too large");
      }
      payloadLength = Number(lengthValue);
      headerLength = 10;
    }

    const frameLength = headerLength + payloadLength;
    if (offset + frameLength > buffer.length) break;

    const payload = buffer.subarray(
      offset + headerLength,
      offset + frameLength,
    );
    frames.push({ opcode, payload });
    offset += frameLength;
  }

  return { frames, remainder: buffer.subarray(offset) };
};

const key = crypto.randomBytes(16).toString("base64");
const socket = net.createConnection({ host: targetUrl.hostname, port });

let handshakeComplete = false;
let buffer = Buffer.alloc(0);

const send = (payload, opcode = OPCODES.TEXT) => {
  socket.write(encodeClientFrame(payload, opcode));
};

const handleFrames = () => {
  const decoded = decodeFrames(buffer);
  buffer = decoded.remainder;

  for (const frame of decoded.frames) {
    if (frame.opcode === OPCODES.TEXT) {
      // Pretty print JSON messages so task events are easy to read.
      const message = frame.payload.toString("utf8");
      try {
        console.log(JSON.stringify(JSON.parse(message), null, 2));
      } catch {
        console.log(message);
      }
      continue;
    }

    if (frame.opcode === OPCODES.PING) {
      // Reply to server heartbeat pings.
      send(frame.payload, OPCODES.PONG);
      continue;
    }

    if (frame.opcode === OPCODES.CLOSE) {
      console.log("Server closed connection.");
      socket.end();
      process.exit(0);
    }
  }
};

socket.on("connect", () => {
  // Minimal manual WebSocket upgrade request.
  const request = [
    `GET ${targetUrl.pathname} HTTP/1.1`,
    `Host: ${targetUrl.hostname}:${port}`,
    "Upgrade: websocket",
    "Connection: Upgrade",
    `Sec-WebSocket-Key: ${key}`,
    "Sec-WebSocket-Version: 13",
    "\r\n",
  ].join("\r\n");

  socket.write(request);
  console.log(`Connecting to ${targetUrl.href}`);
});

socket.on("data", (chunk) => {
  if (!handshakeComplete) {
    const asText = chunk.toString("utf8");
    const headerEnd = asText.indexOf("\r\n\r\n");
    if (headerEnd === -1) return;

    const headers = asText.slice(0, headerEnd);
    if (!headers.includes("101 Switching Protocols")) {
      console.error("Handshake failed:\n" + headers);
      socket.end();
      return;
    }

    handshakeComplete = true;
    buffer = Buffer.from(chunk.subarray(headerEnd + 4));
    console.log("Connected and subscribing to tasks room...");
    send({ type: "subscribe", rooms: ["tasks"] });

    if (buffer.length > 0) {
      handleFrames();
    }
    return;
  }

  buffer = Buffer.concat([buffer, chunk]);
  handleFrames();
});

socket.on("error", (error) => {
  console.error("WebSocket client error:", error.message);
  process.exitCode = 1;
});

socket.on("close", () => {
  console.log("Connection closed.");
});

process.on("SIGINT", () => {
  try {
    send(Buffer.alloc(0), OPCODES.CLOSE);
  } catch {
    // ignore
  }
  socket.end();
  process.exit(0);
});
