/**
 * Router & CORS Helper - delegates to real compiled worker module
 */
const realIndex = require('../dist-test/index.js');

module.exports = {
  getCorsHeaders: realIndex.getCorsHeaders,
  jsonResponse: realIndex.jsonResponse,
};
