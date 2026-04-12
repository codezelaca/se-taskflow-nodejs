# Step 1: Raw HTTP Server

## What You'll Learn

How to build a web server from scratch using only Node.js—without Express or any framework.

## Big Picture

Every web service starts as a Node.js HTTP server. It:

1. Listens for requests from clients
2. Parses the incoming data
3. Runs some logic
4. Sends back a response

This step teaches you exactly how each of these works.

## What To Build

An HTTP server that:

- Accepts POST /tasks requests with JSON data
- Returns GET /tasks to list all tasks
- Uses manual routing (no framework helps you)
- Parses request bodies from stream chunks
- Sends proper HTTP status codes

## Why This Matters

Frameworks like Express do all this automatically. But when things go wrong in production:

- You need to debug the lowest level
- You need to understand how bodies are parsed
- You need to know why a request might hang

Knowing the raw server means you can diagnose any issue.

## Real Example in Your Code

All routing lives in **[server.js](../server.js)** at the top. Look for the `createServer()` function.

Key parts:

- `http.createServer(async (req, res) => {...})` — creates the server
- `req.url` and `req.method` — tells you what request arrived
- `req.on('data', chunk => {...})` — receives body in parts
- `res.writeHead(200, { 'Content-Type': 'application/json' })` — sets response headers
- `res.end(JSON.stringify(data))` — sends the response

## How Request Bodies Work

When a client sends data (like POST with JSON), it arrives in **chunks**, not all at once.

Think of it like mail:

- Chunk 1: envelope arrives
- Chunk 2: first page of letter
- Chunk 3: second page
- Chunk 4: signature

Buffer all chunks, wait for `end`, then parse.

Example flow:

```javascript
let body = "";
req.on("data", (chunk) => {
  body += chunk; // Accumulate pieces
});
req.on("end", () => {
  const data = JSON.parse(body); // Parse when complete
});
```

If you parse before `end` fires, you get incomplete data. ✗

## Common Mistakes

❌ **Mistake 1:** Assuming body arrives all at once  
✓ **Fix:** Always listen to `data` and `end` events

❌ **Mistake 2:** Not handling parse errors  
✓ **Fix:** Wrap JSON.parse in try/catch

❌ **Mistake 3:** Wrong response headers  
✓ **Fix:** Always set `Content-Type: application/json`

❌ **Mistake 4:** Updating request body stream without buffering  
✓ **Fix:** Buffer everything first, parse second

## Your Turn: Build It

**Task:** Add a new endpoint `GET /health`

Requirements:

- Return `{ status: "ok", uptime: process.uptime() }`
- Status code: 200
- Content-Type: application/json
- Do NOT use Express or any external library

**Hints:**

- Add a new `if` statement checking `req.url` and `req.method`
- Use `res.writeHead()` to set headers
- Use `res.end()` to send the response

**Test it:**

```bash
curl http://localhost:3000/health
```

## Real-World Connection

Production incidents often trace back to:

- Wrong status code sent (500 instead of 400)
- Malformed response JSON
- Not handling network disconnections
- Request body timeouts

Understanding raw servers helps you:

- Spot issues faster
- Design better error pages
- Handle edge cases in production

## Next Step

The server is just infrastructure. Next, you'll learn how to **store and retrieve data** using a Hash Map.

[→ Step 2: In-Memory Storage](02-task-store.md)
