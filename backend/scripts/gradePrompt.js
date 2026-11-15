/**
 * gradePrompt.js
 *
 * Offline evaluation tool for the quote generation prompt.
 * Does not touch the database — runs against local Ollama only.
 *
 * Generator model : qwen2.5:1.5b  (same as VPS, keeps results comparable)
 * Grader model    : llama3.2:3b-instruct-q4_K_M (instruction-tuned, better at rubrics)
 *
 * Usage:
 *   node scripts/gradePrompt.js
 *   GENERATOR_MODEL=qwen2.5:1.5b GRADER_MODEL=llama3:latest node scripts/gradePrompt.js
 */

require('dotenv').config();
const { Ollama } = require('ollama');
const { generateQuoteMultiStep } = require('../src/config/ollama');

function normalize(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

function lexicalOverlap(a, b) {
  const A = new Set(normalize(a).split(' '));
  const B = new Set(normalize(b).split(' '));
  return [...A].filter(x => B.has(x)).length / Math.max(A.size, 1);
}

const GENERATOR_MODEL = process.env.GENERATOR_MODEL || 'qwen2.5:1.5b';
// llama3:latest (8B) gives more differentiated scores than the 3B instruction model
const GRADER_MODEL    = process.env.GRADER_MODEL    || 'llama3:latest';
const OLLAMA_HOST     = process.env.OLLAMA_HOST     || 'http://localhost:11434';

const graderClient = new Ollama({ host: OLLAMA_HOST, timeout: 60000 });

// ── Test motivations ────────────────────────────────────────────────────────

const TEST_CASES = [
  // English
  { motivation: 'losing weight and building a healthier lifestyle', language: 'en' },
  { motivation: 'learning to code and switching careers into tech', language: 'en' },
  { motivation: 'overcoming fear of failure and taking more risks', language: 'en' },
  { motivation: 'building my own business and becoming financially free', language: 'en' },
  { motivation: 'improving relationships and becoming a better partner', language: 'en' },
  // Spanish
  { motivation: 'superar la ansiedad y vivir con más calma', language: 'es' },
  { motivation: 'aprender un nuevo idioma y viajar por el mundo', language: 'es' },
  { motivation: 'ser más disciplinado y cumplir mis metas diarias', language: 'es' },
];

// ── Validator (rule-based) ───────────────────────────────────────────────────

const JSON_ARTIFACT_REGEX = /[{}\[\]]|"text"\s*:|"category"\s*:|"author"\s*:/i;

function validate(text, motivation) {
  const issues = [];

  if (!text || !text.trim()) {
    issues.push('EMPTY');
    return { pass: false, issues };
  }

  if (text.length > 200) {
    issues.push(`TOO_LONG (${text.length} chars)`);
  }

  if (JSON_ARTIFACT_REGEX.test(text)) {
    issues.push('JSON_LEAKAGE');
  }

  const overlap = lexicalOverlap(text, motivation);
  if (overlap > 0.30) {
    issues.push(`HIGH_PROMPT_OVERLAP (${(overlap * 100).toFixed(0)}%)`);
  }

  return { pass: issues.length === 0, issues, overlap };
}

// ── Grader (LLM-as-judge) ───────────────────────────────────────────────────

const GRADING_PROMPT = (motivation, quote, language) => `You are a strict quality evaluator for motivational quotes. Be critical and differentiate scores — do not give 2 to everything.

MOTIVATION: "${motivation}"
LANGUAGE: ${language}
QUOTE: "${quote}"

Score each dimension from 1 to 3:
- relevance: 1=no connection to motivation, 2=loosely related, 3=directly addresses motivation
- originality: 1=generic cliché ("one step at a time", "believe in yourself"), 2=somewhat fresh, 3=distinctive phrasing
- inspiration: 1=flat or empty, 2=mildly motivating, 3=genuinely energizing
- clarity: 1=confusing or awkward wording, 2=acceptable, 3=crisp and impactful

Return ONLY this JSON with no extra text:
{"relevance":0,"originality":0,"inspiration":0,"clarity":0,"reason":"REPLACE WITH one critical sentence explaining the main strength or weakness"}`;

async function grade(motivation, quote, language) {
  const prompt = GRADING_PROMPT(motivation, quote, language);

  const response = await graderClient.generate({
    model: GRADER_MODEL,
    prompt,
    stream: false,
    options: {
      temperature: 0.1,  // Low temp → deterministic scoring
      num_predict: 300,
    },
  });

  let raw = response.response.trim();

  // Strip markdown code fences if model added them
  raw = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  // Walk the string brace-by-brace to extract the first complete JSON object.
  // If the object is incomplete (truncated response), capture from { to end and repair.
  let jsonStr = null;
  let depth = 0;
  let start = -1;
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === '{') { if (start === -1) start = i; depth++; }
    else if (raw[i] === '}') { depth--; if (depth === 0 && start !== -1) { jsonStr = raw.slice(start, i + 1); break; } }
  }

  if (!jsonStr && start !== -1) {
    // Truncated JSON — close the open string value then close the object
    let partial = raw.slice(start).replace(/"[^"]*$/, '""');
    jsonStr = partial + '}';
  }

  if (!jsonStr) {
    return { relevance: 0, originality: 0, inspiration: 0, clarity: 0, total: 0, reason: '', error: `No JSON found in: ${raw.slice(0, 80)}` };
  }

  // Pass 1: clean JSON parse
  try {
    const parsed = JSON.parse(jsonStr);
    const { relevance = 0, originality = 0, inspiration = 0, clarity = 0, reason = '' } = parsed;
    const total = relevance + originality + inspiration + clarity;
    return { relevance, originality, inspiration, clarity, total, reason, error: null };
  } catch { /* fall through to regex extraction */ }

  // Pass 2: regex fallback — the grader likely put a raw newline inside a string value.
  // Numeric scores are always clean; extract them directly from the raw response.
  const pick = (key) => parseInt(raw.match(new RegExp(`"${key}"\\s*:\\s*(\\d)`))?.[1]) || 0;
  const relevance   = pick('relevance');
  const originality = pick('originality');
  const inspiration = pick('inspiration');
  const clarity     = pick('clarity');
  const reasonMatch = raw.match(/"reason"\s*:\s*"([^"]+)"/);
  const reason      = reasonMatch ? reasonMatch[1] : '';
  const total       = relevance + originality + inspiration + clarity;

  if (total === 0) {
    return { relevance: 0, originality: 0, inspiration: 0, clarity: 0, total: 0, reason: '', error: `Could not parse scores from: ${raw.slice(0, 80)}` };
  }
  return { relevance, originality, inspiration, clarity, total, reason, error: null };
}

// ── Report helpers ───────────────────────────────────────────────────────────

const PASS_ICON  = '✅';
const FAIL_ICON  = '❌';
const WARN_ICON  = '⚠️ ';

function scoreBar(score, max) {
  const filled = Math.round((score / max) * 10);
  return '█'.repeat(filled) + '░'.repeat(10 - filled);
}

function printResult(index, testCase, quote, validation, gradeResult) {
  const num = String(index + 1).padStart(2, '0');
  const valIcon = validation.pass ? PASS_ICON : FAIL_ICON;

  console.log(`\n─── Quote #${num} [${ testCase.language.toUpperCase() }] ${'─'.repeat(50)}`);
  console.log(`  Motivation : ${testCase.motivation}`);
  console.log(`  Generated  : "${quote}"`);
  console.log(`  Validation : ${valIcon} ${validation.pass ? 'PASS' : 'FAIL — ' + validation.issues.join(', ')}`);

  if (gradeResult.error) {
    console.log(`  Grade      : ${WARN_ICON} Grader error — ${gradeResult.error}`);
  } else {
    const { relevance, originality, inspiration, clarity, total, reason } = gradeResult;
    console.log(`  Grade      : ${total}/12  ${scoreBar(total, 12)}`);
    console.log(`               Relevance ${relevance}/3  |  Originality ${originality}/3  |  Inspiration ${inspiration}/3  |  Clarity ${clarity}/3`);
    console.log(`  Reason     : ${reason}`);
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║              PROMPT GRADER & VALIDATOR                  ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`  Generator : ${GENERATOR_MODEL}`);
  console.log(`  Grader    : ${GRADER_MODEL}`);
  console.log(`  Cases     : ${TEST_CASES.length}`);
  console.log('');

  // Override env so generateQuoteMultiStep uses the generator model
  process.env.OLLAMA_MODEL = GENERATOR_MODEL;

  const results = [];

  for (let i = 0; i < TEST_CASES.length; i++) {
    const tc = TEST_CASES[i];
    process.stdout.write(`  Generating #${String(i + 1).padStart(2, '0')}/${TEST_CASES.length}...`);

    let quote = '';
    let genError = null;

    try {
      const generated = await generateQuoteMultiStep(tc.motivation, tc.language, []);
      quote = generated.text || '';
    } catch (err) {
      genError = err.message;
    }

    process.stdout.write(' grading...');

    const validation = validate(quote, tc.motivation);
    const gradeResult = genError
      ? { relevance: 0, originality: 0, inspiration: 0, clarity: 0, total: 0, reason: '', error: `Generation failed: ${genError}` }
      : await grade(tc.motivation, quote, tc.language);

    process.stdout.write(' done.\n');

    printResult(i, tc, quote, validation, gradeResult);
    results.push({ tc, quote, validation, gradeResult });
  }

  // ── Summary ──────────────────────────────────────────────────────────────

  const validPassed  = results.filter(r => r.validation.pass).length;
  const gradeable    = results.filter(r => !r.gradeResult.error);
  const avgScore     = gradeable.length
    ? (gradeable.reduce((s, r) => s + r.gradeResult.total, 0) / gradeable.length).toFixed(1)
    : 'N/A';
  const avgRelevance = gradeable.length
    ? (gradeable.reduce((s, r) => s + r.gradeResult.relevance, 0) / gradeable.length).toFixed(1)
    : 'N/A';
  const avgOriginal  = gradeable.length
    ? (gradeable.reduce((s, r) => s + r.gradeResult.originality, 0) / gradeable.length).toFixed(1)
    : 'N/A';

  // Find weakest dimension
  const dims = ['relevance', 'originality', 'inspiration', 'clarity'];
  let weakest = null;
  if (gradeable.length) {
    const dimAvgs = dims.map(d => ({
      dim: d,
      avg: gradeable.reduce((s, r) => s + r.gradeResult[d], 0) / gradeable.length,
    }));
    weakest = dimAvgs.sort((a, b) => a.avg - b.avg)[0];
  }

  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║                      SUMMARY                            ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`  Validation  : ${validPassed}/${results.length} passed`);
  console.log(`  Avg score   : ${avgScore}/12`);
  console.log(`  Avg relevance   : ${avgRelevance}/3`);
  console.log(`  Avg originality : ${avgOriginal}/3`);
  if (weakest) {
    console.log(`  Weakest dim : ${weakest.dim} (avg ${weakest.avg.toFixed(1)}/3) — consider prompt tuning here`);
  }
  console.log('');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
