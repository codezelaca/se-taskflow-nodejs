const crypto = require("crypto");
const logger = require("../utils/logger");

const WS_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
const HEARTBEAT_INTERVAL_MS = 30000;

const OPCODES = {
  CONTINUATION: 0x0,
  TEXT: 0x1,
  BINARY: 0x2,
  CLOSE: 0x8,
  PING: 0x9,
  PONG: 0xa,
};

const safeJsonParse = (value) => {
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
};

const encodeFrame = (payload, opcode = OPCODES.TEXT) => {
  const data = Buffer.isBuffer(payload)
    ? payload
    : Buffer.from(
        typeof payload === "string" ? payload : JSON.stringify(payload),
      );

  const length = data.length;
  let header;

  if (length < 126) {
    header = Buffer.alloc(2);
    header[1] = length;
  } else if (length < 65536) {
    header = Buffer.alloc(4);
    header[1] = 126;
    header.writeUInt16BE(length, 2);
  } else {
    header = Buffer.alloc(10);
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(length), 2);
  }

  header[0] = 0x80 | opcode;
  return Buffer.concat([header, data]);
};

const decodeFrames = (buffer) => {
  const frames = [];
  let offset = 0;

  while (offset + 2 <= buffer.length) {
    const byte1 = buffer[offset];
    const byte2 = buffer[offset + 1];
    const opcode = byte1 & 0x0f;
    const isMasked = (byte2 & 0x80) === 0x80;
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

    const maskLength = isMasked ? 4 : 0;
    const frameLength = headerLength + maskLength + payloadLength;
    if (offset + frameLength > buffer.length) break;

    let payloadOffset = offset + headerLength;
    let maskingKey = null;

    if (isMasked) {
      maskingKey = buffer.subarray(payloadOffset, payloadOffset + 4);
      payloadOffset += 4;
    }

    let payload = buffer.subarray(payloadOffset, payloadOffset + payloadLength);

    if (isMasked && maskingKey) {
      const unmasked = Buffer.alloc(payloadLength);
      for (let i = 0; i < payloadLength; i += 1) {
        unmasked[i] = payload[i] ^ maskingKey[i % 4];
      }
      payload = unmasked;
    }

    frames.push({
      fin: (byte1 & 0x80) === 0x80,
      opcode,
      payload,
    });

    offset += frameLength;
  }

  return {
    frames,
    remainder: buffer.subarray(offset),
  };
};

class WebSocketHub {
  constructor(options = {}) {
    this.path = options.path || "/ws/tasks";
    this.clients = new Map();
    this.clientCounter = 0;
    this.heartbeatTimer = null;
    this.startedAt = Date.now();
    this.startHeartbeat();
  }

  createAcceptKey(secWebSocketKey) {
    return crypto
      .createHash("sha1")
      .update(`${secWebSocketKey}${WS_GUID}`)
      .digest("base64");
  }

  handleUpgrade(req, socket, head, pathname, memoryManager) {
    if (pathname !== this.path) {
      socket.write("HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return false;
    }

    const upgradeHeader = String(req.headers.upgrade || "").toLowerCase();
    const connectionHeader = String(req.headers.connection || "").toLowerCase();
    const secWebSocketKey = req.headers["sec-websocket-key"];
    const secWebSocketVersion = req.headers["sec-websocket-version"];

    if (
      upgradeHeader !== "websocket" ||
      !connectionHeader.includes("upgrade") ||
      !secWebSocketKey ||
      secWebSocketVersion !== "13"
    ) {
      socket.write("HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return false;
    }

    const acceptKey = this.createAcceptKey(secWebSocketKey);
    const headers = [
      "HTTP/1.1 101 Switching Protocols",
      "Upgrade: websocket",
      "Connection: Upgrade",
      `Sec-WebSocket-Accept: ${acceptKey}`,
      "\r\n",
    ];

    socket.write(headers.join("\r\n"));
    socket.setNoDelay(true);

    const clientId = `ws-${++this.clientCounter}`;
    const clientState = {
      id: clientId,
      socket,
      buffer: Buffer.alloc(0),
      isAlive: true,
      createdAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
      rooms: new Set(["tasks"]),
    };

    this.clients.set(clientId, clientState);
    memoryManager?.recordEvent({
      type: "websocket.connected",
      clientId,
      path: pathname,
    });

    logger.info("WebSocket client connected", {
      clientId,
      pathname,
      connectedClients: this.clients.size,
    });

    socket.on("data", (chunk) =>
      this.handleSocketData(clientState, chunk, memoryManager),
    );
    socket.on("error", (error) =>
      this.removeClient(clientState, "socket_error", error.message),
    );
    socket.on("end", () => this.removeClient(clientState, "socket_end"));
    socket.on("close", () => this.removeClient(clientState, "socket_close"));
    if (head && head.length > 0) {
      socket.unshift(head);
    }

    this.send(clientState, {
      type: "connection.ready",
      clientId,
      timestamp: new Date().toISOString(),
      subscribedRooms: Array.from(clientState.rooms),
    });

    return true;
  }

  handleSocketData(clientState, chunk, memoryManager) {
    clientState.buffer = Buffer.concat([clientState.buffer, chunk]);

    let decoded;
    try {
      decoded = decodeFrames(clientState.buffer);
    } catch (error) {
      this.removeClient(clientState, "protocol_error", error.message);
      return;
    }

    clientState.buffer = decoded.remainder;

    for (const frame of decoded.frames) {
      clientState.lastSeenAt = new Date().toISOString();

      if (frame.opcode === OPCODES.PONG) {
        clientState.isAlive = true;
        continue;
      }

      if (frame.opcode === OPCODES.PING) {
        clientState.isAlive = true;
        this.sendControl(clientState, OPCODES.PONG, frame.payload);
        continue;
      }

      if (frame.opcode === OPCODES.CLOSE) {
        this.sendControl(clientState, OPCODES.CLOSE, Buffer.alloc(0));
        this.removeClient(clientState, "client_close");
        return;
      }

      if (frame.opcode !== OPCODES.TEXT) {
        continue;
      }

      const message = safeJsonParse(frame.payload.toString("utf8"));
      if (!message || typeof message !== "object") {
        this.send(clientState, {
          type: "error",
          code: "INVALID_MESSAGE",
          message: "WebSocket messages must be JSON objects.",
          timestamp: new Date().toISOString(),
        });
        continue;
      }

      if (message.type === "subscribe") {
        const rooms = Array.isArray(message.rooms) ? message.rooms : [];
        clientState.rooms = new Set(rooms.length > 0 ? rooms : ["tasks"]);
        memoryManager?.recordEvent({
          type: "websocket.subscribed",
          clientId: clientState.id,
          rooms: Array.from(clientState.rooms),
        });
        this.send(clientState, {
          type: "subscription.confirmed",
          rooms: Array.from(clientState.rooms),
          timestamp: new Date().toISOString(),
        });
        continue;
      }

      if (message.type === "ping") {
        this.send(clientState, {
          type: "pong",
          timestamp: new Date().toISOString(),
        });
        continue;
      }

      this.send(clientState, {
        type: "error",
        code: "UNSUPPORTED_MESSAGE",
        message: `Unsupported message type: ${message.type}`,
        timestamp: new Date().toISOString(),
      });
    }
  }

  send(clientState, payload) {
    if (!clientState || clientState.socket.destroyed) {
      return false;
    }

    const body =
      Buffer.isBuffer(payload) || typeof payload === "string"
        ? payload
        : JSON.stringify(payload);

    clientState.socket.write(encodeFrame(body, OPCODES.TEXT));
    return true;
  }

  sendControl(clientState, opcode, payload = Buffer.alloc(0)) {
    if (!clientState || clientState.socket.destroyed) {
      return false;
    }

    clientState.socket.write(encodeFrame(payload, opcode));
    return true;
  }

  broadcast(payload, options = {}) {
    const message =
      typeof payload === "string" || Buffer.isBuffer(payload)
        ? payload
        : JSON.stringify(payload);

    const targetRoom = options.room || "tasks";
    let delivered = 0;

    for (const clientState of this.clients.values()) {
      if (!clientState.rooms.has(targetRoom)) {
        continue;
      }

      if (this.send(clientState, message)) {
        delivered += 1;
      }
    }

    return delivered;
  }

  broadcastTaskEvent(type, task, requestId, extra = {}) {
    const payload = {
      type,
      task:
        task && typeof task === "object"
          ? {
              ...task,
              dependencies:
                task.dependencies &&
                typeof task.dependencies.toArray === "function"
                  ? task.dependencies.toArray()
                  : task.dependencies,
            }
          : task,
      requestId,
      timestamp: new Date().toISOString(),
      ...extra,
    };

    return this.broadcast(payload, { room: "tasks" });
  }

  removeClient(clientState, reason = "disconnect", details = null) {
    if (!clientState || !this.clients.has(clientState.id)) {
      return;
    }

    this.clients.delete(clientState.id);
    clientState.isAlive = false;

    try {
      if (!clientState.socket.destroyed) {
        clientState.socket.end();
        clientState.socket.destroy();
      }
    } catch (error) {
      // Best effort cleanup.
    }

    logger.warn("WebSocket client disconnected", {
      clientId: clientState.id,
      reason,
      details,
      connectedClients: this.clients.size,
    });
  }

  startHeartbeat() {
    if (this.heartbeatTimer) {
      return;
    }

    this.heartbeatTimer = setInterval(() => {
      for (const clientState of this.clients.values()) {
        if (!clientState.isAlive) {
          this.removeClient(clientState, "heartbeat_timeout");
          continue;
        }

        clientState.isAlive = false;
        try {
          this.sendControl(clientState, OPCODES.PING, Buffer.from("heartbeat"));
        } catch (error) {
          this.removeClient(clientState, "ping_failed", error.message);
        }
      }
    }, HEARTBEAT_INTERVAL_MS);

    this.heartbeatTimer.unref();
  }

  getStats() {
    return {
      path: this.path,
      connectedClients: this.clients.size,
      rooms: Array.from(
        new Set(
          Array.from(this.clients.values()).flatMap((clientState) =>
            Array.from(clientState.rooms),
          ),
        ),
      ),
      uptimeSeconds: Number(((Date.now() - this.startedAt) / 1000).toFixed(2)),
    };
  }

  shutdown() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    for (const clientState of this.clients.values()) {
      try {
        this.sendControl(clientState, OPCODES.CLOSE, Buffer.alloc(0));
        clientState.socket.end();
        clientState.socket.destroy();
      } catch (error) {
        // ignore during shutdown
      }
    }

    this.clients.clear();
  }
}

module.exports = WebSocketHub;
