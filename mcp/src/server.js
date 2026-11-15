// The Ardu MCP server: four tools over the public quote library and the
// self-hosted quote generator. Transport-agnostic: stdio.js and http.js
// connect it to a transport.

import { readFile } from 'node:fs/promises';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod/v4';

const LANGUAGES = ['en', 'es'];

// Small CPU-only models handle one generation at a time. Requests wait in
// line; past MAX_WAITING the server says "busy" instead of piling up work.
export function createQueue(maxWaiting = 3) {
  let tail = Promise.resolve();
  let waiting = 0;
  return async function run(task) {
    if (waiting >= maxWaiting) throw new Error('The generator is busy. Try again in a minute.');
    waiting++;
    const result = tail.then(task, task);
    tail = result.catch(() => {});
    try {
      return await result;
    } finally {
      waiting--;
    }
  };
}

const text = (value) => ({ content: [{ type: 'text', text: value }] });
const json = (value) => text(JSON.stringify(value, null, 2));
const formatQuote = (q) => `"${q.text}"${q.author ? ` — ${q.author}` : ''} [${q.category ?? 'uncategorized'}, ${q.language}]`;

/**
 * @param deps.db          object from createDb() (or a fake in tests)
 * @param deps.generate    (motivation, language) => generateQuoteMultiStep result
 * @param deps.evalSummaryPath  path to evals/results/summary.json
 */
export function buildServer({ db, generate, evalSummaryPath }) {
  const server = new McpServer({ name: 'ardu', version: '1.0.0' });
  const queue = createQueue();

  server.registerTool('generate_quote', {
    title: 'Generate a motivational quote',
    description:
      'Writes one short motivational quote about the given motivation, using Ardu\'s self-hosted small '
      + 'language model and the same prompt and similarity gates as the production app. Takes a few seconds. '
      + 'Nothing is saved: the motivation and the quote are not stored.',
    inputSchema: {
      motivation: z.string().trim().min(3).max(300)
        .describe('What the person is working toward, e.g. "learning to code and switching careers"'),
      language: z.enum(LANGUAGES).default('en').describe('Language of the quote'),
    },
    annotations: { readOnlyHint: true, idempotentHint: false, openWorldHint: false },
  }, async ({ motivation, language }) => {
    let result;
    try {
      result = await queue(() => generate(motivation, language));
    } catch (error) {
      await db.logGeneration({ model: 'unknown', promptVersion: 'unknown', language, ok: false }).catch(() => {});
      return { ...text(`Generation failed: ${error.message}`), isError: true };
    }
    await db.logGeneration({
      model: result.model,
      promptVersion: result.promptVersion,
      language,
      ok: true,
      durationMs: result.durationMs,
      attempts: result.attempts,
      overlapRejections: result.rejections.overlap,
      similarityRejections: result.rejections.similarity,
    }).catch(() => {}); // stats are best-effort; never fail the user's request over them
    return json({
      quote: result.text,
      model: result.model,
      prompt_version: result.promptVersion,
      drafts: result.attempts,
      rejected_drafts: result.rejections,
      seconds: Math.round(result.durationMs / 100) / 10,
    });
  });

  server.registerTool('search_quotes', {
    title: 'Search the quote library',
    description: 'Finds quotes in Ardu\'s curated library whose text, author or category contains the query.',
    inputSchema: {
      query: z.string().trim().min(1).max(100).describe('Word or phrase, e.g. "courage" or "Churchill"'),
      language: z.enum(LANGUAGES).optional(),
      limit: z.number().int().min(1).max(20).default(5),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async ({ query, language, limit }) => {
    const quotes = await db.searchQuotes({ query, language, limit });
    return text(quotes.length ? quotes.map(formatQuote).join('\n') : `No quotes match "${query}".`);
  });

  server.registerTool('random_quote', {
    title: 'Random quote',
    description: 'Returns one random quote from Ardu\'s curated library, optionally by language or category.',
    inputSchema: {
      language: z.enum(LANGUAGES).optional(),
      category: z.string().trim().max(50).optional().describe('e.g. "success", "courage", "growth"'),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async ({ language, category }) => {
    const quote = await db.randomQuote({ language, category });
    return text(quote ? formatQuote(quote) : 'No quote matches those filters.');
  });

  server.registerTool('get_stats', {
    title: 'Ardu stats',
    description:
      'Quote library size by language and category, how the demo generator has performed '
      + '(volume, latency, how often each similarity gate forced a retry), and the latest offline eval scores.',
    inputSchema: {},
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async () => {
    const [library, generation, evals] = await Promise.all([
      db.libraryCounts(),
      db.generationStats(),
      readFile(evalSummaryPath, 'utf8').then(summarizeEvals).catch(() => 'No eval results found.'),
    ]);
    return json({ library, generation, evals });
  });

  return server;
}

// Keep get_stats small: mean per dimension for each run, per judge.
function summarizeEvals(raw) {
  const { runs } = JSON.parse(raw);
  return Object.values(runs).map(({ label, ...judges }) => ({
    run: label,
    scores: Object.fromEntries(Object.entries(judges).map(([judge, s]) => [judge, {
      relevance: round(s.relevance?.mean),
      originality: round(s.originality?.mean),
      inspiration: round(s.inspiration?.mean),
      clarity: round(s.clarity?.mean),
      total_of_12: round(s.total?.mean),
    }])),
  }));
}

const round = (n) => (typeof n === 'number' ? Math.round(n * 100) / 100 : null);
