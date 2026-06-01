#!/usr/bin/env bash
set -euo pipefail

echo "Waiting for database (migrations)..."

max_attempts=12
attempt=1

while [ "$attempt" -le "$max_attempts" ]; do
  if npx prisma migrate deploy; then
    echo "Migrations applied."
    break
  fi

  if [ "$attempt" -eq "$max_attempts" ]; then
    echo "Database still unreachable after ${max_attempts} attempts."
    echo "Check DATABASE_URL on Render (use External URL + ?sslmode=require if Internal fails)."
    exit 1
  fi

  echo "Attempt ${attempt}/${max_attempts} failed — retrying in 5s (DB may be waking up)..."
  sleep 5
  attempt=$((attempt + 1))
done

exec node dist/server.js
