/**
 * Automated script to configure CORS on Google Cloud / Firebase Storage bucket
 * Usage: node scripts/set-storage-cors.js [bucketName]
 */

const fs = require('fs');
const path = require('path');

async function main() {
  const rootDir = path.resolve(__dirname, '..');
  const corsConfigPath = path.join(rootDir, 'cors.json');

  if (!fs.existsSync(corsConfigPath)) {
    console.error('❌ cors.json not found in root directory.');
    process.exit(1);
  }

  const corsRules = JSON.parse(fs.readFileSync(corsConfigPath, 'utf8'));

  // Get project ID from pwa/.env or argument
  let bucket = process.argv[2];
  if (!bucket) {
    const envPath = path.join(rootDir, 'pwa', '.env');
    if (fs.existsSync(envPath)) {
      const envText = fs.readFileSync(envPath, 'utf8');
      const m = envText.match(/VITE_FIREBASE_STORAGE_BUCKET=(.+)/);
      if (m) bucket = m[1].trim();
    }
  }

  if (!bucket) {
    bucket = 'doodlebug-ddc9c.firebasestorage.app';
  }

  console.log(`Setting CORS for storage bucket: ${bucket}...`);

  // Try locating Firebase CLI credentials
  const homeDir = process.env.USERPROFILE || process.env.HOME || '';
  const tokenPaths = [
    path.join(homeDir, '.config', 'configstore', 'firebase-tools.json'),
    path.join(process.env.APPDATA || '', 'configstore', 'firebase-tools.json'),
  ];

  let token = null;
  for (const p of tokenPaths) {
    if (fs.existsSync(p)) {
      try {
        const cfg = JSON.parse(fs.readFileSync(p, 'utf8'));
        if (cfg.tokens && cfg.tokens.access_token) {
          token = cfg.tokens.access_token;
          break;
        }
      } catch {
        // ignore parse errors
      }
    }
  }

  if (!token) {
    console.error('❌ Could not find Firebase CLI access token.');
    console.log('Please ensure you are logged in via "npx firebase-tools login".');
    process.exit(1);
  }

  const endpoint = `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}`;
  
  const res = await fetch(endpoint, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      cors: corsRules,
    }),
  });

  const data = await res.json();
  if (data.error) {
    console.error('❌ Failed to update CORS:', data.error.message || data.error);
    process.exit(1);
  }

  console.log('✅ CORS configuration successfully applied to bucket:');
  console.log(JSON.stringify(data.cors, null, 2));
}

main().catch((err) => {
  console.error('❌ Unexpected error:', err.message);
  process.exit(1);
});
