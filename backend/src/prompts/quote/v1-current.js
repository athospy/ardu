// v1 — the quote prompt in production since May 2026.
//
// Changes from v0: the motivation is the *subject* of the quote, it must
// mention something concrete from it, cliché openers and template phrases are
// banned, and the token budget went from 40 to 60 (specific quotes are longer).

module.exports = {
  id: 'v1',
  description: 'Current (May 2026): motivation as subject, concrete reference required, cliché bans',
  options: {
    temperature: 0.8,
    num_predict: 60,
    stop: ['\n'],
  },
  build(motivation, language) {
    if (language === 'es') {
      return `Escribe UNA frase motivacional corta y específica sobre este tema:
"${motivation}"

Reglas obligatorias:
- La frase DEBE mencionar algo concreto del tema
- Máximo 120 caracteres, una sola oración
- NO empieces con: Empodérate, Desbloquea, Abraza, Despierta, Sana, Vuela
- NO uses: "paso a paso", "un X a la vez", "tu viaje", "tu potencial"
- Sin comillas alrededor de la frase

Devuelve SOLO la frase:`;
    }

    return `Write ONE short motivational quote specifically about:
"${motivation}"

Required rules:
- The quote MUST reference something concrete from the topic above
- Max 120 characters, one sentence
- DO NOT start with: Empower, Unleash, Embrace, Unlock, Ignite, Awaken
- DO NOT use: "one step at a time", "one X at a time", "your journey", "your potential"
- No wrapping quotes

Return ONLY the quote:`;
  },
};
