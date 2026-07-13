# Run the native Crawl4AI MCP server

This repository maintains a pinned, locally verified distribution of [Crawl4AI 0.9.1](https://github.com/unclecode/crawl4ai/blob/v0.9.1/docs/blog/release-v0.9.1.md). It runs the upstream container and its native Model Context Protocol (MCP) server. It is not a custom MCP implementation.

## Start the service

The local distribution requires Docker with Compose and an API token. Generate a token for the current shell, then start the pinned image:

```bash
export CRAWL4AI_API_TOKEN="$(openssl rand -hex 32)"
docker compose up -d --wait
```

The service listens on `http://127.0.0.1:11235`. Set `CRAWL4AI_PORT` before startup to choose another loopback port.

## Verify the distribution

The smoke check starts an isolated stack, checks public health, verifies that unauthenticated MCP access fails, verifies authenticated schema access, and removes the stack. Run it while the regular stack is stopped:

```bash
export CRAWL4AI_API_TOKEN="$(openssl rand -hex 32)"
./scripts/smoke.sh
```

Use these requests to verify a regular running stack:

```bash
base_url="http://127.0.0.1:${CRAWL4AI_PORT:-11235}"
curl --fail --silent --show-error "${base_url}/health"
curl --fail --silent --show-error \
  --header "Authorization: Bearer ${CRAWL4AI_API_TOKEN}" \
  "${base_url}/mcp/schema"
```

Run the static Compose validation without starting the service:

```bash
./scripts/validate.sh
```

## Connect an MCP client

Crawl4AI exposes these upstream-native endpoints:

- **Server-Sent Events (SSE)**: `http://127.0.0.1:11235/mcp/sse`
- **WebSocket**: `ws://127.0.0.1:11235/mcp/ws`
- **Tool schema**: `http://127.0.0.1:11235/mcp/schema`

Send `Authorization: Bearer ${CRAWL4AI_API_TOKEN}` on every request except `GET /health`. The [Crawl4AI 0.9 migration guide](https://github.com/unclecode/crawl4ai/blob/v0.9.1/deploy/docker/MIGRATION.md) defines this authentication contract, and the [upstream self-hosting guide](https://docs.crawl4ai.com/core/self-hosting/) documents the MCP endpoints and tools.

Crawl4AI 0.9.1 supports legacy HTTP with SSE and a custom WebSocket transport. It does not expose the single-endpoint Streamable HTTP transport defined by the [current MCP transport specification](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports). Use a client with legacy SSE or WebSocket support.

For example, add the local SSE endpoint to Claude Code with the token kept in the current shell:

```bash
claude mcp add --transport sse \
  --header "Authorization: Bearer ${CRAWL4AI_API_TOKEN}" \
  crawl4ai http://127.0.0.1:11235/mcp/sse
```

### Claude Desktop limitation

This loopback-only distribution does not provide a Claude Desktop custom connector. Anthropic's [custom connectors run from Anthropic's cloud](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp), so they cannot reach `127.0.0.1`; this repository also does not ship a local stdio bridge or desktop extension. Use Claude Code or another local client that supports authenticated legacy SSE. A separately reviewed remote boundary is tracked in [issue #25](https://github.com/BjornMelin/crawl4ai-mcp-server/issues/25).

## Stop the service

Stop and remove the regular Compose stack:

```bash
docker compose down
```

## Supported maintenance scope

This repository keeps a known upstream release reproducible through a pinned image, loopback-only Compose defaults, dependency update automation, and executable validation. It does not fork Crawl4AI, add custom tools, or maintain the retired TypeScript and Cloudflare Workers product.

Trusted remote authentication and deployment remain deferred to [issue #25](https://github.com/BjornMelin/crawl4ai-mcp-server/issues/25). They require an owned target environment, credential policy, TLS termination, and deployment-specific validation before implementation.

## Update the pinned version

Use this procedure for each upstream release:

1. Read the [upstream release notes](https://github.com/unclecode/crawl4ai/tree/main/docs/blog) and Docker migration guidance.
2. Update the complete `unclecode/crawl4ai:<tag>@sha256:<digest>` reference in `compose.yaml`, preferably through Dependabot.
3. Run `./scripts/validate.sh`.
4. Export a fresh `CRAWL4AI_API_TOKEN` and run `./scripts/smoke.sh`.
5. Update the version references in this README.

Do not move the pin until the image pull and both checks pass.

## Ownership and license

[Crawl4AI](https://github.com/unclecode/crawl4ai), its container image, and its MCP implementation belong to the upstream project. Report upstream runtime or tool behavior there. This repository owns only its distribution configuration and validation.

Repository-maintained files use the [MIT License](LICENSE). The packaged upstream project retains its [Apache 2.0 license and attribution terms](https://github.com/unclecode/crawl4ai/blob/v0.9.1/LICENSE).
