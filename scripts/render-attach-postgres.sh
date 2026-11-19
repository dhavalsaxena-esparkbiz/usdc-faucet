#!/usr/bin/env bash
# Attach a Render Postgres DB to the usdc-faucet web service.
# Prerequisites: RENDER_API_KEY in .env (create at https://dashboard.render.com/u/settings#api-keys)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck disable=SC1091
set -a && source "$ROOT/.env" && set +a

if [[ -z "${RENDER_API_KEY:-}" ]]; then
  echo "Add RENDER_API_KEY=... to .env (Render Dashboard → Account Settings → API Keys)"
  exit 1
fi

API="https://api.render.com/v1"
SERVICE_ID="${RENDER_SERVICE_ID:-srv-dbdio3on74is738uk200}"
DB_NAME="${RENDER_DB_NAME:-usdc-faucet-db}"
REGION="${RENDER_REGION:-singapore}"

auth=(-H "Authorization: Bearer ${RENDER_API_KEY}" -H "Accept: application/json" -H "Content-Type: application/json")

OWNER_ID="$(curl -sS "${auth[@]}" "$API/owners" | python3 -c "
import json,sys
d=json.load(sys.stdin)
print(d[0]['owner']['id'] if d else '')
")"

if [[ -z "$OWNER_ID" ]]; then
  echo "Could not read Render owner id — check RENDER_API_KEY"
  exit 1
fi

echo "Owner: $OWNER_ID"

# Create Postgres (idempotent: skip if name exists)
EXISTING_DB="$(curl -sS "${auth[@]}" "$API/postgres?limit=50" | python3 -c "
import json,sys,os
name=os.environ.get('DB_NAME','')
for item in json.load(sys.stdin):
  if item.get('postgres',{}).get('name')==name:
    print(item['postgres']['id'])
    break
" DB_NAME="$DB_NAME")"

if [[ -n "$EXISTING_DB" ]]; then
  echo "Postgres already exists: $EXISTING_DB"
  DB_ID="$EXISTING_DB"
else
  echo "Creating Postgres $DB_NAME ..."
  DB_ID="$(curl -sS -X POST "${auth[@]}" "$API/postgres" -d "{
    \"name\": \"$DB_NAME\",
    \"ownerId\": \"$OWNER_ID\",
    \"plan\": \"free\",
    \"region\": \"$REGION\",
    \"databaseName\": \"usdc_faucet\",
    \"databaseUser\": \"usdc_faucet\"
  }" | python3 -c "import json,sys; print(json.load(sys.stdin)['id'])")"
  echo "Created database id: $DB_ID"
  echo "Waiting for database to become available (up to ~3 min) ..."
  for _ in $(seq 1 36); do
  STATUS="$(curl -sS "${auth[@]}" "$API/postgres/$DB_ID" | python3 -c "import json,sys; print(json.load(sys.stdin).get('status',''))")"
    if [[ "$STATUS" == "available" ]]; then break; fi
    sleep 5
  done
fi

CONN="$(curl -sS "${auth[@]}" "$API/postgres/$DB_ID/connection" | python3 -c "
import json,sys
print(json.load(sys.stdin).get('connectionString',''))
")"

if [[ -z "$CONN" ]]; then
  echo "Database connection string not ready yet — wait and re-run this script"
  exit 1
fi

echo "Setting DATABASE_URL on service $SERVICE_ID ..."
curl -sS -X PUT "${auth[@]}" "$API/services/$SERVICE_ID/env-vars" -d "{
  \"envVars\": [
    { \"key\": \"DATABASE_URL\", \"value\": $(python3 -c "import json; print(json.dumps('$CONN'))") }
  ]
}" >/dev/null

echo "Triggering deploy ..."
curl -sS -X POST "${auth[@]}" "$API/services/$SERVICE_ID/deploys" -d '{}' >/dev/null

echo "Done. Postgres attached; deploy started."
echo "Check: https://dashboard.render.com"