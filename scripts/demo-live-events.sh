#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
ADMIN_TOKEN="${ADMIN_TOKEN:-secret-admin-123}"

echo "Creating a task event sequence for WebSocket observers..."

TASK_ID=$(curl -s -X POST "$BASE_URL/tasks" \
  -H "Authorization: $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Live Event Task","description":"watch websocket output","priority":7}' | jq -r '.id')

echo "Created task: $TASK_ID"
sleep 0.5

curl -s -X PUT "$BASE_URL/tasks/$TASK_ID" \
  -H "Authorization: $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"in-progress"}' | jq . >/dev/null

echo "Updated task: $TASK_ID"
sleep 0.5

curl -s -X DELETE "$BASE_URL/tasks/$TASK_ID" \
  -H "Authorization: $ADMIN_TOKEN" >/dev/null

echo "Deleted task: $TASK_ID"
echo "Live event sequence complete."
