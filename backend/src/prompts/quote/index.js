// Registry of quote-prompt versions. Production uses CURRENT_VERSION; the eval
// harness (evals/) can ask for any version to compare them.

const VERSIONS = {
  v0: require('./v0-baseline'),
  v1: require('./v1-current'),
};

const CURRENT_VERSION = 'v1';

function getPrompt(version = CURRENT_VERSION) {
  const prompt = VERSIONS[version];
  if (!prompt) {
    throw new Error(`Unknown prompt version "${version}". Known: ${Object.keys(VERSIONS).join(', ')}`);
  }
  return prompt;
}

module.exports = { VERSIONS, CURRENT_VERSION, getPrompt };
