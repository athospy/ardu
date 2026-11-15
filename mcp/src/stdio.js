#!/usr/bin/env node
// Local mode: Claude Desktop / Claude Code start this process and talk to it
// over stdin/stdout. No token needed — only the local user can reach it.

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { buildServer } from './server.js';
import { createDeps } from './deps.js';

// stdout carries the protocol; anything else printed there would corrupt it.
console.log = console.error;

const server = buildServer(createDeps());
await server.connect(new StdioServerTransport());
