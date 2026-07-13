#!/usr/bin/env bash
set -Eeuo pipefail

image="$(CRAWL4AI_API_TOKEN=validation-only-token docker compose --env-file /dev/null config --images)"
if [[ "${image}" != unclecode/crawl4ai:*@sha256:* || "${image}" == *:latest* ]]; then
  echo "compose.yaml must pin a versioned unclecode/crawl4ai image and digest" >&2
  exit 1
fi

if env -u CRAWL4AI_API_TOKEN docker compose --env-file /dev/null config --quiet 2>/dev/null; then
  echo "compose.yaml must require CRAWL4AI_API_TOKEN" >&2
  exit 1
fi
