// v0 — the quote prompt as it was in production from Dec 2025 to May 2026.
//
// It treated the user's motivation as loose "inspiration" and told the model
// NOT to reuse its words, which pushed small models away from the topic.
// Kept so the eval harness can measure the change against it.

module.exports = {
  id: 'v0',
  description: 'Baseline (Dec 2025): motivation as "inspiration only", no-reuse rule',
  options: {
    temperature: 0.8,
    num_predict: 40,
    stop: ['\n'],
  },
  build(motivation, language) {
    if (language === 'es') {
      return `Escribe UNA frase motivacional original.

Reglas:
- No copies palabras del texto
- No parafrasees
- Máximo 120 caracteres
- Una sola oración

Idea (solo inspiración):
${motivation}

Devuelve SOLO la frase.`;
    }

    return `Write ONE original motivational quote.

Rules:
- Do not reuse words from the input
- Do not paraphrase
- Max 120 characters
- One sentence

Idea (inspiration only):
${motivation}

Return ONLY the quote.`;
  },
};
