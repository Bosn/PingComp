#!/usr/bin/env bash
set -euo pipefail

BASE_URL=${BASE_URL:-http://127.0.0.1:3788}

echo "== PingComp Interviews smoke =="

echo "[1] health"
curl -fsS "$BASE_URL/api/health" | cat

echo

echo "[2] list interviews (may be empty)"
curl -fsS "$BASE_URL/api/interviews?limit=3" | cat

echo

echo "[3] batch export (may error if unauth or >500)"
# This is a GET that returns md or JSON error; do not fail the script.
curl -sS -D - "$BASE_URL/interviews/export.md" -o /dev/null | sed -n '1,20p'

echo "== done =="
