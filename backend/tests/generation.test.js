// Unit tests for the quote generator. No model is called: the Ollama client is
// replaced by a fake that returns scripted drafts, so the gates can be tested.

const mockDrafts = [];
const mockRequests = [];

jest.mock('ollama', () => ({
  Ollama: class {
    async generate(request) {
      mockRequests.push(request);
      const text = mockDrafts.shift() ?? 'Default draft from the fake model.';
      return (async function* stream() { yield { response: text }; })();
    }
  },
}));

const logger = require('../src/utils/logger');
const {
  generateQuoteMultiStep,
  similarity,
  lexicalOverlap,
  normalize,
  stripWrappingQuotes,
  usesTemplate,
  usesForeignScript,
} = require('../src/config/ollama');
const { getPrompt, CURRENT_VERSION, VERSIONS } = require('../src/prompts/quote');

logger.silent = true;

beforeEach(() => {
  mockDrafts.length = 0;
  mockRequests.length = 0;
});

describe('text helpers', () => {
  test('normalize lowercases and drops punctuation', () => {
    expect(normalize('  Hello, WORLD!  again ')).toBe('hello world again');
  });

  test('normalize keeps accented letters (Spanish words stay intact)', () => {
    expect(normalize('Más calma, niño.')).toBe('más calma niño');
    expect(lexicalOverlap('más calma', 'vivir con más calma')).toBe(1);
  });

  test('usesForeignScript flags non-Latin letters only', () => {
    expect(usesForeignScript('Ahorrar月薪购房第一步')).toBe(true);
    expect(usesForeignScript('¡Vuelve a la cancha, más fuerte que nunca! 100%')).toBe(false);
    expect(usesForeignScript('Keep going — “one more” try…')).toBe(false);
  });

  test('lexicalOverlap = share of the first text\'s words found in the second', () => {
    expect(lexicalOverlap('learn to code', 'I want to learn to code')).toBe(1);
    expect(lexicalOverlap('ship small programs', 'learn to code')).toBe(0);
    expect(lexicalOverlap('', 'anything')).toBe(0);
  });

  test('similarity = shared words / words in the larger text', () => {
    expect(similarity('a b c d', 'a b c d')).toBe(1);
    expect(similarity('a b', 'a b c d')).toBe(0.5);
    expect(similarity('a b', 'c d')).toBe(0);
  });

  test('stripWrappingQuotes removes straight and curly quotes around the text', () => {
    expect(stripWrappingQuotes('"Keep going."')).toBe('Keep going.');
    expect(stripWrappingQuotes('“Keep going.”')).toBe('Keep going.');
    expect(stripWrappingQuotes('«Sigue adelante.»')).toBe('Sigue adelante.');
    expect(stripWrappingQuotes("It's fine")).toBe("It's fine");
  });
});

describe('prompt versions', () => {
  test('current version exists and unknown versions throw', () => {
    expect(getPrompt().id).toBe(CURRENT_VERSION);
    expect(() => getPrompt('v99')).toThrow(/Unknown prompt version/);
  });

  test.each(Object.keys(VERSIONS))('%s builds an English and a Spanish prompt that include the motivation', (version) => {
    const prompt = getPrompt(version);
    expect(prompt.build('running a marathon', 'en')).toContain('running a marathon');
    expect(prompt.build('correr un maratón', 'es')).toContain('correr un maratón');
    expect(prompt.build('x', 'es')).not.toEqual(prompt.build('x', 'en'));
  });

  test('the chosen version and model are sent to Ollama', async () => {
    await generateQuoteMultiStep('learning to code', 'en', [], { promptVersion: 'v0', model: 'test-model' });
    expect(mockRequests[0].model).toBe('test-model');
    expect(mockRequests[0].options).toEqual(getPrompt('v0').options);
    expect(mockRequests[0].prompt).toBe(getPrompt('v0').build('learning to code', 'en'));
  });
});

describe('generateQuoteMultiStep gates', () => {
  test('accepts a good first draft', async () => {
    mockDrafts.push('Every bug you fix is rent paid on your new career.');
    const result = await generateQuoteMultiStep('learning to code and switching careers', 'en', []);
    expect(result.text).toBe('Every bug you fix is rent paid on your new career.');
    expect(result.attempts).toBe(1);
    expect(result.rejections).toEqual({ script: 0, overlap: 0, similarity: 0, template: 0 });
    expect(result.promptVersion).toBe(CURRENT_VERSION);
  });

  test('gate 1 regenerates a draft that echoes the motivation', async () => {
    mockDrafts.push('Learning to code and switching careers.', 'Every bug you fix pays rent on the future.');
    const result = await generateQuoteMultiStep('learning to code and switching careers', 'en', []);
    expect(result.text).toBe('Every bug you fix pays rent on the future.');
    expect(result.attempts).toBe(2);
    expect(result.rejections).toEqual({ script: 0, overlap: 1, similarity: 0, template: 0 });
  });

  test('the script check regenerates a draft that switched to another alphabet', async () => {
    mockDrafts.push('Ahorrar月薪购房第一步，一步一个脚印。', 'Cada peso ahorrado es un ladrillo de tu futuro hogar.');
    const result = await generateQuoteMultiStep('ahorrar para comprar mi primera casa', 'es', []);
    expect(result.text).toBe('Cada peso ahorrado es un ladrillo de tu futuro hogar.');
    expect(result.rejections).toEqual({ script: 1, overlap: 0, similarity: 0, template: 0 });
  });

  test('gate 2 regenerates a draft that repeats an existing quote', async () => {
    const existing = 'Small daily wins build a big new life.';
    mockDrafts.push('Small daily wins build a big new life.', 'Tonight’s practice is tomorrow’s promotion.');
    const result = await generateQuoteMultiStep('getting a better job', 'en', [existing]);
    expect(result.text).toBe('Tonight’s practice is tomorrow’s promotion.');
    expect(result.rejections).toEqual({ script: 0, overlap: 0, similarity: 1, template: 0 });
  });

  test('keeps the last draft after the maximum attempts, even if it fails a gate', async () => {
    mockDrafts.push('Learning to code.', 'Learning to code, again.');
    const result = await generateQuoteMultiStep('learning to code', 'en', []);
    expect(result.attempts).toBe(2);
    expect(result.text).toBe('Learning to code, again.');
    expect(mockRequests).toHaveLength(2);
  });

  test('cuts the text to 200 characters', async () => {
    mockDrafts.push('word '.repeat(80));
    const result = await generateQuoteMultiStep('patience', 'en', []);
    expect(result.text.length).toBeLessThanOrEqual(200);
  });
});

describe('gate 3: template filter', () => {
  test.each([
    'Embrace the code, your future is calling.',
    'Unlocking new skills every night.',
    'Empodérate con cada línea de código.',
    'Build your career one bug at a time.',
    'Trust your journey into tech.',
    'Aprende paso a paso.',
    'Una lección a la vez, llegarás.',
    'Confía en tu potencial.',
  ])('flags "%s"', (text) => {
    expect(usesTemplate(text)).toBe(true);
  });

  test.each([
    'Every bug you fix pays rent on your new career.',
    'Cada error que corriges es una clase gratis.',
    'She embraced the challenge.', // only banned as an opener
  ])('allows "%s"', (text) => {
    expect(usesTemplate(text)).toBe(false);
  });

  test('is off by default (production behavior unchanged)', async () => {
    mockDrafts.push('Embrace the code, your future is calling.');
    const result = await generateQuoteMultiStep('learning to program', 'en', []);
    expect(result.attempts).toBe(1);
    expect(result.templateGate).toBe(false);
  });

  test('when on, regenerates a templated draft', async () => {
    mockDrafts.push('Embrace the code, your future is calling.', 'Every bug you fix pays rent on tomorrow.');
    const result = await generateQuoteMultiStep('learning to program', 'en', [], { templateGate: true });
    expect(result.text).toBe('Every bug you fix pays rent on tomorrow.');
    expect(result.rejections.template).toBe(1);
  });
});
