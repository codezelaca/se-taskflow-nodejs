# Step 10: WebSockets

## What You'll Learn

How to maintain real-time, two-way communication between server and clients.

## Big Picture

HTTP is **one-way with request/response**:

```
Client: "Give me tasks"      →  Server
Client: ← "Here are tasks"
```

Client must ask. Server can't notify.

But with **WebSockets**, the connection stays open:

```
Client ←→ Server
(Connection always open, either can send)
```

Server can instantly notify all clients when something changes.

Example in Taskflow:

- User A creates task
- Server immediately notifies User B: "New task!"
- User B sees it in real-time without refreshing

## What To Build

A system that:

- Upgrades HTTP connection to WebSocket
- Handles frame encoding/decoding (WebSocket protocol details)
- Broadcasts task events to all connected clients
- Maintains heartbeat to detect disconnections
- Organizes clients into subscription rooms

## Code Location

See **[src/services/WebSocketHub.js](../src/services/WebSocketHub.js)** — the WebSocket server  
See **[scripts/websocket-client.js](../scripts/websocket-client.js)** — terminal WebSocket client for testing

Endpoints:

- `WS /ws/tasks` — connect for live task events

## The WebSocket Protocol

### Step 1: HTTP Upgrade

Initial request is still HTTP:

```
GET /ws/tasks HTTP/1.1
Host: localhost:3000
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13
```

Server responds:

```
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
```

Now the connection is WebSocket, not HTTP.

### Step 2: Bi-Directional Messages

Once upgraded, both can send anytime:

```
Client sends: { type: 'message', data: 'hello' }
Server sends: { type: 'task-created', task: { id: '123', ... } }
Server sends: { type: 'task-updated', task: { id: '456', ... } }
```

### Step 3: Frames

WebSocket data is chunked into **frames**. Each frame has:

- Header (opcode: text or binary?)
- Payload length
- Masking key (for client safety)
- Actual data

Node.js handles frame details automatically. You just send/receive.

## Server-Side WebSocket

```javascript
// Upgrade HTTP connection
const socket = new WebSocket(req, socket, head);

// Listen for messages
socket.on("message", (data) => {
  const msg = JSON.parse(data);
  console.log("Client sent:", msg);
});

// Send messages
socket.send(
  JSON.stringify({
    type: "notification",
    event: "task-created",
  }),
);

// Handle disconnection
socket.on("close", () => {
  console.log("Client disconnected");
});
```

## Client-Side WebSocket

```javascript
// Browser or Node.js
const ws = new WebSocket("ws://localhost:3000/ws/tasks");

// Connection opened
ws.onopen = () => {
  console.log("Connected");
  ws.send(JSON.stringify({ message: "Hello" }));
};

// Message received
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  console.log("Server sent:", msg);
  // Update UI here
};

// Connection closed
ws.onclose = () => {
  console.log("Disconnected");
};
```

## Broadcasting: Tell Everyone

When a task is created, notify all connected clients:

```javascript
class WebSocketHub {
  broadcast(event, data) {
    // Send to all clients
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ event, data }));
      }
    });
  }
}

// When a task is created:
hub.broadcast("task.created", { id: "123", title: "Learn" });
// All connected browsers instantly see the new task
```

## Heartbeat: Keepalive

WebSocket connections can hang if network is unreliable.

Solution: Send heartbeat periodically:

```javascript
setInterval(() => {
  clients.forEach((client) => {
    if (client.isAlive === false) {
      return client.terminate(); // Dead connection
    }

    client.isAlive = false;
    client.ping(); // Ask client to respond
  });
}, 30000);

// Client responds to ping with pong
client.on("pong", () => {
  client.isAlive = true;
});
```

Every 30 seconds: "Are you alive?"  
Client: "Pong! Yes I'm alive"  
If no pong 30s later: Connection dead, remove.

## Rooms: Selective Broadcasting

Sometimes you only want to notify specific clients.

```javascript
class WebSocketHub {
  subscribe(client, room) {
    if (!this.rooms[room]) {
      this.rooms[room] = new Set();
    }
    this.rooms[room].add(client);
  }

  broadcastToRoom(room, event, data) {
    this.rooms[room].forEach((client) => {
      client.send(JSON.stringify({ event, data }));
    });
  }
}

// Example
hub.subscribe(clientA, "project-123");
hub.subscribe(clientB, "project-456");

// Only notify project-123 subscribers
hub.broadcastToRoom("project-123", "task.created", {
  id: "789",
  title: "New task",
});
// ClientA notified
// ClientB NOT notified (different room)
```

## Event Types in Taskflow

When task events happen, broadcast:

```
task.created    → New task added
task.updated    → Task changed (name, priority, status)
task.deleted    → Task removed
task.moved      → Task priority changed (moved in queue)
```

Client receives:

```json
{
  "event": "task.updated",
  "task": {
    "id": "abc-123",
    "title": "Learn WebSockets",
    "priority": 10
  }
}
```

## Your Turn: Try It

**Task 1:** Terminal 1 - Start server:

```bash
node server.js
```

**Task 2:** Terminal 2 - Connect WebSocket client:

```bash
node scripts/websocket-client.js
```

Should print:

```
Connected to ws://localhost:3000/ws/tasks
Waiting for events...
```

**Task 3:** Terminal 3 - Create a task:

```bash
curl -X POST http://localhost:3000/tasks \
  -H "Authorization: Bearer secret-admin-123" \
  -H "Content-Type: application/json" \
  -d '{"title":"WebSocket test","priority":5}'
```

**Terminal 2 should immediately print:**

```
Event: task.created
Task: { id: 'abc-123', title: 'WebSocket test', ...}
```

No polling, no delay—instant notification!

## Real-World Connection

- **Slack messages:** Instant updates using WebSockets
- **Google Docs:** Real-time collaboration
- **Live sports scores:** Updates broadcast to millions
- **Trading platforms:** Stock price updates in real-time
- **Multiplayer games:** Player actions synchronized instantly

WebSockets are essential for modern real-time apps.

## What You've Learned

You've now covered **10 core backend engineering concepts:**

1. ✅ Raw HTTP servers (no frameworks)
2. ✅ In-memory storage (Hash Maps)
3. ✅ Priority queues (efficiency)
4. ✅ Dependency chains (recursion, cycle detection)
5. ✅ Middleware patterns (request pipelines)
6. ✅ Error handling (structured logging)
7. ✅ Memory management (GC, leaks)
8. ✅ Worker threads (CPU offloading)
9. ✅ Streaming (efficient data transfer)
10. ✅ WebSockets (real-time communication)

This is **production-level engineering**. Most web developers never dig this deep.

## Final Exercise: Full Demo

Run the complete system:

```bash
# Terminal 1
node server.js

# Terminal 2
node scripts/websocket-client.js

# Terminal 3
bash scripts/full-demo.sh
```

Watch all 10 concepts work together:

- HTTP requests being routed
- Tasks being stored and retrieved
- Priority queue ordering
- Dependencies being resolved
- Middleware chain executing
- Errors being handled
- Memory being tracked
- Workers processing in parallel
- CSV/NDJSON streaming
- WebSocket broadcasting live updates

**Congratulations!** You've built a production-ready backend from scratch.

## Where to Go Next

- Read the **supporting docs**: [event-loop-and-libuv.md](event-loop-and-libuv.md) and [big-o-and-data-structures.md](big-o-and-data-structures.md)
- Study frameworks like Express, Fastify, Koa—you now understand what they abstract away
- Read production codebases (Node.js, Spring, Django)—you can follow them now
- Build your own project using these patterns
- Contribute to open source

You're now at the level where you can understand and debug any backend system.

[← Back to all steps](README.md)
