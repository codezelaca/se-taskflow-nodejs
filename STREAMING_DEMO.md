# Streaming Endpoints Demo

## What was implemented

- `GET /tasks/export.csv`
- `GET /tasks/stream.ndjson`
- `GET /demo/stream/csv?count=<n>`
- `GET /demo/stream/ndjson?count=<n>`

These endpoints use stream-based response writing via pipeline, so data is sent in chunks instead of building a huge in-memory string first.

## Best practices applied

- Streamed responses with `Readable` + `pipeline`.
- CSV escaping for quotes/commas/newlines.
- NDJSON for line-by-line incremental consumption.
- Request ID propagated in stream response header (`X-Request-Id`).
- Client-disconnect detection and safe stream cancellation.
- Cache disabled for export responses (`Cache-Control: no-store`).
- Bound synthetic stream size with a configurable max (`MAX_STREAM_DEMO_COUNT`).

## Auth-protected task streams

These use your existing middleware chain (`/tasks/*`), so include auth headers.

### 1) Export current tasks as CSV

```bash
curl -s -H 'Authorization: secret-user-123' 'http://localhost:3000/tasks/export.csv' | head -n 10
```

### 2) Stream current tasks as NDJSON

```bash
curl -s -H 'Authorization: secret-user-123' 'http://localhost:3000/tasks/stream.ndjson' | head -n 10
```

## Synthetic large-stream demos (no auth required)

Useful for demonstrating large safe streaming without preloading payloads.

### 3) Demo CSV stream with 100,000 rows

```bash
curl -s 'http://localhost:3000/demo/stream/csv?count=100000' > /tmp/demo-stream-100k.csv
wc -l /tmp/demo-stream-100k.csv
```

### 4) Demo NDJSON stream with 100,000 rows

```bash
curl -s 'http://localhost:3000/demo/stream/ndjson?count=100000' > /tmp/demo-stream-100k.ndjson
wc -l /tmp/demo-stream-100k.ndjson
```

## Show streaming responsiveness while exporting

Run a large stream and ping health in parallel.

```bash
curl -s 'http://localhost:3000/demo/stream/csv?count=200000' > /tmp/large-stream.csv &
/usr/bin/time -p curl -s 'http://localhost:3000/health' | jq .
wait
```

## Quick setup data (optional)

If you want task exports to contain realistic rows first:

```bash
curl -s -X POST http://localhost:3000/tasks \
  -H 'Content-Type: application/json' \
  -H 'Authorization: secret-admin-123' \
  -d '{"title":"Stream Task A","description":"for csv export","priority":3}' | jq .id

curl -s -X POST http://localhost:3000/tasks \
  -H 'Content-Type: application/json' \
  -H 'Authorization: secret-admin-123' \
  -d '{"title":"Stream Task B","description":"for ndjson export","priority":5}' | jq .id
```

## Classroom demo sequence

1. Show `/tasks` JSON response (baseline).
2. Show `/tasks/export.csv` for file-style stream export.
3. Show `/tasks/stream.ndjson` for API consumer streaming.
4. Show `/demo/stream/csv?count=200000` to prove large-volume streaming.
5. In parallel, call `/health` to show server remains responsive.
