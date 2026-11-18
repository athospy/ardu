const { Ollama } = require('ollama');
const logger = require('../utils/logger');
const { getPrompt, CURRENT_VERSION } = require('../prompts/quote');

// Initialize Ollama client with increased timeout for AI generation
const ollama = new Ollama({
  host: process.env.OLLAMA_HOST || 'http://localhost:11434',
  timeout: 300000, // 5 minutes timeout for AI generation
});

const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:1.5b';

/**
 * Structured AI debug logging helper
 * Only logs when DEBUG_AI=true
 */
function aiDebug(step, data) {
  if (process.env.DEBUG_AI !== 'true') return;

  console.log(
    `\n🧠 [AI:${step}] ${new Date().toISOString()}\n` +
    JSON.stringify(data, null, 2) +
    '\n'
  );
}

/**
 * Truncate strings for safe logging
 */
function truncate(str, max = 2000) {
  if (!str) return str;
  return str.length > max
    ? str.slice(0, max) + `\n… (${str.length - max} chars truncated)`
    : str;
}

/**
 * Extract safe text from malformed AI response
 * Ensures push-safe output even when JSON parsing fails
 */
function extractSafeQuote(raw) {
  return raw
    // Remove JSON-like characters
    .replace(/[{}[\]"]/g, '')
    // Remove key names if present
    .replace(/\b(text|category|author)\b\s*:/gi, '')
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    // Trim
    .trim()
    // Max length safety for push notifications
    .slice(0, 200) || 'Keep moving forward.'; // Fallback if empty
}

/**
 * Strip wrapping quotes from AI output
 * Small models often wrap text in quotes - remove them
 */
function stripWrappingQuotes(text) {
  if (!text) return text;

  return text
    .trim()
    // Remove leading & trailing straight, curly or Spanish (« ») quotes
    .replace(/^["'“”‘’«»]+/, '')
    .replace(/["'“”‘’«»]+$/, '')
    .trim();
}

/**
 * Normalize text for similarity comparison
 */
function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Similarity between two texts: shared words divided by the size of the larger
 * word set (not Jaccard, which divides by the union).
 * Returns 0 (completely different) to 1 (identical)
 */
function similarity(a, b) {
  const setA = new Set(normalize(a).split(' '));
  const setB = new Set(normalize(b).split(' '));
  const intersection = [...setA].filter(x => setB.has(x)).length;
  return intersection / Math.max(setA.size, setB.size);
}

/**
 * Calculate lexical overlap (word reuse) between two texts
 * Returns 0 (no shared words) to 1 (all words shared)
 */
function lexicalOverlap(a, b) {
  const A = new Set(normalize(a).split(' '));
  const B = new Set(normalize(b).split(' '));
  return [...A].filter(x => B.has(x)).length / Math.max(A.size, 1);
}

/**
 * Cliché openers and template phrases that small models fall back to, in the
 * two app languages. The v1 prompt already bans these; gate 3 enforces it.
 */
const TEMPLATE_PATTERNS = [
  /^\s*(empower|unleash|embrace|unlock|ignite|awaken)/i,
  /^\s*(empod[eé]rate|desbloquea|abraza|despierta|sana|vuela)/i,
  /\bone\s+(\w+\s+)?(step|day|\w+)\s+at\s+a\s+time\b/i,
  /\byour\s+(journey|potential)\b/i,
  /\bpaso\s+a\s+paso\b/i,
  /\bun[ao]?\s+\p{L}+\s+a\s+la\s+vez/iu, // \p{L}: accented words like lección
  /\btu\s+(viaje|potencial)\b/i,
];

function usesTemplate(text) {
  return TEMPLATE_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * Simple text generation for single-purpose prompts
 * No JSON, no complex formatting - just clean text output
 */
async function simpleGenerate(prompt, stepName = 'generate', { model = OLLAMA_MODEL, options } = {}) {
  const start = Date.now();

  aiDebug(stepName, {
    event: 'START',
    model,
    prompt_length: prompt.length,
    prompt_full: truncate(prompt),
  });

  const response = await ollama.generate({
    model,
    prompt,
    stream: true,
    options,
  });

  let result = '';
  for await (const chunk of response) {
    if (chunk.response) result += chunk.response;
  }

  const duration = Date.now() - start;
  result = stripWrappingQuotes(result.trim());

  aiDebug(stepName, {
    event: 'END',
    duration_ms: duration,
    output_length: result.length,
    output_full: truncate(result),
  });

  if (!result) {
    aiDebug(stepName, { warning: 'EMPTY_OUTPUT' });
  }

  return result;
}

/**
 * Generate quote text only (simplified for small models).
 * The prompt text and sampling options live in src/prompts/quote/; production
 * uses the current version, the eval harness can pick another one.
 */
async function generateQuoteText(motivation, language = 'en', { promptVersion, model } = {}) {
  const prompt = getPrompt(promptVersion);
  return simpleGenerate(prompt.build(motivation, language), 'QUOTE_TEXT', {
    model,
    options: prompt.options,
  });
}



// Generate a motivational quote based on user's motivation
// Returns an object with: { text, category, author (optional) }
const generateMotivationalQuote = async (motivation, language = 'en') => {
  try {
    const prompt = createQuotePrompt(motivation, language);
    
    const response = await ollama.generate({
      model: OLLAMA_MODEL,
      prompt: prompt,
      stream: true, // Use streaming to avoid headers timeout
      options: {
        temperature: 0.4, // Balanced for small models
        top_p: 0.8,
        num_predict: 80, // Lower for VPS reliability (small models fail silently when over-asked)
        repeat_penalty: 1.1,
        stop: ['\n\n', '```'], // Stop at double newlines or code blocks
      },
    });

    // Collect streamed response
    let result = '';
    let fullResponse = null;
    for await (const chunk of response) {
      if (chunk.response) {
        result += chunk.response;
      }
      // Capture final chunk for debugging
      if (chunk.done) {
        fullResponse = chunk;
      }
    }
    result = result.trim();
    
    // Debug logging for AI responses
    if (process.env.DEBUG_AI === 'true') {
      console.log('\n=== OLLAMA FULL RESPONSE ===');
      console.log(JSON.stringify(fullResponse, null, 2));
      console.log('=== RAW AI RESPONSE START ===');
      console.log(result);
      console.log('=== RAW AI RESPONSE END ===\n');
    }
    
    // Detect empty AI output explicitly (before JSON parsing)
    if (!result || !result.trim()) {
      logger.warn({
        type: 'AI_FALLBACK_USED',
        reason: 'EMPTY_RESPONSE',
        model: OLLAMA_MODEL,
        motivation: motivation.slice(0, 50),
        eval_count: fullResponse?.eval_count || 0,
      });

      return {
        text: 'Keep moving forward.',
        category: 'motivation',
        author: null,
      };
    }
    
    // Remove markdown code blocks if present
    result = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    try {
      const parsed = JSON.parse(result);
      
      // Validate required fields
      if (!parsed.text || !parsed.category) {
        throw new Error('Missing required fields in AI response');
      }
      
      // Return structured data
      return {
        text: parsed.text.trim(),
        category: parsed.category.toLowerCase().trim(),
        author: parsed.author ? parsed.author.trim() : null,
      };
    } catch (parseError) {
      // SAFE fallback: extract clean text for push notifications
      const safeText = extractSafeQuote(result);
      
      // Log parse failure with explicit fallback notice
      logger.warn({
        type: 'AI_FALLBACK_USED',
        reason: 'JSON_PARSE_FAILED',
        error: parseError.message,
        model: OLLAMA_MODEL,
        raw: result.slice(0, 200),
        text_preview: safeText.slice(0, 50),
      });
      
      return {
        text: safeText,
        category: 'motivation',
        author: null,
      };
    }
  } catch (error) {
    console.error('Error generating quote with Ollama:', error);
    throw new Error('Failed to generate quote');
  }
};

// Create a prompt for quote generation
// Requests structured JSON response with text, category, and optional author
const createQuotePrompt = (motivation, language) => {
  const languageInstruction = language === 'es'
    ? 'Write the quote text in Spanish.'
    : 'Write the quote text in English.';

  return `Create a motivational quote for someone motivated by:
<motivation>${motivation}</motivation>

Rules:
- Quote must be specific to their motivation (not generic)
- Under 150 characters, one sentence
- ${languageInstruction}
- DO NOT start with: Empower, Unleash, Embrace, Unlock, Ignite
- Assign a category: success, growth, courage, focus, perseverance, strength, or confidence
- Set author to null (it is an original quote)

Return ONLY valid JSON with no markdown or line breaks inside strings:
{"text":"quote here","category":"growth","author":null}

JSON:`;
};

// Create batch prompt for multiple quotes
// Returns formatted prompt requesting array of quotes
const createBatchQuotePrompt = (quotesData) => {
  // Build existing quotes list for context
  const existingQuotesText = quotesData
    .filter(q => q.existingQuotes && q.existingQuotes.length > 0)
    .map((q, i) => `Quote ${i+1} already has: ${q.existingQuotes.slice(0, 2).join(', ')}`)
    .join('\n');

  const promptText = `You are a JSON generator. If you cannot follow the schema EXACTLY, return an empty array [].

Generate ${quotesData.length} ORIGINAL motivational quotes in the SAME ORDER as the data below.

${quotesData.map((q, i) => `${i+1}. Motivation: "${q.motivation}", Language: ${q.language}`).join('\n')}

${existingQuotesText ? `\nDO NOT repeat:\n${existingQuotesText}\n` : ''}
Rules:
- Output valid JSON array ONLY
- No trailing commas
- Quote under 150 characters
- Text = quote only (NO author attribution in text)
- Categories: success, perseverance, growth, courage, focus, dreams, action, strength
- All quotes MUST be original (not famous quotes)
- Author MUST be null
- Return quotes in SAME ORDER as input

Schema:
[
  {"text": "quote here", "category": "success", "author": null},
  ...
]`;

  if (process.env.DEBUG_AI === 'true') {
    console.log('\n=== BATCH PROMPT ===\n' + promptText + '\n===================\n');
  }
  return promptText;
};

// Normalize and validate a single quote object
// Returns normalized quote or null if invalid
function normalizeQuote(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (typeof raw.text !== 'string' || !raw.text.trim()) return null;
  if (typeof raw.category !== 'string' || !raw.category.trim()) return null;

  return {
    text: raw.text.trim(),
    category: raw.category.toLowerCase().trim(),
    author:
      typeof raw.author === 'string' && raw.author.trim()
        ? raw.author.trim()
        : null,
  };
}

// Safe JSON repair (minimal, conservative)
function repairJSON(raw) {
  return raw
    .replace(/,\s*([}\]])/g, '$1') // Remove trailing commas
    .replace(/"author"\s*:\s*null/g, '"author":null'); // Fix spacing
}

// Generate multiple quotes in a single batch with retry logic
// Returns array of: { id, text, category, author } OR { id, error }
const generateBatchQuotes = async (quotesData, retries = 2) => {
  try {
    const prompt = createBatchQuotePrompt(quotesData);
    
    // Use streaming to avoid headers timeout on slow VPS
    const response = await ollama.generate({
      model: OLLAMA_MODEL,
      prompt: prompt,
      stream: true, // Critical: sends headers immediately
      options: {
        temperature: 0.6,
        top_p: 0.9,
        num_predict: Math.min(400, quotesData.length * 80), // Reduced for VPS
        repeat_penalty: 1.1,
      },
    });

    // Collect streamed response
    let result = '';
    for await (const chunk of response) {
      if (chunk.response) {
        result += chunk.response;
      }
    }
    result = result.trim();
    
    // Remove markdown code blocks if present
    result = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Try to extract JSON array if wrapped in text
    const arrayMatch = result.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (arrayMatch) {
      result = arrayMatch[0];
    }
    
    // Debug logging (controlled by env var)
    if (process.env.DEBUG_AI === 'true') {
      console.log('AI Response (first 500 chars):', result.substring(0, 500));
    }
    
    // Safe JSON parsing with minimal repair
    let parsed;
    try {
      parsed = JSON.parse(result);
    } catch (parseError) {
      console.warn('Initial JSON parse failed, attempting repair...');
      const repaired = repairJSON(result);
      
      try {
        parsed = JSON.parse(repaired);
        console.log('✓ JSON repair successful');
      } catch (repairError) {
        const error = new Error('AI_JSON_INVALID');
        error.raw = result.slice(0, 500);
        error.model = OLLAMA_MODEL;
        console.error('AI returned invalid JSON:', result.substring(0, 1000));
        throw error;
      }
    }
    
    if (!Array.isArray(parsed)) {
      const error = new Error('Expected array response from AI');
      error.raw = result.slice(0, 500);
      throw error;
    }

    if (parsed.length !== quotesData.length) {
      console.warn(`⚠️  Expected ${quotesData.length} quotes but got ${parsed.length}`);
    }

    // Normalize each quote independently (graceful degradation)
    const results = [];
    
    for (let i = 0; i < quotesData.length; i++) {
      const normalized = normalizeQuote(parsed[i]);
      
      if (!normalized) {
        console.error(`❌ Invalid quote at index ${i}:`, parsed[i]);
        results.push({
          id: quotesData[i].id,
          error: 'INVALID_AI_ITEM',
        });
        continue;
      }

      results.push({
        id: quotesData[i].id,
        ...normalized,
      });
    }

    return results;
  } catch (error) {
    // Retry on headers timeout (common on VPS with cold model)
    if (error.cause?.code === 'UND_ERR_HEADERS_TIMEOUT' && retries > 0) {
      console.warn(`⚠️  Headers timeout, retrying... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s
      return generateBatchQuotes(quotesData, retries - 1);
    }
    
    console.error('Error generating batch quotes with Ollama:', error);
    throw error;
  }
};

// Test if Ollama is available and can generate valid JSON
const testConnection = async () => {
  try {
    const response = await ollama.generate({
      model: OLLAMA_MODEL,
      prompt: 'Return valid JSON: {"ok": true}',
      stream: false,
      options: {
        temperature: 0.1,
        num_predict: 50,
      },
    });
    
    // Validate it returns JSON
    const result = response.response.trim();
    const parsed = JSON.parse(result.replace(/```json\n?/g, '').replace(/```\n?/g, ''));
    
    return parsed.ok === true;
  } catch (error) {
    console.error('Ollama connection test failed:', error.message);
    return false;
  }
};

/**
 * Simple quote generation with similarity checking.
 *
 * Each draft passes two gates; a draft that fails one is regenerated, up to
 * MAX_ATTEMPTS drafts in total (the last draft is kept even if it fails):
 *   Gate 1 (overlap):    share of the draft's words that also appear in the
 *                        motivation. High = the model just echoed the input.
 *   Gate 2 (similarity): shared words / words in the larger of the two texts,
 *                        against each recent quote passed in (the quote job passes
 *                        the 200 newest AI quotes, all users). High = repeat.
 *   Gate 3 (template, optional, off by default): the draft uses a cliché
 *                        opener or template phrase the prompt already bans
 *                        (small models don't always follow the ban).
 *
 * options.promptVersion / options.model override the production defaults
 * (used by the eval harness and the MCP demo); options.templateGate turns
 * gate 3 on.
 *
 * Returns: { text, attempts, rejections: { overlap, similarity, template },
 *            durationMs, model, promptVersion, templateGate }
 */
async function generateQuoteMultiStep(motivation, language = 'en', existingQuotes = [], options = {}) {
  try {
    const MAX_ATTEMPTS = 2;           // Lower from 3
    const SIMILARITY_THRESHOLD = 0.75; // Lower from 0.85
    const OVERLAP_THRESHOLD = 0.3;     // Lower from 0.4

    const { promptVersion = CURRENT_VERSION, model = OLLAMA_MODEL, templateGate = false } = options;
    const start = Date.now();
    let text;
    let attempts = 0;
    const rejections = { overlap: 0, similarity: 0, template: 0 };

    logger.info(`🎯 Generating quote for: "${motivation.substring(0, 30)}..."`);

    // Generate text with overlap + similarity checking
    do {
      logger.info(`📝 Generating (attempt ${attempts + 1}/${MAX_ATTEMPTS})...`);
      text = await generateQuoteText(motivation, language, { promptVersion, model });
      logger.info(`   Generated: "${text}"`);
      attempts++;
      
      // Gate 1: Check lexical overlap with motivation (prompt leakage)
      const overlap = lexicalOverlap(text, motivation);
      
      aiDebug('OVERLAP_CHECK', {
        overlap: overlap.toFixed(3),
        threshold: OVERLAP_THRESHOLD,
        generated: text,
        motivation: motivation.slice(0, 100),
      });
      
      if (overlap > OVERLAP_THRESHOLD && attempts < MAX_ATTEMPTS) {
        aiDebug('OVERLAP_CHECK', {
          decision: 'REJECTED_TOO_SIMILAR_TO_PROMPT',
          attempt: attempts,
          max_attempts: MAX_ATTEMPTS,
        });
        logger.info(`   ⚠️  Too similar to prompt (${(overlap * 100).toFixed(1)}% overlap), regenerating...`);
        rejections.overlap++;
        continue;
      }

      // Gate 3 (optional): cliché openers / template phrases
      if (templateGate && usesTemplate(text) && attempts < MAX_ATTEMPTS) {
        aiDebug('TEMPLATE_CHECK', { decision: 'REJECTED_TEMPLATE', generated: text });
        logger.info('   ⚠️  Template phrase, regenerating...');
        rejections.template++;
        continue;
      }
      
      // Gate 2: Check similarity against existing quotes
      if (existingQuotes.length > 0) {
        let isTooSimilar = false;
        
        for (const existingQuote of existingQuotes) {
          const score = similarity(text, existingQuote);
          
          if (score > SIMILARITY_THRESHOLD) {
            aiDebug('SIMILARITY', {
              generated: text,
              existing: existingQuote.slice(0, 80),
              score: score.toFixed(3),
              threshold: SIMILARITY_THRESHOLD,
            });
            isTooSimilar = true;
            break;
          }
        }
        
        if (isTooSimilar && attempts < MAX_ATTEMPTS) {
          aiDebug('SIMILARITY', {
            decision: 'REJECTED_TOO_SIMILAR_TO_EXISTING',
            attempt: attempts,
            max_attempts: MAX_ATTEMPTS,
          });
          logger.info(`   ⚠️  Too similar to existing, regenerating...`);
          rejections.similarity++;
          continue;
        } else {
          if (!isTooSimilar) {
            aiDebug('SIMILARITY', { decision: 'ACCEPTED_UNIQUE' });
          }
          break; // Success or max attempts reached
        }
      } else {
        aiDebug('SIMILARITY', { decision: 'SKIPPED_NO_EXISTING_QUOTES' });
        break; // No existing quotes to check
      }
    } while (attempts < MAX_ATTEMPTS);

    const duration = Date.now() - start;
    const result = {
      text: text.slice(0, 200), // Enforce max length
      attempts,
      rejections,
      durationMs: duration,
      model,
      promptVersion,
      templateGate,
    };

    aiDebug('FINAL_RESULT', {
      text: result.text,
      attempts: attempts,
      duration_ms: duration,
    });

    logger.info(`✅ Generation complete in ${duration}ms`);
    return result;
  } catch (error) {
    logger.error(`❌ Error in generateQuoteMultiStep:`, error);
    throw error;
  }
}

module.exports = {
  ollama,
  generateMotivationalQuote, // Keep old function for compatibility
  generateQuoteMultiStep, // New multi-step function
  generateBatchQuotes,
  testConnection,
  similarity, // Export for testing
  lexicalOverlap,
  normalize,
  usesTemplate,
  stripWrappingQuotes,
};
