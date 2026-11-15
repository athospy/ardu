// Tool tests through a real MCP client over an in-memory transport.
// The database and the model are fakes, so no Postgres or Ollama is needed.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { buildServer, createQueue } from '../src/server.js';

function fakeDb() {
  const calls = { search: [], random: [], logged: [] };
  return {
    calls,
    searchQuotes: async (args) => { calls.search.push(args); return [{ text: 'Courage is grace under pressure.', author: 'Hemingway', category: 'courage', language: 'en' }]; },
    randomQuote: async (args) => { calls.random.push(args); return null; },
    libraryCounts: async () => [{ language: 'en', category: 'courage', count: 3 }],
    logGeneration: async (entry) => { calls.logged.push(entry); },
    generationStats: async () => [{ model: 'qwen2.5:1.5b', total: 2 }],
  };
}

const generated = {
  text: 'Every bug you fix pays rent on your new career.',
  attempts: 2, rejections: { overlap: 1, similarity: 0 }, durationMs: 2345, model: 'qwen2.5:1.5b', promptVersion: 'v1',
};

async function connect(deps) {
  const server = buildServer({ evalSummaryPath: '/nonexistent.json', generate: async () => generated, ...deps });
  const client = new Client({ name: 'test', version: '1.0.0' });
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverSide), client.connect(clientSide)]);
  return client;
}

const firstText = (result) => result.content[0].text;

test('lists the four tools, all marked read-only', async () => {
  const client = await connect({ db: fakeDb() });
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map((t) => t.name).sort(), ['generate_quote', 'get_stats', 'random_quote', 'search_quotes']);
  assert.ok(tools.every((t) => t.annotations.readOnlyHint === true));
});

test('generate_quote returns the quote and logs numbers only (never the text)', async () => {
  const db = fakeDb();
  const client = await connect({ db });
  const result = await client.callTool({ name: 'generate_quote', arguments: { motivation: 'learning to code' } });
  const body = JSON.parse(firstText(result));
  assert.equal(body.quote, generated.text);
  assert.equal(body.seconds, 2.3);
  assert.equal(db.calls.logged.length, 1);
  const logged = JSON.stringify(db.calls.logged[0]);
  assert.ok(!logged.includes('learning to code') && !logged.includes(generated.text));
  assert.equal(db.calls.logged[0].overlapRejections, 1);
});

test('generate_quote validates its input', async () => {
  const client = await connect({ db: fakeDb() });
  const tooShort = await client.callTool({ name: 'generate_quote', arguments: { motivation: 'x' } });
  assert.equal(tooShort.isError, true);
  const badLanguage = await client.callTool({ name: 'generate_quote', arguments: { motivation: 'running', language: 'fr' } });
  assert.equal(badLanguage.isError, true);
});

test('generate_quote reports model failures as tool errors and logs them', async () => {
  const db = fakeDb();
  const client = await connect({ db, generate: async () => { throw new Error('model not loaded'); } });
  const result = await client.callTool({ name: 'generate_quote', arguments: { motivation: 'running a marathon' } });
  assert.equal(result.isError, true);
  assert.match(firstText(result), /model not loaded/);
  assert.equal(db.calls.logged[0].ok, false);
});

test('search_quotes passes filters through and formats results', async () => {
  const db = fakeDb();
  const client = await connect({ db });
  const result = await client.callTool({ name: 'search_quotes', arguments: { query: 'courage', language: 'en' } });
  assert.deepEqual(db.calls.search[0], { query: 'courage', language: 'en', limit: 5 });
  assert.match(firstText(result), /Hemingway/);
});

test('random_quote says so when nothing matches', async () => {
  const client = await connect({ db: fakeDb() });
  const result = await client.callTool({ name: 'random_quote', arguments: { category: 'nope' } });
  assert.match(firstText(result), /No quote matches/);
});

test('get_stats combines library, generation and eval summary', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'ardu-'));
  const summaryPath = join(dir, 'summary.json');
  await writeFile(summaryPath, JSON.stringify({ runs: { a: { label: 'v1 · qwen2.5:1.5b', 'ollama:llama3:latest': { relevance: { mean: 2.123 }, total: { mean: 7.5 } } } } }));
  const client = await connect({ db: fakeDb(), evalSummaryPath: summaryPath });
  const stats = JSON.parse(firstText(await client.callTool({ name: 'get_stats', arguments: {} })));
  assert.equal(stats.library[0].count, 3);
  assert.equal(stats.generation[0].total, 2);
  assert.equal(stats.evals[0].scores['ollama:llama3:latest'].relevance, 2.12);
});

test('queue runs one task at a time and refuses when too many are waiting', async () => {
  const run = createQueue(2);
  let active = 0;
  let maxActive = 0;
  const task = async () => { active++; maxActive = Math.max(maxActive, active); await new Promise((r) => setTimeout(r, 10)); active--; };
  const first = run(task);
  const second = run(task);
  await assert.rejects(run(task), /busy/);
  await Promise.all([first, second]);
  assert.equal(maxActive, 1);
});
