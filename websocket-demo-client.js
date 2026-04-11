// ==========================================
// TaskFlow WebSocket Demo Client
// ==========================================
// Run with:
//   node websocket-demo-client.js
//
// Optional args:
//   node websocket-demo-client.js ws://localhost:3000/ws/tasks

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
const isSecure = targetUrl.protocol === "wss:";

if (isSecure) {
  console.error(
    "This demo client currently supports ws:// only. Use ws://localhost:3000/ws/tasks.",
  );
  process.exit(1);
}

const createMaskingKey = () => crypto.randomBytes(4);

const encodeClientFrame = (payload, opcode = OPCODES.TEXT) => {
  const data = Buffer.isBuffer(payload)
    ? payload
    : Buffer.from(
        typeof payload === "string" ? payload : JSON.stringify(payload),
      );

  const mask = createMaskingKey();
  const length = data.length;
  let header;
  let payloadLengthFieldSize = 0;

  if (length < 126) {
    header = Buffer.alloc(2);
    header[1] = 0x80 | length;
  } else if (length < 65536) {
    header = Buffer.alloc(4);
    header[1] = 0x80 | 126;
    header.writeUInt16BE(length, 2);
    payloadLengthFieldSize = 2;
  } else {
    header = Buffer.alloc(10);
    header[1] = 0x80 | 127;
    header.writeBigUInt64BE(BigInt(length), 2);
    payloadLengthFieldSize = 8;
  }

  header[0] = 0x80 | opcode;

  const masked = Buffer.alloc(length);
  for (let i = 0; i < length; i += 1) {
    masked[i] = data[i] ^ mask[i % 4];
  }

  return Buffer.concat([header, mask, masked]);
};

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
        throw new Error("WebSocket frame too large.");
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

  return {
    frames,
    remainder: buffer.subarray(offset),
  };
};

const clientKey = crypto.randomBytes(16).toString("base64");
const socket = net.createConnection({ host: targetUrl.hostname, port });
let handshakeComplete = false;
let buffer = Buffer.alloc(0);

const send = (payload, opcode = OPCODES.TEXT) => {
  socket.write(encodeClientFrame(payload, opcode));
};

socket.on("connect", () => {
  const request = [
    `GET ${targetUrl.pathname} HTTP/1.1`,
    `Host: ${targetUrl.hostname}:${port}`,
    "Upgrade: websocket",
    "Connection: Upgrade",
    `Sec-WebSocket-Key: ${clientKey}`,
    "Sec-WebSocket-Version: 13",
    "\r\n",
  ].join("\r\n");

  socket.write(request);
  console.log(`Connecting to ${targetUrl.href}...`);
});

socket.on("data", (chunk) => {
  if (!handshakeComplete) {
    const response = chunk.toString("utf8");
    const headerEnd = response.indexOf("\r\n\r\n");

    if (headerEnd === -1) {
      return;
    }

    const headerText = response.slice(0, headerEnd);
    if (!headerText.includes("101 Switching Protocols")) {
      console.error("Handshake failed:");
      console.error(headerText);
      socket.end();
      return;
    }

    handshakeComplete = true;
    buffer = Buffer.from(chunk.subarray(headerEnd + 4));

    console.log("WebSocket connection established.");
    console.log("Subscribed to tasks room and waiting for broadcasts...");
    send({ type: "subscribe", rooms: ["tasks"] });

    if (buffer.length > 0) {
      handleFrames();
    }
    return;
  }

  buffer = Buffer.concat([buffer, chunk]);
  handleFrames();
});

const handleFrames = () => {
  const decoded = decodeFrames(buffer);
  buffer = decoded.remainder;

  for (const frame of decoded.frames) {
    if (frame.opcode === OPCODES.TEXT) {
      const message = frame.payload.toString("utf8");
      try {
        const parsed = JSON.parse(message);
        console.log(JSON.stringify(parsed, null, 2));
      } catch (error) {
        console.log(message);
      }
      continue;
    }

    if (frame.opcode === OPCODES.PING) {
      send(frame.payload, OPCODES.PONG);
      continue;
    }

    if (frame.opcode === OPCODES.PONG) {
      continue;
    }

    if (frame.opcode === OPCODES.CLOSE) {
      console.log("Server closed the WebSocket connection.");
      socket.end();
      process.exit(0);
    }
  }
};

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
  } catch (error) {
    // ignore
  }
  socket.end();
  process.exit(0);
});
