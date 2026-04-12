# TaskFlow Integrated Task-Board Demo

This runbook uses integrated task-board routes so all features feel like one application server.

## Terminal Setup

- Terminal 1: API server
- Terminal 2: WebSocket client
- Terminal 3: Task CRUD + reports
- Terminal 4: Memory management + streaming

## Terminal 1 - Start server

```bash
cd /Users/sayuru/Documents/GitHub/se-taskflow-nodejs
node server.js
```

## Terminal 2 - Start WebSocket client

```bash
cd /Users/sayuru/Documents/GitHub/se-taskflow-nodejs
node websocket-demo-client.js
```

You should see `connection.ready` and `subscription.confirmed`.

## Terminal 3 - Core task board flow

Create task:

```bash
curl -s -X POST http://localhost:3000/tasks \
  -H 'Content-Type: application/json' \
  -H 'Authorization: secret-admin-123' \
  -d '{"title":"Task A","description":"integrated demo","priority":8}' | jq .
```

Create another task:

```bash
curl -s -X POST http://localhost:3000/tasks \
  -H 'Content-Type: application/json' \
  -H 'Authorization: secret-admin-123' \
  -d '{"title":"Task B","description":"second","priority":4}' | jq .
```

List tasks:

```bash
curl -s -H 'Authorization: secret-user-123' http://localhost:3000/tasks | jq .
```

Get next priority candidate:

```bash
curl -s -H 'Authorization: secret-user-123' http://localhost:3000/tasks/next | jq .
```

Update task (replace TASK_ID):

```bash
curl -s -X PUT http://localhost:3000/tasks/TASK_ID \
  -H 'Content-Type: application/json' \
  -H 'Authorization: secret-admin-123' \
  -d '{"status":"in-progress"}' | jq .
```

Delete task (replace TASK_ID):

```bash
curl -s -X DELETE http://localhost:3000/tasks/TASK_ID \
  -H 'Authorization: secret-admin-123'
```

You should see real-time task events in Terminal 2.

## Terminal 3 - Integrated worker reports

Start report job:

```bash
curl -s -X POST 'http://localhost:3000/tasks/reports/start?heavyIterations=30000000' \
  -H 'Authorization: secret-admin-123' | jq .
```

Copy `jobId`, then poll:

```bash
curl -s -H 'Authorization: secret-user-123' http://localhost:3000/tasks/reports/JOB_ID | jq .
```

Report worker pool stats:

```bash
curl -s -H 'Authorization: secret-user-123' http://localhost:3000/tasks/reports/stats | jq .
```

## Terminal 4 - Integrated memory management

System memory stats:

```bash
curl -s -H 'Authorization: secret-user-123' http://localhost:3000/tasks/system/memory | jq .
```

Create intentional retained batch:

```bash
curl -s -X POST 'http://localhost:3000/tasks/memory/leak?count=500&sizeKb=32' \
  -H 'Authorization: secret-admin-123' | jq .
```

Create bounded safe cache batch:

```bash
curl -s -X POST 'http://localhost:3000/tasks/memory/safe?count=500&sizeKb=32' \
  -H 'Authorization: secret-admin-123' | jq .
```

Clear memory demo caches:

```bash
curl -s -X POST http://localhost:3000/tasks/memory/clear \
  -H 'Authorization: secret-admin-123' | jq .
```

## Terminal 4 - Integrated streaming

Task CSV export:

```bash
curl -s -H 'Authorization: secret-user-123' http://localhost:3000/tasks/export.csv | head -n 10
```

Task NDJSON stream:

```bash
curl -s -H 'Authorization: secret-user-123' http://localhost:3000/tasks/stream.ndjson | head -n 10
```

## WebSocket system stats

```bash
curl -s -H 'Authorization: secret-user-123' http://localhost:3000/tasks/system/ws | jq .
```

## Stop everything

- Ctrl+C in Terminal 1 server
- Ctrl+C in Terminal 2 websocket client
