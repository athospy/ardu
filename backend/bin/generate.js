#!/usr/bin/env node
/**
 * Quote generation CLI — the bridge between the Python eval harness and the
 * production generator. It runs the exact same code path the app uses
 * (generateQuoteMultiStep: prompt + two similarity gates).
 *
 * Input:  JSON Lines on stdin, one request per line:
 *           {"id": "en-01", "motivation": "...", "language": "en"}
 * Output: JSON Lines on stdout, one result per line:
 *           {"id": "en-01", "text": "...", "attempts": 1, "rejections": {...},
 *            "durationMs": 2310, "model": "qwen2.5:1.5b", "promptVersion": "v1"}
 *         or {"id": "en-01", "error": "..."} if generation failed.
 *
 * Usage:
 *   echo '{"id":"x","motivation":"learning to code","language":"en"}' \
 *     | node bin/generate.js --prompt v1 --model qwen2.5:1.5b [--template-gate on]
 */

require('dotenv').config();
const readline = require('readline');
const logger = require('../src/utils/logger');
const { generateQuoteMultiStep } = require('../src/config/ollama');
const { CURRENT_VERSION } = require('../src/prompts/quote');

// stdout carries the JSON results, so the app's logger must stay quiet.
logger.silent = true;

function parseArgs(argv) {
  const args = { prompt: CURRENT_VERSION, model: process.env.OLLAMA_MODEL || 'qwen2.5:1.5b', 'template-gate': 'off' };
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i].replace(/^--/, '');
    if (!(key in args) || argv[i + 1] === undefined) {
      throw new Error(`Usage: generate.js [--prompt v0|v1] [--model <ollama model>] [--template-gate on|off] (got "${argv[i]}")`);
    }
    args[key] = argv[i + 1];
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { prompt, model } = args;
  const templateGate = args['template-gate'] === 'on';
  const lines = readline.createInterface({ input: process.stdin });

  // One request at a time: a small model on a laptop or VPS is the bottleneck.
  for await (const line of lines) {
    if (!line.trim()) continue;
    const request = JSON.parse(line);
    try {
      const result = await generateQuoteMultiStep(request.motivation, request.language, [], {
        promptVersion: prompt,
        model,
        templateGate,
      });
      process.stdout.write(JSON.stringify({ id: request.id, ...result }) + '\n');
    } catch (error) {
      process.stdout.write(JSON.stringify({ id: request.id, error: error.message }) + '\n');
    }
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
