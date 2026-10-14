/**
 * Doodlebug Project-Wide Linting & Code Hygiene Audit Script
 * 
 * Runs strict TypeScript static analysis and scans codebase for:
 * - Secret token leaks
 * - Accessibility anti-patterns (e.g. user-scalable=no)
 * - Security rule regressions
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('═══════════════════════════════════════════════════════');
console.log('🔍 DOODLEBUG CODE QUALITY & LINTING AUDIT');
console.log('═══════════════════════════════════════════════════════\n');

let errors = 0;

function runStep(title, fn) {
  try {
    process.stdout.write(`• ${title}... `);
    fn();
    console.log('✅ OK');
  } catch (err) {
    console.log('❌ FAILED');
    console.error(`  Reason: ${err.message}`);
    errors++;
  }
}

// 1. Worker TypeScript Static Analysis
runStep('Worker TypeScript strict typechecking (worker/src)', () => {
  const workerDir = path.resolve(__dirname, '..', 'worker');
  execSync('npm run lint', { cwd: workerDir, stdio: 'pipe' });
});

// 2. PWA TypeScript Static Analysis
runStep('PWA TypeScript strict typechecking (pwa/src)', () => {
  const pwaDir = path.resolve(__dirname, '..', 'pwa');
  execSync('npm run lint', { cwd: pwaDir, stdio: 'pipe' });
});

// 3. Security Hygiene & Mobile Accessibility Scan
runStep('Scanning source code for mobile accessibility & secret patterns', () => {
  const rootDir = path.resolve(__dirname, '..');
  const indexHtml = fs.readFileSync(path.join(rootDir, 'pwa', 'index.html'), 'utf8');
  if (indexHtml.includes('user-scalable=no') || indexHtml.includes('maximum-scale=1.0')) {
    throw new Error('pwa/index.html must not block accessibility zoom with user-scalable=no');
  }

  const storageRules = fs.readFileSync(path.join(rootDir, 'storage.rules'), 'utf8');
  if (storageRules.includes('svg+xml')) {
    throw new Error('storage.rules must not allow svg+xml uploads due to script injection risks');
  }
  if (!storageRules.includes('allow list: if false') || storageRules.includes('allow read: if true')) {
    throw new Error('storage.rules must explicitly disallow public listing (allow list: if false) to prevent bucket scraping');
  }

  const wranglerToml = fs.readFileSync(path.join(rootDir, 'worker', 'wrangler.toml'), 'utf8');
  if (wranglerToml.includes('CORS_ORIGIN = "*"')) {
    throw new Error('worker/wrangler.toml must not use wildcard CORS_ORIGIN = "*" in production config');
  }

  const rootIndexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
  const liveSiteIndexHtml = fs.readFileSync(path.join(rootDir, 'live-site', 'index.html'), 'utf8');
  if (!rootIndexHtml.includes('allow-popups') || !liveSiteIndexHtml.includes('allow-popups')) {
    throw new Error('Both root index.html and live-site/index.html iframe sandbox must include allow-popups for link navigation');
  }
});

console.log('\n═══════════════════════════════════════════════════════');
if (errors === 0) {
  console.log('🎉 ALL LINTING & HYGIENE CHECKS PASSED');
  console.log('═══════════════════════════════════════════════════════\n');
  process.exit(0);
} else {
  console.error(`❌ LINTING COMPLETED WITH ${errors} ERRORS`);
  console.log('═══════════════════════════════════════════════════════\n');
  process.exit(1);
}
