# Full TaskFlow Demo (Unified)

This project now has a single integrated demo path to learn all major backend concepts in one task-board flow.

## What this covers in one run

1. Task CRUD and priority queue behavior
2. Recursive dependency resolution and cycle detection
3. WebSocket live updates on task lifecycle
4. Worker-thread report generation (async + heavy mode)
5. Blocking vs worker comparison
6. Memory retained batch vs bounded batch comparison
7. Streaming task exports (CSV + NDJSON)
8. System observability endpoints (memory, worker stats, websocket stats)

## Start server

```bash
node server.js
```

## Optional live events terminal

```bash
node scripts/websocket-client.js
```

## Run full integrated demo

```bash
bash scripts/full-demo.sh
```

## Important integrated endpoints

- `GET /tasks`
- `POST /tasks`
- `PUT /tasks/:id`
- `DELETE /tasks/:id`
- `GET /tasks/next`
- `GET /tasks/resolve`
- `GET /tasks/:id/resolve`
- `GET /tasks/export.csv`
- `GET /tasks/stream.ndjson`
- `POST /tasks/reports/start?heavyIterations=...`
- `GET /tasks/reports/:jobId`
- `GET /tasks/reports/stats`
- `GET /tasks/reports/blocking?iterations=...`
- `GET /tasks/reports/worker-run?iterations=...`
- `GET /tasks/system/memory`
- `GET /tasks/system/ws`
- `POST /tasks/memory/leak?count=...&sizeKb=...`
- `POST /tasks/memory/safe?count=...&sizeKb=...`
- `POST /tasks/memory/clear`
- `WS /ws/tasks`

## Notes

- The script uses default tokens from `.env.example`.
- For a focused recursion-only walkthrough, run `bash scripts/dependency-resolver-demo.sh`.
- You can override values:

```bash
BASE_URL=http://localhost:3000 ADMIN_TOKEN=... USER_TOKEN=... ITERATIONS=500000000 bash scripts/full-demo.sh
```
