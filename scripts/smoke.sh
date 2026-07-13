#!/usr/bin/env bash
set -Eeuo pipefail

: "${CRAWL4AI_API_TOKEN:?Set CRAWL4AI_API_TOKEN}"

export COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-crawl4ai-native-smoke}"
base_url="http://127.0.0.1:${CRAWL4AI_PORT:-11235}"

cleanup() {
  docker compose down --remove-orphans >/dev/null
}
trap cleanup EXIT INT TERM

docker compose up --detach --wait --wait-timeout 180

curl --fail --silent --show-error "${base_url}/health" >/dev/null

status="$(curl --silent --output /dev/null --write-out '%{http_code}' "${base_url}/mcp/schema")"
if [[ "${status}" != 401 ]]; then
  echo "expected unauthenticated /mcp/schema to return 401, got ${status}" >&2
  exit 1
fi

schema_file="$(mktemp)"
markdown_file="$(mktemp)"
trap 'rm -f "${schema_file}" "${markdown_file}"; cleanup' EXIT INT TERM

curl --fail --silent --show-error \
  --header "Authorization: Bearer ${CRAWL4AI_API_TOKEN}" \
  "${base_url}/mcp/schema" >"${schema_file}"

python3 - "${schema_file}" <<'PY'
import json
import sys

with open(sys.argv[1], encoding="utf-8") as handle:
    payload = json.load(handle)

actual = {tool["name"] for tool in payload.get("tools", [])}
if "md" not in actual:
    raise SystemExit("native MCP schema is missing the md tool")
PY

curl --fail --silent --show-error \
  --header "Authorization: Bearer ${CRAWL4AI_API_TOKEN}" \
  --header "Content-Type: application/json" \
  --data '{"url":"https://example.com","f":"raw"}' \
  "${base_url}/md" >"${markdown_file}"

python3 - "${markdown_file}" <<'PY'
import json
import sys

with open(sys.argv[1], encoding="utf-8") as handle:
    payload = json.load(handle)

if payload.get("success") is not True or "Example Domain" not in payload.get("markdown", ""):
    raise SystemExit("authenticated /md crawl did not return the expected content")
PY

set +e
sse_output="$(
  curl --silent --show-error --no-buffer --max-time 2 \
    --header "Authorization: Bearer ${CRAWL4AI_API_TOKEN}" \
    "${base_url}/mcp/sse" 2>/dev/null
)"
sse_rc=$?
set -e

if [[ "${sse_rc}" -ne 0 && "${sse_rc}" -ne 28 ]]; then
  echo "authenticated MCP SSE handshake failed with curl status ${sse_rc}" >&2
  exit 1
fi
if [[ "${sse_output}" != *"event: endpoint"* || "${sse_output}" != *"/mcp/messages/?session_id="* ]]; then
  echo "authenticated MCP SSE handshake returned an unexpected response" >&2
  exit 1
fi

echo "Crawl4AI health, authentication, browser crawl, tool inventory, and MCP SSE checks passed."
