#!/usr/bin/env node
// Remote mode: Streamable HTTP at POST /mcp, protected by a bearer token.
// Stateless — every request gets a fresh server instance, so nothing is kept
// between requests and the process can restart at any time.
//
// Env: MCP_TOKEN (required), PORT (default 8080), HOST (default 127.0.0.1),
//      ALLOWED_HOSTS (comma-separated Host headers, e.g. mcp.example.com,
//      needed when HOST is 0.0.0.0 — protects against DNS rebinding).

import { createHash, timingSafeEqual } from 'node:crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { buildServer } from './server.js';
import { createDeps } from './deps.js';

const { MCP_TOKEN, PORT = '8080', HOST = '127.0.0.1', ALLOWED_HOSTS } = process.env;
if (!MCP_TOKEN || MCP_TOKEN.length < 32) {
  console.error('Set MCP_TOKEN to a random string of at least 32 characters (e.g. `openssl rand -hex 32`).');
  process.exit(1);
}

// Compare digests so the check takes the same time whatever the input.
const digest = (value) => createHash('sha256').update(value).digest();
const expected = digest(`Bearer ${MCP_TOKEN}`);
const authorized = (header) => typeof header === 'string' && timingSafeEqual(digest(header), expected);

const deps = createDeps();
const app = createMcpExpressApp({
  host: HOST,
  ...(ALLOWED_HOSTS ? { allowedHosts: ALLOWED_HOSTS.split(',').map((h) => h.trim()) } : {}),
});

app.get('/health', (_req, res) => res.json({ ok: true }));

app.post('/mcp', async (req, res) => {
  if (!authorized(req.headers.authorization)) {
    return res.status(401).set('WWW-Authenticate', 'Bearer').json({
      jsonrpc: '2.0', error: { code: -32001, message: 'Unauthorized' }, id: null,
    });
  }
  const server = buildServer(deps);
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on('close', () => {
    transport.close();
    server.close();
  });
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('MCP request failed:', error);
    if (!res.headersSent) {
      res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal server error' }, id: null });
    }
  }
});

// Stateless server: no server-initiated streams or sessions to delete.
const methodNotAllowed = (_req, res) => res.status(405).json({
  jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed.' }, id: null,
});
app.get('/mcp', methodNotAllowed);
app.delete('/mcp', methodNotAllowed);

app.listen(Number(PORT), HOST, () => console.log(`Ardu MCP listening on http://${HOST}:${PORT}/mcp`));
