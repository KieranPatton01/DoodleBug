/**
 * Cloudflare Worker Gateway API Client
 * Securely communicates with /api/generate and /api/publish
 * Zero client secrets: all operations are authenticated with Firebase ID token.
 */

import { GenerateResult, PublishResult, VibeType } from '../types';

export function getWorkerBaseUrl(): string {
  const customUrl = localStorage.getItem('doodlebug_worker_url');
  if (customUrl) return customUrl.replace(/\/+$/, '');

  const envUrl = import.meta.env.VITE_WORKER_URL;
  if (envUrl) return envUrl.replace(/\/+$/, '');

  // Default to local wrangler dev port if running locally
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://127.0.0.1:8787';
  }

  return '';
}

export function setWorkerBaseUrl(url: string) {
  const trimmed = url.trim();
  if (trimmed) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
        throw new Error('Worker URL must use HTTPS (or localhost for local development)');
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes('HTTPS')) throw e;
      throw new Error('Invalid URL format');
    }
  }
  localStorage.setItem('doodlebug_worker_url', trimmed);
}

export interface GenerateParams {
  snapshotBase64: string;
  imageUrls?: string[];
  vibe: VibeType;
  notes?: string;
  idToken: string;
}

export interface PublishParams {
  html: string;
  commitMessage?: string;
  idToken: string;
}

/**
 * Escapes unsafe characters for HTML injection
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Calls Cloudflare Worker /api/generate
 */
export async function callGenerateApi(params: GenerateParams): Promise<GenerateResult> {
  const baseUrl = getWorkerBaseUrl();
  if (!baseUrl) {
    if (import.meta.env.DEV && params.idToken.startsWith('mock-token-')) {
      return generateMockPreview(params);
    }
    throw new Error('Cloudflare Worker URL is not configured. Please open Settings (gear icon) and set your Worker URL.');
  }

  const url = `${baseUrl}/api/generate`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${params.idToken}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        snapshotBase64: params.snapshotBase64,
        imageUrls: params.imageUrls || [],
        vibe: params.vibe,
        notes: params.notes || '',
      }),
    });
  } catch (networkErr) {
    clearTimeout(timeoutId);
    if (networkErr instanceof Error && (networkErr.name === 'AbortError' || networkErr.message.includes('aborted'))) {
      throw new Error('Generation timed out after 60 seconds. The Gemini model took too long to respond. Please try again.');
    }
    // Only provide client preview synthesis in local development mode when worker network connection is unreachable
    if (import.meta.env.DEV && params.idToken.startsWith('mock-token-')) {
      console.warn('Worker connection unreachable while in dev mock mode; generating local client preview:', networkErr);
      return generateMockPreview(params);
    }
    throw networkErr;
  }

  clearTimeout(timeoutId);

  // If the server responded (e.g. 502 Bad Gateway, 403 Forbidden, 401 Unauthorized, 429), NEVER fall back to fake preview!
  if (!response.ok) {
    let errorDetail = '';
    try {
      const errorData = (await response.json()) as { error?: string; message?: string };
      errorDetail = errorData.error || errorData.message || response.statusText;
    } catch {
      errorDetail = await response.text().catch(() => response.statusText);
    }
    const fullErrorMessage = `[HTTP ${response.status}] ${errorDetail || 'Server error'}`;
    console.error(`❌ Cloudflare Worker /api/generate responded with an error [HTTP ${response.status}]:`, {
      url,
      status: response.status,
      statusText: response.statusText,
      error: errorDetail,
    });
    throw new Error(fullErrorMessage);
  }

  const data = (await response.json()) as GenerateResult;
  return data;
}

/**
 * Calls Cloudflare Worker /api/publish
 */
export async function callPublishApi(params: PublishParams): Promise<PublishResult> {
  const baseUrl = getWorkerBaseUrl();
  if (!baseUrl) {
    if (import.meta.env.DEV && params.idToken.startsWith('mock-token-')) {
      return {
        success: true,
        commitSha: 'mock-commit-' + Math.random().toString(36).substring(2, 9),
        htmlUrl: 'https://github.com/your-username/doodlebug/blob/main/canvas.html',
        path: 'canvas.html',
        branch: 'main',
      };
    }
    throw new Error('Cloudflare Worker URL is not configured. Please open Settings (gear icon) and set your Worker URL.');
  }
  const url = `${baseUrl}/api/publish`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${params.idToken}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        html: params.html,
        commitMessage: params.commitMessage,
      }),
    });
  } catch (networkErr) {
    clearTimeout(timeoutId);
    if (networkErr instanceof Error && (networkErr.name === 'AbortError' || networkErr.message.includes('aborted'))) {
      throw new Error('Publishing timed out after 30 seconds. The GitHub API took too long to respond. Please try again.');
    }
    // Only return mock fallback commit in local development mode when network is unreachable
    if (import.meta.env.DEV && params.idToken.startsWith('mock-token-')) {
      return {
        success: true,
        commitSha: 'mock-commit-' + Math.random().toString(36).substring(2, 9),
        htmlUrl: 'https://github.com/your-username/doodlebug/blob/main/canvas.html',
        path: 'canvas.html',
        branch: 'main',
      };
    }
    throw networkErr;
  }

  clearTimeout(timeoutId);

  // If the server actually responded (e.g. 403 Forbidden or 401 Unauthorized), do NOT return fake success!
  if (!response.ok) {
    let errorDetail = '';
    try {
      const errorData = (await response.json()) as { error?: string; message?: string };
      errorDetail = errorData.error || errorData.message || response.statusText;
    } catch {
      errorDetail = await response.text().catch(() => response.statusText);
    }
    const fullErrorMessage = `[HTTP ${response.status}] ${errorDetail || 'Server error'}`;
    console.error(`❌ Cloudflare Worker /api/publish error [HTTP ${response.status}]:`, {
      url,
      status: response.status,
      statusText: response.statusText,
      error: errorDetail,
    });
    throw new Error(fullErrorMessage);
  }

  const data = (await response.json()) as PublishResult;
  return data;
}

/**
 * Offline demo generator for instant local testing
 */
function generateMockPreview(params: GenerateParams): GenerateResult {
  const images = (params.imageUrls && params.imageUrls.length > 0)
    ? params.imageUrls
    : ['https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=600&q=80'];

  const isHandwritten = params.vibe === 'Cute Handwritten';
  const isDark = params.vibe === 'Dark Mode Neon';
  const displayNotes = escapeHtml(params.notes || 'Doodled with care & translated to code!');
  const displayVibe = escapeHtml(params.vibe);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vibecoded Stage Preview</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Plus+Jakarta+Sans:wght@400;600;700&display=swap" rel="stylesheet">
  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: {
            hand: ['Caveat', 'cursive'],
            sans: ['"Plus Jakarta Sans"', 'sans-serif'],
          }
        }
      }
    }
  </script>
</head>
<body class="${isDark ? 'bg-slate-950 text-slate-100' : 'bg-gradient-to-b from-rose-50/60 to-white text-slate-800'} p-6 antialiased select-none font-sans">
  <div class="max-w-2xl mx-auto space-y-6">
    <div class="${isDark ? 'bg-slate-900 border-cyan-500/30' : 'bg-white border-pink-100'} p-6 rounded-3xl border shadow-sm">
      <div class="flex items-center justify-between mb-4">
        <span class="px-3 py-1 rounded-full text-xs font-semibold ${isDark ? 'bg-cyan-950 text-cyan-400 border border-cyan-800' : 'bg-pink-100 text-pink-700'}">
          ✨ Vibe: ${displayVibe}
        </span>
        <span class="text-xs ${isDark ? 'text-slate-400' : 'text-slate-400'} font-mono">Synthesized by Gemini Flash</span>
      </div>
      <h2 class="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
        ${displayNotes}
      </h2>
      <p class="${isHandwritten ? 'font-hand text-2xl text-rose-600' : 'text-sm text-slate-500'}">
        "Captured from the mobile canvas pad and compiled into modern Tailwind CSS."
      </p>
    </div>

    <!-- Dropped Photos -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      ${images.map((img, i) => `
        <div class="group ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-stone-200'} p-3 rounded-2xl border shadow-xs hover:shadow-md transition-all duration-300 transform hover:scale-105">
          <div class="aspect-square rounded-xl overflow-hidden mb-2 bg-stone-100">
            <img src="${img}" alt="User Photo ${i + 1}" class="w-full h-full object-cover">
          </div>
          <p class="${isHandwritten ? 'font-hand text-lg text-slate-700' : 'text-xs text-slate-600'} font-medium">Memory #${i + 1}</p>
        </div>
      `).join('')}
    </div>
  </div>

  <script>
    function notifyParent() {
      const h = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'doodle-resize', height: h }, '*');
      }
    }
    window.addEventListener('load', notifyParent);
    window.addEventListener('resize', notifyParent);
    if (window.ResizeObserver) new ResizeObserver(notifyParent).observe(document.body);
  </script>
</body>
</html>`;

  return {
    html,
    vibe: params.vibe,
    model: 'gemini-2.5-flash-preview',
  };
}
