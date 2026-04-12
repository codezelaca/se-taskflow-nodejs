# Step 6: Error Handling & Logging

## What You'll Learn

How to handle errors gracefully and log events so you can debug problems later.

## Big Picture

Things go wrong:

- User sends invalid data
- Database connection fails
- Out of memory
- Network interruption

Instead of crashing, you should:

1. Catch the error
2. Log what happened (so you can debug later)
3. Send a sensible response to the user

## What To Build

A system that:

- Catches errors globally (one place, not every function)
- Logs errors with context (which request? which user? when exactly?)
- Returns consistent error responses (same format every time)
- Helps you debug by tracking request journey through middleware

## Code Location

See **[src/utils/logger.js](../src/utils/logger.js)** — logs all requests/responses  
See **[src/utils/errorHandler.js](../src/utils/errorHandler.js)** — standardized error responses

## The Problem Without Error Handling

```javascript
// Bad: Each endpoint handles its own errors
function createTask(req, res) {
  try {
    const task = store.create(req.body);
    res.end(JSON.stringify(task));
  } catch (e) {
    res.end("Error!"); // Inconsistent
  }
}

function updateTask(req, res) {
  try {
    const updated = store.update(req.params.id, req.body);
    res.end(JSON.stringify(updated));
  } catch (e) {
    res.writeHead(500);
    res.end("Server error"); // Different format!
  }
}
```

Problems:

- Different error formats
- No record of what happened
- Hard to debug
- Users confused by inconsistent messages

## The Solution: Error Handler

All errors follow the same format:

```json
{
  "error": "Authentication failed",
  "code": "UNAUTHORIZED",
  "httpStatus": 401,
  "requestId": "abc-123-def-456",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Why this format?**

- `error`: Human-readable message
- `code`: Machine-readable identifier (for front-end logic)
- `httpStatus`: Correct HTTP response code
- `requestId`: Links this error to all logs about this request
- `timestamp`: When it happened (helps correlate with other systems)

## Standard HTTP Status Codes

```
200 OK              — Success!
201 Created         — New resource created
400 Bad Request     — Client error (bad data)
401 Unauthorized    — Missing/invalid token
403 Forbidden       — User doesn't have permission
404 Not Found       — Resource doesn't exist
409 Conflict        — Impossible state (cycle in dependencies)
422 Unprocessable   — Data format is wrong
500 Internal Error  — Server crashed unexpectedly
```

Use the right code—it helps debugging.

## Logging: Tracking the Journey

Every request gets a unique `requestId`. Track it through the entire journey:

```
[REQUEST] requestId: abc-123
  url: POST /tasks
  user: admin-user
  timestamp: 2024-01-15T10:30:00Z

[AUTH PASS] requestId: abc-123
  handler: AuthHandler

[VALIDATION PASS] requestId: abc-123
  handler: ValidationHandler

[BUSINESS LOGIC] requestId: abc-123
  action: create task
  title: "Learn Node.js"

[RESPONSE] requestId: abc-123
  httpStatus: 201
  duration: 5ms
```

If something goes wrong, you can search for this requestId and see **exactly** where it failed.

## Real Log Example

```
2024-01-15T10:30:05Z [INFO] requestId=abc-123 POST /tasks user=admin
2024-01-15T10:30:05Z [AUTH] requestId=abc-123 token=valid
2024-01-15T10:30:05Z [VALIDATE] requestId=abc-123 data=valid
2024-01-15T10:30:06Z [ERROR] requestId=abc-123 Dependency not found: task-xyz
2024-01-15T10:30:06Z [RESPONSE] requestId=abc-123 status=422 message="Dependency not found"
```

If this request fails in production, you paste requestId into your logs and see exactly what happened.

## Try/Catch vs Global Handler

```javascript
// Simple: one place catches everything
try {
  // All business logic
  runMiddlewareChain();
  executeEndpoint();
  sendResponse();
} catch (error) {
  handleError(error, res);
}
```

This ensures:

- No error slips through
- All errors follow same format
- All logs include requestId
- Debugging is easy

## Your Turn: Add Logging

**Task:** Add a new log message whenever a task is created:

```javascript
// After creating task
logger.info("Task created", {
  requestId: req.requestId,
  taskId: task.id,
  title: task.title,
  priority: task.priority,
});
```

Test:

```bash
# Create a task
curl -X POST http://localhost:3000/tasks \
  -H "Authorization: Bearer secret-admin-123" \
  -d '{"title":"test","priority":5}'

# Check server terminal output for new log line
```

## Real-World Connection

- **Datadog, New Relic, Splunk:** Collect and analyze logs like this
- **AWS CloudWatch:** Stores logs for debugging
- **ELK Stack (Elasticsearch, Logstash, Kibana):** Searches logs by requestId
- **PagerDuty:** Alerts when errors spike

Companies spend millions on logging infrastructure because errors are expensive.

## Next Step

Errors happen. Logs fill up. Memory usage grows.

Next: **Understanding Memory & Preventing Leaks**.

[→ Step 7: Memory Management](07-memory.md)
