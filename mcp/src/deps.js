// Wires the MCP server to the real database and the backend's generator.

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createDb } from './db.js';

const require = createRequire(import.meta.url);
const logger = require('../../backend/src/utils/logger');
const { generateQuoteMultiStep } = require('../../backend/src/config/ollama');

// The backend logs to stdout outside production; in stdio mode stdout is the
// MCP channel, so the generator must stay quiet.
logger.silent = true;

export function createDeps() {
  const model = process.env.OLLAMA_MODEL || 'qwen2.5:1.5b';
  return {
    db: createDb(),
    generate: (motivation, language) => generateQuoteMultiStep(motivation, language, [], { model }),
    evalSummaryPath: process.env.EVAL_SUMMARY_PATH
      || fileURLToPath(new URL('../../evals/results/summary.json', import.meta.url)),
  };
}
