/**
 * GitHub Helper - delegates to real compiled worker module
 */
const realGithub = require('../dist-test/github.js');

module.exports = {
  getGitHubConfig: realGithub.getGitHubConfig,
  utf8ToBase64: realGithub.utf8ToBase64,
};
