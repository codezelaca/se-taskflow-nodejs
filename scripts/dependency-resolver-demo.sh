#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"

if [[ -f ".env" ]]; then
  # shellcheck disable=SC1091
  source .env
fi

ADMIN_TOKEN="${ADMIN_TOKEN:-secret-admin-123}"
USER_TOKEN="${USER_TOKEN:-secret-user-123}"

extract_id() {
  node -e 'let b="";process.stdin.on("data",c=>b+=c);process.stdin.on("end",()=>{const p=JSON.parse(b);if(!p.id){process.exit(1)};console.log(p.id);});'
}

echo "[1/6] Creating a dependency chain A -> B -> C"
TASK_A_ID=$(curl -sS -X POST "$BASE_URL/tasks" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Resolver Demo A","priority":8}' | extract_id)

TASK_B_ID=$(curl -sS -X POST "$BASE_URL/tasks" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Resolver Demo B\",\"priority\":6,\"dependencies\":[\"$TASK_A_ID\"]}" | extract_id)

TASK_C_ID=$(curl -sS -X POST "$BASE_URL/tasks" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Resolver Demo C\",\"priority\":4,\"dependencies\":[\"$TASK_B_ID\"]}" | extract_id)

echo "A=$TASK_A_ID"
echo "B=$TASK_B_ID"
echo "C=$TASK_C_ID"

echo
echo "[2/6] Resolve full task graph order"
curl -sS -H "Authorization: Bearer $USER_TOKEN" "$BASE_URL/tasks/resolve"

echo
echo "[3/6] Resolve scoped order for task C"
curl -sS -H "Authorization: Bearer $USER_TOKEN" "$BASE_URL/tasks/$TASK_C_ID/resolve"

echo
echo "[4/6] Introduce a cycle by making A depend on C"
curl -sS -X PUT "$BASE_URL/tasks/$TASK_A_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"dependencies\":[\"$TASK_C_ID\"]}" > /dev/null

echo
echo "[5/6] Resolve task C again (should return 409 conflict)"
curl -sS -i -H "Authorization: Bearer $USER_TOKEN" "$BASE_URL/tasks/$TASK_C_ID/resolve"

echo
echo "[6/6] Demo complete"
