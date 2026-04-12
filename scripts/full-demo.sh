#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
ADMIN_TOKEN="${ADMIN_TOKEN:-secret-admin-123}"
USER_TOKEN="${USER_TOKEN:-secret-user-123}"
ITERATIONS="${ITERATIONS:-350000000}"

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

require_cmd curl
require_cmd jq

echo "============================================================"
echo "TaskFlow Full Integrated Demo"
echo "============================================================"
echo "BASE_URL=$BASE_URL"
echo ""

echo "[1/8] Health + system stats"
curl -s "$BASE_URL/health" | jq .
curl -s -H "Authorization: $USER_TOKEN" "$BASE_URL/tasks/system/memory" | jq .
curl -s -H "Authorization: $USER_TOKEN" "$BASE_URL/tasks/system/ws" | jq .
echo ""

echo "[2/8] Create task board data"
TASK_1=$(curl -s -X POST "$BASE_URL/tasks" \
  -H "Authorization: $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Demo Task Alpha","description":"Full demo task","priority":9}' | jq -r '.id')

TASK_2=$(curl -s -X POST "$BASE_URL/tasks" \
  -H "Authorization: $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Demo Task Beta\",\"description\":\"Depends on alpha\",\"priority\":6,\"dependencies\":[\"$TASK_1\"]}" | jq -r '.id')

echo "Created TASK_1=$TASK_1"
echo "Created TASK_2=$TASK_2"
curl -s -H "Authorization: $USER_TOKEN" "$BASE_URL/tasks/next" | jq .
echo ""

echo "[3/8] Trigger websocket-visible updates"
curl -s -X PUT "$BASE_URL/tasks/$TASK_2" \
  -H "Authorization: $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"in-progress"}' | jq . >/dev/null
curl -s -X DELETE "$BASE_URL/tasks/$TASK_1" \
  -H "Authorization: $ADMIN_TOKEN" >/dev/null

echo "Updated TASK_2 and deleted TASK_1"
echo ""

echo "[4/8] Worker report (async job lifecycle)"
REPORT_JOB_ID=$(curl -s -X POST "$BASE_URL/tasks/reports/start?heavyIterations=30000000" \
  -H "Authorization: $ADMIN_TOKEN" | jq -r '.jobId')

echo "Report job id: $REPORT_JOB_ID"
for _ in 1 2 3 4 5; do
  STATUS=$(curl -s -H "Authorization: $USER_TOKEN" "$BASE_URL/tasks/reports/$REPORT_JOB_ID" | jq -r '.status')
  echo "Report status: $STATUS"
  [[ "$STATUS" == "completed" ]] && break
  sleep 0.5
done
curl -s -H "Authorization: $USER_TOKEN" "$BASE_URL/tasks/reports/$REPORT_JOB_ID" | jq .
echo ""

echo "[5/8] CPU comparison (main-thread vs worker-thread)"

echo "Running blocking report endpoint in background..."
curl -s "$BASE_URL/tasks/reports/blocking?iterations=$ITERATIONS" \
  -H "Authorization: $USER_TOKEN" > /tmp/taskflow_blocking.json &
BLOCK_PID=$!
BLOCK_PING_TIME=$(curl -s -o /dev/null -w '%{time_total}' "$BASE_URL/health")
wait "$BLOCK_PID"

echo "Running worker report endpoint in background..."
curl -s "$BASE_URL/tasks/reports/worker-run?iterations=$ITERATIONS" \
  -H "Authorization: $USER_TOKEN" > /tmp/taskflow_worker.json &
WORKER_PID=$!
WORKER_PING_TIME=$(curl -s -o /dev/null -w '%{time_total}' "$BASE_URL/health")
wait "$WORKER_PID"

echo "Blocking ping latency (seconds): $BLOCK_PING_TIME"
echo "Worker ping latency (seconds):   $WORKER_PING_TIME"
cat /tmp/taskflow_blocking.json | jq .
cat /tmp/taskflow_worker.json | jq .
echo ""

echo "[6/8] Memory comparison (leak-like vs bounded cache)"
MEM_BEFORE=$(curl -s -H "Authorization: $USER_TOKEN" "$BASE_URL/tasks/system/memory" | jq '.memory.heapUsed')

curl -s -X POST "$BASE_URL/tasks/memory/leak?count=800&sizeKb=32" \
  -H "Authorization: $ADMIN_TOKEN" | jq '.intentionalLeakCacheSize, .memory.heapUsed'

curl -s -X POST "$BASE_URL/tasks/memory/safe?count=800&sizeKb=32" \
  -H "Authorization: $ADMIN_TOKEN" | jq '.safeCacheSize, .memory.heapUsed'

MEM_AFTER=$(curl -s -H "Authorization: $USER_TOKEN" "$BASE_URL/tasks/system/memory" | jq '.memory.heapUsed')

echo "Heap before: $MEM_BEFORE"
echo "Heap after:  $MEM_AFTER"

curl -s -X POST "$BASE_URL/tasks/memory/clear" \
  -H "Authorization: $ADMIN_TOKEN" | jq '.mode, .safeCacheSize, .intentionalLeakCacheSize'
echo ""

echo "[7/8] Streaming exports (real task board data)"
curl -s -H "Authorization: $USER_TOKEN" "$BASE_URL/tasks/export.csv" > /tmp/taskflow-export.csv
curl -s -H "Authorization: $USER_TOKEN" "$BASE_URL/tasks/stream.ndjson" > /tmp/taskflow-export.ndjson

echo "CSV rows:" $(wc -l < /tmp/taskflow-export.csv)
echo "NDJSON rows:" $(wc -l < /tmp/taskflow-export.ndjson)
head -n 3 /tmp/taskflow-export.csv
head -n 2 /tmp/taskflow-export.ndjson
echo ""

echo "[8/8] Final system snapshots"
curl -s -H "Authorization: $USER_TOKEN" "$BASE_URL/tasks/system/memory" | jq .
curl -s -H "Authorization: $USER_TOKEN" "$BASE_URL/tasks/reports/stats" | jq .
curl -s -H "Authorization: $USER_TOKEN" "$BASE_URL/tasks/system/ws" | jq .

echo ""
echo "Demo complete."
echo "Tip: run 'node scripts/websocket-client.js' in another terminal before step 2 to watch live task events."
