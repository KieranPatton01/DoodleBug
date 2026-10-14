# Doodlebug 🐛🎨
> **Mobile-First Doodle-to-Code Personal Website Builder**  
> Powered by Multimodal Gemini Flash, Cloudflare Workers, Firebase Auth/Storage, and GitHub Pages.

---

## 1. Executive Summary & Vision

**Doodlebug** is a personal website builder and mobile-first Progressive Web App (PWA) designed as a fun, creative canvas for your partner.

She opens the PWA on her phone, sketches on a retro MS-Paint-style canvas, drops photos, types handwritten sticky notes, chooses a vibe, and taps **"Vibecode"**. Multimodal **Gemini Flash** translates her doodle into a modern, responsive HTML5/Tailwind component, previews it live inside a mobile sandbox iframe, and commits it directly to a public GitHub Pages repository powering her live custom domain.

```
┌────────────────────────────────────────────────────────┐
│                   GIRLFRIEND'S PHONE                   │
│                                                        │
│  [ Retro Canvas Pad ]  ─>  [ Photo Tray ]  ─>  [ Vibe ]│
│   (touch-action:none)     (Firebase Storage)   (Pills) │
│                            │                           │
│                            ▼                           │
│                 Tap "VIBECODE" ✨                      │
└────────────────────────────┬───────────────────────────┘
                             │
                             │ HTTPS + Firebase ID Token
                             ▼
┌────────────────────────────────────────────────────────┐
│               CLOUDFLARE WORKER GATEWAY                │
│             (Zero Client Secrets Fortress)             │
│                                                        │
│  1. Verifies Bearer JWT & sub === ALLOWED_FIREBASE_UID │
│  2. Calls Gemini Flash with doodle snapshot + photos   │
│  3. Enforces strict generation guardrails & sanitizing │
│  4. Commits approved HTML to GitHub Pages via REST API │
│                                                        │
│  Secrets Stored Securely in Cloudflare:                │
│  • GEMINI_API_KEY                                      │
│  • GITHUB_PAT (Contents: Read/Write)                   │
│  • ALLOWED_FIREBASE_UID                                │
└──────────────────────┬───────────────────┬─────────────┘
                       │                   │
         Raw HTML      │                   │ PUT /contents/canvas.html
       (Local Preview) │                   │ (Commit to repo)
                       ▼                   ▼
┌───────────────────────────────┐ ┌──────────────────────┐
│       PWA SANDBOX MODAL       │ │  PUBLIC GITHUB PAGES │
│                               │ │   yourcustomdomain   │
│ • 2-Second In-App Review      │ │                      │
│ • Viewport: Phone/Tablet/Desk │ │ • index.html (shell) │
│ • "Publish to Live Site"      │ │ • canvas.html (stage)│
└───────────────────────────────┘ └──────────────────────┘
```

---

## 2. Critical Security & Zero-Secret Constraints

Because both the target website and PWA source code live in a **public GitHub repository**:
1. **Zero Client Secrets:** The PWA contains **NO** GitHub Personal Access Tokens (PAT) and **NO** Gemini API keys. Anyone inspecting browser dev tools, source files, or network requests finds zero confidential credentials.
2. **Cloudflare Worker as Secure Proxy:** All sensitive operations (calling Gemini Flash inference and committing to GitHub) route strictly through the Cloudflare Worker gateway.
3. **Encrypted Secret Storage:** The Cloudflare Worker holds `GEMINI_API_KEY`, `GITHUB_PAT`, `ALLOWED_FIREBASE_UID`, and repository configuration as encrypted environment secrets.
4. **Identity Lockdown:** The Worker validates the incoming `Authorization: Bearer <firebase-id-token>`. The token is cryptographically verified against Google's public JWKS certificates. If the token is invalid or the user's `sub` claim does not match `ALLOWED_FIREBASE_UID`, the Worker immediately returns `403 Forbidden`.
5. **Least-Privilege GitHub PAT:** The GitHub token is a fine-grained Personal Access Token scoped *strictly* to `Contents: Read and Write` for this specific repository only.

---

## 3. Project Structure

```
doodlebug/
├── live-site/                # Live Public GitHub Pages Web Shell
│   ├── index.html            # Indestructible shell with header/footer & responsive iframe
│   ├── canvas.html           # Sandboxed document overwritten by Gemini Flash commits
│   ├── CNAME                 # Custom domain configuration (yourcustomdomain.com)
│   ├── styles.css            # Shell styling & dot grid aesthetic
│   └── iframe-resizer.js     # Responsive height auto-resizing script
│
├── worker/                   # Cloudflare Worker Secure Gateway
│   ├── package.json
│   ├── wrangler.toml         # Worker routing & environment configuration
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts          # Router & CORS preflight handler
│   │   ├── auth.ts           # Firebase JWT verification & UID lockdown
│   │   ├── gemini.ts         # Gemini Flash Multimodal integration & guardrails
│   │   ├── github.ts         # GitHub Contents REST API commit handler
│   │   └── types.ts          # TypeScript interfaces
│   └── test/                 # Standalone Worker Contract Test Suite
│       ├── run-tests.js      # Zero-dependency test runner
│       ├── gemini-test-helper.js
│       ├── github-test-helper.js
│       └── router-test-helper.js
│
├── pwa/                      # Mobile-First PWA Editor
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── index.html            # Mobile viewport setup (touch-action: none on canvas, accessibility zoom enabled)
│   ├── public/
│   │   ├── manifest.json     # PWA standalone manifest
│   │   ├── sw.js             # Service Worker for offline installation
│   │   └── favicon.svg       # Cute Doodlebug app icon
│   └── src/
│       ├── App.tsx           # Main application state orchestration
│       ├── config/
│       │   └── firebase.ts   # Firebase client SDK initialization (Auth + Storage)
│       ├── services/
│       │   ├── workerClient.ts   # Secure client for /api/generate & /api/publish
│       │   └── storageService.ts # Direct photo upload to Firebase Storage
│       └── components/
│           ├── Header.tsx        # Top bar with vibe indicator & Vibecode action
│           ├── Canvas.tsx        # HTML5 touch canvas (touch-action: none, Retina, notes)
│           ├── Toolbar.tsx       # Thumb-friendly bottom mobile toolbar
│           ├── ColorPickerModal.tsx  # Aesthetic pastel & retro color palettes
│           ├── BrushPickerModal.tsx  # Fine, medium, bold, and marker sizes
│           ├── TextModal.tsx         # Handwritten Caveat sticky note creator
│           ├── StickerTrayModal.tsx  # Firebase Storage photo uploader & placer
│           ├── VibeSelector.tsx      # Vibe pills (Handwritten, Modern, Neon, etc.)
│           ├── PreviewModal.tsx      # In-app sandbox iframe review & publish modal
│           ├── AuthModal.tsx         # Firebase sign-in & instant demo login
│           └── SettingsModal.tsx     # Gateway URL and connection diagnostics
│
├── scripts/
│   └── test-all.js           # End-to-end repository verification & security audit
├── index.html                # Root shell for direct root GitHub Pages deployment
├── canvas.html               # Root stage target
└── CNAME                     # Root custom domain file
```

---

## 4. Phase-by-Phase Implementation Details

### Phase 1: Public Web Shell (`live-site/`)
- **Indestructible Architecture:**
  The outer `index.html` hosts a fixed, stylish header (profile emoji, status badge, social links) and footer ("made with love ♡").
- **Sandboxed Stage:**
  `<iframe src="canvas.html" id="doodle-stage" class="w-full border-none"></iframe>`
  Because all Gemini-generated code lives inside `canvas.html`, no CSS conflicts, font overrides, or custom scripts can ever break the outer shell.
- **Auto-Resizing Protocol:**
  `iframe-resizer.js` listens to `postMessage({ type: 'doodle-resize', height: ... })` from `canvas.html` and continuously synchronizes iframe height with zero layout jumps or double scrollbars.
- **CNAME:** Pre-configured for custom domain routing on GitHub Pages.

### Phase 2: Cloudflare Worker Gateway (`worker/`)
- **`POST /api/generate`:**
  1. Validates `Authorization: Bearer <firebase-id-token>`.
  2. Verifies cryptographic RSA signature against Google's public JWKS certificates.
  3. Enforces that `token.sub === env.ALLOWED_FIREBASE_UID` (returns `403 Forbidden` if UID is unauthorized).
  4. Formats multimodal prompt with doodle snapshot (Base64) + attached Firebase photo URLs.
  5. Enforces generation guardrails:
     - Standalone `<!DOCTYPE html>` with `<head>` and `<body>`
     - Tailwind CSS CDN `<script src="https://cdn.tailwindcss.com"></script>`
     - Google Fonts typography (`Caveat` / `Kalam` for handwritten vibes)
     - Exact Firebase photo URLs inside responsive `<img>` tags (zero base64 placeholders)
     - Delightful micro-interactions (`hover:scale-105 duration-200`)
     - Auto-resizing notification script
     - Strips markdown fences (` ```html `)
  6. Returns sanitized HTML to PWA.
- **`POST /api/publish`:**
  1. Validates `Authorization: Bearer <firebase-id-token>` and UID lockdown.
  2. Queries `GET /repos/{owner}/{repo}/contents/{path}?ref={branch}` to acquire the existing blob SHA.
  3. Safe UTF-8 Base64 encodes the approved HTML.
  4. Commits directly to `canvas.html` on GitHub via `PUT /repos/{owner}/{repo}/contents/{path}`.
  5. Returns commit SHA and GitHub link.

### Phase 3: Mobile PWA Canvas (`pwa/`)
- **Mobile Touch Canvas:**
  Configured with `touch-action: none` and `overscroll-behavior: none` to guarantee that finger drawing never triggers browser pull-to-refresh or page scrolling.
- **High-DPI Support:** Backing store dynamically scales by `window.devicePixelRatio`.
- **Thumb-Friendly Toolbar:** Docked at the bottom of the phone screen for single-thumb tool switching (Pen, Highlighter, Eraser, Colors, Sizing).
- **Draggable Handwritten Notes:** Place custom notes styled with Google Font Caveat anywhere on the canvas.
- **Image / Sticker Tray:** Uploads photos taken with the phone camera directly to **Firebase Storage** (5 GB free tier) and places scalable photo cards on the canvas.
- **Vibe Selector:** Pill buttons for:
  - 🌸 `Cute Handwritten`
  - ✨ `Default Modern`
  - 🍬 `Pastel Aesthetic`
  - ⚡ `Dark Mode Neon`
  - 🕹️ `Retro 90s Web`
  - 📰 `Minimal Editorial`

### Phase 4: Preview & Publish Pipeline
- **Vibecode Button:** Captures the full canvas composite (strokes, photos, text notes) and sends it to the Cloudflare Worker.
- **In-App Sandbox Modal:** Renders the returned HTML snippet inside an isolated iframe in **under 2 seconds**. Includes phone (390px), tablet (640px), and desktop viewports, plus an HTML code inspector tab.
- **One-Click Publish:** Approving the preview commits the code to `canvas.html` on the live GitHub Pages site in one tap.

---

## 5. Deployment & Setup Guide

### Step 1: Cloudflare Worker Gateway

1. Navigate to `worker/`:
   ```bash
   cd worker
   npm install
   ```
2. Configure your secrets securely using Wrangler:
   ```bash
   # Your Google Gemini API Key
   npx wrangler secret put GEMINI_API_KEY

   # Fine-grained GitHub PAT with Contents: Read & Write
   npx wrangler secret put GITHUB_PAT

   # Your girlfriend's Firebase User UID (found in Firebase Console -> Authentication)
   npx wrangler secret put ALLOWED_FIREBASE_UID

   # Your Firebase Project ID
   npx wrangler secret put FIREBASE_PROJECT_ID
   ```
3. Update non-sensitive repository settings in `worker/wrangler.toml`:
   ```toml
   [vars]
   GITHUB_OWNER = "your-github-username"
   GITHUB_REPO = "your-live-repo-name"
   GITHUB_BRANCH = "main"
   GITHUB_CANVAS_PATH = "canvas.html"
   # Restrict CORS to your PWA domain in production (comma-separated for dev + prod)
   CORS_ORIGIN = "https://your-pwa-domain.web.app"
   ```
4. Deploy the Worker:
   ```bash
   npx wrangler deploy
   ```
   Note your worker URL (e.g. `https://doodlebug-gateway.your-subdomain.workers.dev`).

### Step 2: Live Public Website (GitHub Pages)

1. Enable GitHub Pages on your repository:
   - Go to **Repository Settings** -> **Pages**.
   - Source: **Deploy from a branch** -> Branch: **`main`** -> Folder: **`/ (root)`**.
2. Configure Custom Domain:
   - Edit `CNAME` with your custom domain (e.g., `lily.yourdomain.com`).
   - Add a CNAME DNS record in your DNS provider pointing to `<your-username>.github.io`.

### Step 3: Firebase Auth & Storage Setup

1. In the [Firebase Console](https://console.firebase.google.com/):
   - Enable **Authentication** -> Sign-in methods: **Email/Password** and/or **Google**.
   - Note your user UID from the Authentication tab and set it as `ALLOWED_FIREBASE_UID` in Cloudflare Worker (`npx wrangler secret put ALLOWED_FIREBASE_UID`).
   - Enable **Storage** (Note: Google Cloud / Firebase requires the pay-as-you-go Blaze plan for newly created default buckets, though Spark tier free usage quotas still apply).
2. Configure and deploy storage rules:
   - Edit [`storage.rules`](storage.rules) and replace `<ALLOWED_FIREBASE_UID>` with your user's actual Firebase User UID.
   - Deploy the rules using Firebase CLI (linked via `firebase.json`):
     ```bash
     firebase deploy --only storage
     ```
   The hardened rules enforce safe raster images (`jpeg|png|webp|gif`), 5MB max size, and drops SVG scripts:
     ```javascript
     rules_version = '2';
     service firebase.storage {
       match /b/{bucket}/o {
         match /doodle_photos/{photoId} {
           // Allow direct image GET by ID for published stage pages, disallow listing/enumeration
           allow get: if true;
           allow list: if false;
           allow write: if request.auth != null
                        && request.auth.uid == '<ALLOWED_FIREBASE_UID>'
                        && request.resource.size <= 5 * 1024 * 1024
                        && request.resource.contentType.matches('image/(jpeg|png|webp|gif)');
         }
       }
     }
     ```
   - Deploy-time UID substitution: Replace `<ALLOWED_FIREBASE_UID>` with your actual Firebase UID when deploying, or use CI environment variable substitution:
     ```bash
     sed -i "s/<ALLOWED_FIREBASE_UID>/$ALLOWED_FIREBASE_UID/g" storage.rules
     firebase deploy --only storage
     ```
   - Configure Firebase Storage CORS to permit high-resolution canvas snapshot export in the PWA editor:
     ```bash
     # Apply cors.json to your storage bucket
     gcloud storage buckets update gs://<YOUR_FIREBASE_PROJECT_ID>.appspot.com --cors-file=cors.json
     ```

### Step 3b: Gateway Rate Limits & HTML Validation Rules

The Cloudflare Worker Gateway enforces defense-in-depth protection:
- **Rate Limits:**
  - **Unauthenticated Flood Protection:** Max 60 requests per minute per client IP.
  - **Code Generation Quota:** Max 10 generation requests per minute per authenticated UID to manage Gemini costs.
  - **Publish Quota:** Max 15 publish commits per minute per authenticated UID.
- **Strict HTML Validation Rules:**
  - Complete standalone document required (`<!DOCTYPE html>`, `<html>`, `</html>`, size <= 1MB).
  - External scripts strictly restricted to official Tailwind CDN (`https://cdn.tailwindcss.com`).
  - No `<meta http-equiv="refresh">` redirect attacks.
  - No `<base>` or `<form>` tags.
  - No `javascript:` pseudo-protocol URIs.
  - No hazardous inline event handlers on HTML elements (`onerror=`, `onload=`, `onclick=`).
  - Hazardous JavaScript APIs blocked in inline scripts: `localStorage`, `sessionStorage`, `document.cookie`, `eval()`, `top.location`, `window.top`, `parent.location`. Interactive widgets use in-memory variables.

### Step 4: Mobile PWA Deployment

1. Navigate to `pwa/`:
   ```bash
   cd pwa
   npm install
   npm run build
   ```
2. Set environment variables in `.env` (see `.env.example`):
   ```env
   VITE_WORKER_URL=https://doodlebug-gateway.your-subdomain.workers.dev
   VITE_FIREBASE_API_KEY=your-firebase-api-key
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
   VITE_FIREBASE_APP_ID=your-firebase-app-id
   ```
3. Deploy the PWA to Firebase Hosting, Cloudflare Pages, or Vercel.
4. On your girlfriend's phone (Safari on iOS or Chrome on Android):
   - Open the PWA URL.
   - Tap **Share** -> **"Add to Home Screen"**.
   - The app now opens full-screen without address bars, exactly like a native drawing app!

---

## 6. Verification & Automated Test Suite

A standalone test suite is included to verify all contracts, guardrails, and cryptographic security rules:

```bash
# Run Worker contract & auth tests
node worker/test/run-tests.js

# Run full project end-to-end security audit
node scripts/test-all.js
```

### Verified Test Cases:
- **Zero Client Secrets:** Scans client source code to verify zero leaked PATs or Gemini keys.
- **Identity Lockdown:** Validates that tokens with unauthorized UIDs return `403 Forbidden`.
- **JWT Cryptography:** Verifies RS256 signatures, expiration checks, and audience validation.
- **Gemini Guardrails:** Validates standalone HTML5, Tailwind CDN injection, Google Fonts, photo URL preservation, and iframe auto-resizing protocol.
- **GitHub REST API:** Verifies SHA resolution, UTF-8 Base64 encoding of unicode/emojis, and committer attribution.
- **Mobile UX Constraints:** Verifies `touch-action: none` and PWA standalone manifest parameters.

---

## 7. License

MIT. Made with love for creative minds! 🌸
