/**
 * Gemini Helper - delegates to real compiled worker module
 */
const realGemini = require('../dist-test/gemini.js');

module.exports = {
  buildGeminiPrompt: realGemini.buildGeminiPrompt,
  sanitizeHtmlResponse: realGemini.sanitizeHtmlResponse,
};
