# API Reference

All endpoints require authentication. Use these headers:

```bash
# Admin access (create/update/delete)
-H "Authorization: Bearer secret-admin-123"

# User access (read-only)
-H "Authorization: Bearer secret-user-123"
```

## Task Management

### List All Tasks

```bash
GET /tasks
```

Returns array of all tasks.

### Get One Task

```bash
GET /tasks/:id
```

Returns a specific task by ID.

### Create Task

```bash
POST /tasks
Content-Type: application/json

{
  "title": "Task name",
  "priority": 5,
  "dependencies": []
}
```

Returns the created task with generated ID.

### Update Task

```bash
PUT /tasks/:id
Content-Type: application/json

{
  "title": "New title",
  "priority": 8
}
```

Returns updated task.

### Delete Task

```bash
DELETE /tasks/:id
```

Returns success.

## Data Access

### Get Queue Structure

```bash
GET /tasks/queue
```

Returns the internal Max-Heap structure (for learning).

### Get Highest Priority Task

```bash
GET /tasks/peek
```

Same as `/tasks/next`, returns top priority task.

### Get Next Task

```bash
GET /tasks/next
```

Returns highest priority task without removing it.

## Dependency Resolution

### Resolve All Tasks

```bash
GET /tasks/resolve
```

Returns execution order for all tasks (topological sort).

Status codes:

- `200` — Success, execution order found
- `409` — Conflict, cycle detected (impossible)
- `422` — Unprocessable, missing dependency

### Resolve Single Task

```bash
GET /tasks/:id/resolve
```

Returns execution order for this task and its dependencies.

## Streaming Exports

### CSV Export

```bash
GET /tasks/export.csv
```

Returns tasks as CSV, suitable for Excel/Google Sheets.

### NDJSON Stream

```bash
GET /tasks/stream.ndjson
```

Returns tasks as newline-delimited JSON, one per line.

## Processing

### Start Report Job

```bash
POST /tasks/reports/start?heavyIterations=1000000
```

Starts CPU-intensive report in worker thread.

Returns:

```json
{ "jobId": "abc-123-def" }
```

### Get Report Status

```bash
GET /tasks/reports/:jobId
```

Returns one of:

```json
{ "status": "processing", "progress": "..." }
{ "status": "complete", "result": 123456 }
{ "status": "error", "error": "..." }
```

### Get Worker Stats

```bash
GET /tasks/reports/stats
```

Returns worker pool statistics.

## Monitoring

### Memory Usage

```bash
GET /tasks/system/memory
```

Returns heap usage, RSS, and garbage collection info.

### WebSocket Hub Stats

```bash
GET /tasks/system/ws
```

Returns number of connected clients and active subscriptions.

## Real-Time

### WebSocket Connection

```bash
WS /ws/tasks
```

Listen for events:

```json
{ "event": "task.created", "task": { ... } }
{ "event": "task.updated", "task": { ... } }
{ "event": "task.deleted", "taskId": "..." }
```

## Error Responses

All errors follow this format:

```json
{
  "error": "Human-readable message",
  "code": "MACHINE_CODE",
  "httpStatus": 400,
  "requestId": "request-uuid",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

Common status codes:

- `200` — Success
- `201` — Created
- `400` — Bad request (invalid data)
- `401` — Unauthorized (missing/invalid token)
- `403` — Forbidden (insufficient permissions)
- `404` — Not found
- `409` — Conflict (cycle detected)
- `422` — Unprocessable entity (malformed data)
- `500` — Server error

## Testing

See `scripts/full-demo.sh` for comprehensive examples of every endpoint.
