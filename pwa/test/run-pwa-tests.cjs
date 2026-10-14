/**
 * Automated Component & Contract Test Suite for Doodlebug PWA
 * Tests client contracts, canvas composite export logic, service worker rules, and UX boundaries.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('═══════════════════════════════════════════════════════');
console.log('🧪 DOODLEBUG PWA COMPONENT & CONTRACT TEST SUITE');
console.log('═══════════════════════════════════════════════════════\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

async function test(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
    failedTests++;
  }
}

const pwaDir = path.resolve(__dirname, '..');

async function runTestSuite() {
  // 1. Service Worker & Offline Caching Contracts
  console.log('--- 1. Service Worker & Offline Hygiene Contracts ---');

  const swContent = fs.readFileSync(path.join(pwaDir, 'public', 'sw.js'), 'utf8');

  await test('Service Worker excludes /health and /api/* from caching', () => {
    assert.match(swContent, /\/health/, 'Must check /health path');
    assert.match(swContent, /\/api\//, 'Must check /api/ path');
  });

  await test('Service Worker strictly isolates caching to same-origin requests', () => {
    assert.match(swContent, /requestUrl\.origin !== self\.location\.origin/, 'Must bypass cross-origin requests');
  });

  await test('Service Worker caps cache entries and prunes older hashed assets', () => {
    assert.match(swContent, /MAX_CACHED_ASSETS\s*=\s*35/, 'Must cap at 35 entries');
    assert.match(swContent, /trimCache/, 'Must define cache trimming function');
  });

  await test('PWA index.html skips service worker registration on localhost', () => {
    const indexHtml = fs.readFileSync(path.join(pwaDir, 'index.html'), 'utf8');
    assert.match(indexHtml, /localhost/, 'Must check localhost in dev skip');
    assert.match(indexHtml, /unregister/, 'Must unregister active worker on dev reload');
  });

  // 2. Manifest & Icon Display Compliance
  console.log('\n--- 2. PWA Manifest & Display Compliance ---');

  await test('Manifest has separate entries for any and maskable icon purposes', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(pwaDir, 'public', 'manifest.json'), 'utf8'));
    const icon192Any = manifest.icons.find((i) => i.sizes === '192x192' && i.purpose === 'any');
    const icon192Maskable = manifest.icons.find((i) => i.sizes === '192x192' && i.purpose === 'maskable');
    const icon512Any = manifest.icons.find((i) => i.sizes === '512x512' && i.purpose === 'any');
    const icon512Maskable = manifest.icons.find((i) => i.sizes === '512x512' && i.purpose === 'maskable');

    assert.ok(icon192Any, 'Must have 192x192 with purpose any');
    assert.ok(icon192Maskable, 'Must have 192x192 with purpose maskable');
    assert.ok(icon512Any, 'Must have 512x512 with purpose any');
    assert.ok(icon512Maskable, 'Must have 512x512 with purpose maskable');
  });

  await test('Apple touch icon exists and is linked in head', () => {
    assert.ok(fs.existsSync(path.join(pwaDir, 'public', 'apple-touch-icon.png')));
    const indexHtml = fs.readFileSync(path.join(pwaDir, 'index.html'), 'utf8');
    assert.match(indexHtml, /apple-touch-icon\.png/);
  });

  // 3. Canvas Export & Compositing Engine Contracts
  console.log('\n--- 3. Canvas Compositing Engine & Export Contracts ---');

  const exportContent = fs.readFileSync(path.join(pwaDir, 'src', 'components', 'canvasExport.ts'), 'utf8');

  await test('Canvas export accounts for delete button and icon padding in box width measurement', () => {
    assert.match(exportContent, /deleteBtnSpace\s*=\s*22/, 'Must account for delete button width');
    assert.match(exportContent, /iconSpace\s*=\s*18/, 'Must account for icon space');
    assert.match(exportContent, /padX\s*=\s*12/, 'Must account for horizontal padding');
    assert.match(exportContent, /maxLineWidth \+ padX \* 2 \+ iconSpace \+ deleteBtnSpace/);
  });

  await test('Canvas export preserves dot grid under erased drawing strokes via offscreen buffer', () => {
    assert.match(exportContent, /destination-out/, 'Eraser must use destination-out composite mode');
    assert.match(exportContent, /strokesCanvas/, 'Must render strokes to offscreen buffer before compositing over dot grid');
  });

  await test('Canvas export renders single-tap dot strokes faithfully with line segment offset', () => {
    assert.match(exportContent, /pts\.length === 1/, 'Must explicitly check for single-point dot stroke');
    assert.match(exportContent, /pts\[0\]\.x \+ 0\.1/, 'Must add 0.1 offset to render round lineCap dot');
  });

  await test('Canvas export preloads sticker images concurrently in parallel with 5s timeout', () => {
    assert.match(exportContent, /Promise\.all/, 'Must preload images concurrently via Promise.all');
    assert.match(exportContent, /setTimeout\(\(\) => resolve\(false\),\s*5000\)/, 'Must bound image preload to 5 seconds');
  });

  // 4. Client Networking & Error Handling Contracts
  console.log('\n--- 4. Client Networking & Timeout Transformation Contracts ---');

  const clientContent = fs.readFileSync(path.join(pwaDir, 'src', 'services', 'workerClient.ts'), 'utf8');

  await test('workerClient transforms AbortError into friendly timeout messages for generate and publish', () => {
    assert.match(clientContent, /AbortError/, 'Must catch AbortError');
    assert.match(clientContent, /Generation timed out after 60 seconds/, 'Friendly message for generate');
    assert.match(clientContent, /Publishing timed out after 30 seconds/, 'Friendly message for publish');
  });

  await test('workerClient never triggers fake success on server error responses (401, 403, 429)', () => {
    assert.match(clientContent, /if \(!response\.ok\)/, 'Must check response.ok');
    assert.match(clientContent, /throw new Error/, 'Must throw on server error response');
  });

  // 5. Canvas Component UX & Dragging Churn Contracts
  console.log('\n--- 5. Canvas Component UX & Dragging Churn Contracts ---');

  const canvasContent = fs.readFileSync(path.join(pwaDir, 'src', 'components', 'Canvas.tsx'), 'utf8');
  const appContent = fs.readFileSync(path.join(pwaDir, 'src', 'App.tsx'), 'utf8');
  const noteItemContent = fs.readFileSync(path.join(pwaDir, 'src', 'components', 'CanvasNoteItem.tsx'), 'utf8');
  const stickerItemContent = fs.readFileSync(path.join(pwaDir, 'src', 'components', 'CanvasStickerItem.tsx'), 'utf8');

  await test('Canvas specifies touch-action: none on container and canvas element', () => {
    assert.match(canvasContent, /touchAction:\s*'none'/);
    assert.match(canvasContent, /touch-none/);
  });

  await test('Note and sticker buttons stop pointer event propagation to avoid unwanted drag activation', () => {
    assert.match(noteItemContent, /e\.stopPropagation\(\)/);
    assert.match(stickerItemContent, /e\.stopPropagation\(\)/);
  });

  await test('Canvas uses stable refs for update handlers so dragging does not re-subscribe listeners on move', () => {
    assert.match(canvasContent, /onUpdateTextNoteRef\.current = onUpdateTextNote/);
    assert.match(canvasContent, /onUpdateStickerRef\.current = onUpdateSticker/);
    assert.match(canvasContent, /useEffect\(\(\) => \{[\s\S]*?\}, \[dragItem\]\)/, 'Window drag effect must depend only on [dragItem]');
  });

  await test('App wraps note and sticker update handlers in React.useCallback', () => {
    assert.match(appContent, /handleUpdateTextNote = React\.useCallback/);
    assert.match(appContent, /handleDeleteTextNote = React\.useCallback/);
    assert.match(appContent, /handleUpdateSticker = React\.useCallback/);
    assert.match(appContent, /handleDeleteSticker = React\.useCallback/);
  });

  // 6. Photo Upload Pre-Flight Validation & On-Device Optimization Contracts
  console.log('\n--- 6. Photo Upload Pre-Flight Validation & On-Device Optimization Contracts ---');

  const optimizerPath = path.join(pwaDir, 'src', 'services', 'imageOptimizer.ts');
  const optimizerContent = fs.readFileSync(optimizerPath, 'utf8');
  const storageContent = fs.readFileSync(path.join(pwaDir, 'src', 'services', 'storageService.ts'), 'utf8');
  const modalContent = fs.readFileSync(path.join(pwaDir, 'src', 'components', 'StickerTrayModal.tsx'), 'utf8');
  const storageRulesPath = path.resolve(pwaDir, '..', 'storage.rules');
  const storageRulesContent = fs.existsSync(storageRulesPath) ? fs.readFileSync(storageRulesPath, 'utf8') : '';

  let imageOptimizer;
  try {
    const { pathToFileURL } = require('url');
    imageOptimizer = await import(pathToFileURL(optimizerPath).href);
  } catch (_err) {
    const ts = require('typescript');
    const transpiled = ts.transpileModule(optimizerContent, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
    });
    const mod = { exports: {} };
    const fn = new Function('exports', 'module', 'require', transpiled.outputText);
    fn(mod.exports, mod, require);
    imageOptimizer = mod.exports;
  }
  const {
    validateImageFile,
    validateImageContent,
    sniffImageMimeTypeFromBuffer,
    inferMimeType,
    calculateTargetDimensions,
    optimizeImageForUpload,
    ALLOWED_IMAGE_TYPES,
    MAX_STORAGE_FILE_SIZE,
  } = imageOptimizer;

  await test('validateImageFile rejects SVG files (.svg, .svgz, image/svg+xml) to prevent XSS / script injection', () => {
    assert.match(optimizerContent, /image\/svg\+xml/, 'Must check for SVG MIME type');
    assert.match(optimizerContent, /\.endsWith\('\.svg'\)/, 'Must check for .svg extension');
    assert.match(optimizerContent, /security reasons/i, 'Must cite security reasons');

    const svgRes = validateImageFile({ name: 'logo.svg', size: 1024, type: 'image/svg+xml' });
    assert.strictEqual(svgRes.valid, false);
    assert.match(svgRes.error, /security reasons/i);

    const svgzRes = validateImageFile({ name: 'logo.svgz', size: 1024, type: '' });
    assert.strictEqual(svgzRes.valid, false);

    const disguisedSvg = validateImageFile({ name: 'logo.svg', size: 1024, type: 'application/octet-stream' });
    assert.strictEqual(disguisedSvg.valid, false);
  });

  await test('validateImageFile rejects non-image formats (PDF, executable, plain text, scripts)', () => {
    const pdfRes = validateImageFile({ name: 'doc.pdf', size: 2048, type: 'application/pdf' });
    assert.strictEqual(pdfRes.valid, false);

    const exeRes = validateImageFile({ name: 'run.exe', size: 2048, type: 'application/octet-stream' });
    assert.strictEqual(exeRes.valid, false);

    const txtRes = validateImageFile({ name: 'notes.txt', size: 500, type: 'text/plain' });
    assert.strictEqual(txtRes.valid, false);
  });

  await test('validateImageFile detects MIME types from extensions when mobile browser leaves file.type empty', () => {
    const jpgRes = validateImageFile({ name: 'camera_shot.JPG', size: 5000000, type: '' });
    assert.strictEqual(jpgRes.valid, true);
    assert.strictEqual(jpgRes.detectedType, 'image/jpeg');

    const jpegRes = validateImageFile({ name: 'photo.jpeg', size: 1000000, type: '' });
    assert.strictEqual(jpegRes.valid, true);
    assert.strictEqual(jpegRes.detectedType, 'image/jpeg');

    const pngRes = validateImageFile({ name: 'screenshot.png', size: 1000000, type: '' });
    assert.strictEqual(pngRes.valid, true);
    assert.strictEqual(pngRes.detectedType, 'image/png');

    const webpRes = validateImageFile({ name: 'sticker.webp', size: 800000, type: '' });
    assert.strictEqual(webpRes.valid, true);
    assert.strictEqual(webpRes.detectedType, 'image/webp');
  });

  await test('validateImageFile normalizes mobile camera MIME aliases (image/jpg, pjpeg, x-png, charset params, application/octet-stream)', () => {
    // Android Downloads / Files picker behavior (application/octet-stream with .jpg name)
    const androidRes = validateImageFile({ name: 'IMG_2024.jpg', size: 4000000, type: 'application/octet-stream' });
    assert.strictEqual(androidRes.valid, true, 'Must accept Android application/octet-stream when filename is .jpg');
    assert.strictEqual(androidRes.detectedType, 'image/jpeg');

    // Camera alias image/jpg
    const jpgAlias = validateImageFile({ name: 'photo.jpg', size: 3000000, type: 'image/jpg' });
    assert.strictEqual(jpgAlias.valid, true);
    assert.strictEqual(jpgAlias.detectedType, 'image/jpeg');

    // Progressive JPEG image/pjpeg
    const pjpegAlias = validateImageFile({ name: 'photo.jpg', size: 3000000, type: 'image/pjpeg' });
    assert.strictEqual(pjpegAlias.valid, true);
    assert.strictEqual(pjpegAlias.detectedType, 'image/jpeg');

    // Legacy PNG image/x-png
    const xpngAlias = validateImageFile({ name: 'shot.png', size: 2000000, type: 'image/x-png' });
    assert.strictEqual(xpngAlias.valid, true);
    assert.strictEqual(xpngAlias.detectedType, 'image/png');

    // MIME type with charset or other parameters
    const paramRes = validateImageFile({ name: 'photo.jpg', size: 1000000, type: 'image/jpeg; charset=utf-8' });
    assert.strictEqual(paramRes.valid, true);
    assert.strictEqual(paramRes.detectedType, 'image/jpeg');
  });

  await test('validateImageFile rejects animated GIFs > 5MB to preserve animation frames without upload failure', () => {
    const bigGif = validateImageFile({ name: 'heavy.gif', size: 7 * 1024 * 1024, type: 'image/gif' });
    assert.strictEqual(bigGif.valid, false);
    assert.match(bigGif.error, /5MB/);

    const smallGif = validateImageFile({ name: 'tiny.gif', size: 2 * 1024 * 1024, type: 'image/gif' });
    assert.strictEqual(smallGif.valid, true);
    assert.strictEqual(smallGif.detectedType, 'image/gif');
  });

  await test('validateImageFile rejects files > 30MB (memory guardrail) and empty files (0 bytes)', () => {
    const hugePhoto = validateImageFile({ name: 'raw_dslr.jpg', size: 35 * 1024 * 1024, type: 'image/jpeg' });
    assert.strictEqual(hugePhoto.valid, false);
    assert.match(hugePhoto.error, /30MB/);

    const emptyFile = validateImageFile({ name: 'corrupt.jpg', size: 0, type: 'image/jpeg' });
    assert.strictEqual(emptyFile.valid, false);
    assert.match(emptyFile.error, /empty/i);
  });

  await test('sniffImageMimeTypeFromBuffer correctly identifies raster magic bytes and detects disguised vectors', () => {
    // JPEG magic bytes: FF D8 FF
    const jpegBuf = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    assert.strictEqual(sniffImageMimeTypeFromBuffer(jpegBuf), 'image/jpeg');

    // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
    const pngBuf = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    assert.strictEqual(sniffImageMimeTypeFromBuffer(pngBuf), 'image/png');

    // GIF magic bytes: GIF89a / GIF87a
    const gifBuf = new Uint8Array(Buffer.from('GIF89a...'));
    assert.strictEqual(sniffImageMimeTypeFromBuffer(gifBuf), 'image/gif');

    // WebP magic bytes: RIFF....WEBP
    const webpBuf = new Uint8Array(Buffer.concat([Buffer.from('RIFF'), Buffer.from([0, 0, 0, 0]), Buffer.from('WEBP')]));
    assert.strictEqual(sniffImageMimeTypeFromBuffer(webpBuf), 'image/webp');

    // SVG vector disguised in buffer
    const svgBuf = new Uint8Array(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'));
    assert.strictEqual(sniffImageMimeTypeFromBuffer(svgBuf), 'image/svg+xml');

    const xmlSvgBuf = new Uint8Array(Buffer.from('<?xml version="1.0"?><svg></svg>'));
    assert.strictEqual(sniffImageMimeTypeFromBuffer(xmlSvgBuf), 'image/svg+xml');

    // Random non-image binary / text
    const textBuf = new Uint8Array(Buffer.from('Hello world! echo 123'));
    assert.strictEqual(sniffImageMimeTypeFromBuffer(textBuf), '');
  });

  await test('validateImageContent validates actual byte buffers and rejects disguised non-image files', async () => {
    // Valid JPEG blob
    const validJpegBlob = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])], { type: 'image/jpeg' });
    const jpegResult = await validateImageContent(validJpegBlob);
    assert.strictEqual(jpegResult.valid, true);
    assert.strictEqual(jpegResult.detectedType, 'image/jpeg');

    // Disguised SVG named as JPEG
    const disguisedSvgBlob = new Blob([Buffer.from('<svg viewBox="0 0 100 100"><circle r="50"/></svg>')], { type: 'image/jpeg' });
    const svgResult = await validateImageContent(disguisedSvgBlob);
    assert.strictEqual(svgResult.valid, false);
    assert.match(svgResult.error, /security reasons/i);

    // Disguised shell script named as PNG
    const disguisedScriptBlob = new Blob([Buffer.from('#!/bin/bash\nrm -rf /')], { type: 'image/png' });
    const scriptResult = await validateImageContent(disguisedScriptBlob);
    assert.strictEqual(scriptResult.valid, false);
    assert.match(scriptResult.error, /not a recognized raster image/i);
  });

  await test('calculateTargetDimensions correctly scales down camera photos preserving aspect ratio', () => {
    const landscape = calculateTargetDimensions(4000, 3000, 1600);
    assert.strictEqual(landscape.width, 1600);
    assert.strictEqual(landscape.height, 1200);

    const portrait = calculateTargetDimensions(3000, 4000, 1600);
    assert.strictEqual(portrait.width, 1200);
    assert.strictEqual(portrait.height, 1600);

    const small = calculateTargetDimensions(800, 600, 1600);
    assert.strictEqual(small.width, 800);
    assert.strictEqual(small.height, 600);

    const square = calculateTargetDimensions(2400, 2400, 1600);
    assert.strictEqual(square.width, 1600);
    assert.strictEqual(square.height, 1600);

    // Boundary edge cases (0 or negative)
    const zero = calculateTargetDimensions(0, 0, 1600);
    assert.strictEqual(zero.width, 1);
    assert.strictEqual(zero.height, 1);
  });

  await test('optimizeImageForUpload guarantees returned File has valid raster MIME type matching storage.rules', async () => {
    // Input file with empty MIME type (common on mobile)
    const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    const fileWithEmptyType = new File([jpegBytes], 'mobile_photo.jpg', { type: '' });

    const optimized = await optimizeImageForUpload(fileWithEmptyType);
    assert.ok(optimized instanceof File);
    assert.strictEqual(optimized.type, 'image/jpeg', 'Returned File must have normalized image/jpeg type, never empty');

    // Animated GIF under 5MB preserves GIF type
    const gifBytes = new Uint8Array(Buffer.from('GIF89a\x01\x00\x01\x00'));
    const gifFile = new File([gifBytes], 'sticker.gif', { type: '' });
    const optimizedGif = await optimizeImageForUpload(gifFile);
    assert.strictEqual(optimizedGif.type, 'image/gif', 'Returned GIF must have valid image/gif type');
  });

  await test('storage.rules contract alignment: allowed types and 5MB quota match exactly between client and backend rules', () => {
    if (storageRulesContent) {
      assert.match(storageRulesContent, /5\s*\*\s*1024\s*\*\s*1024/, 'storage.rules must enforce 5MB limit');
      assert.match(storageRulesContent, /image\/\(jpeg\|png\|webp\|gif\)/, 'storage.rules must enforce raster MIME types');
    }
    assert.match(optimizerContent, /5\s*\*\s*1024\s*\*\s*1024/, 'imageOptimizer must match 5MB storage quota');
    assert.match(optimizerContent, /'image\/jpeg',\s*'image\/png',\s*'image\/webp',\s*'image\/gif'/, 'imageOptimizer must match allowed formats');
  });

  await test('storageService executes pre-flight validation, content validation, and fallback metadata before uploadBytes', () => {
    assert.match(storageContent, /validateImageFile\(file\)/, 'storageService must run pre-flight validation');
    assert.match(storageContent, /validateImageContent\(file\)/, 'storageService must run content verification');
    assert.match(storageContent, /optimizeImageForUpload\(file/, 'storageService must optimize image before upload');
    assert.match(storageContent, /optimizedFile\.size > MAX_STORAGE_FILE_SIZE/, 'storageService must guard 5MB limit prior to uploadBytes');
    assert.match(storageContent, /contentType/, 'storageService must specify contentType in metadata');
    assert.match(storageContent, /uploadBytes\(storageRef,\s*optimizedFile/, 'storageService must upload the optimized file');
  });

  await test('StickerTrayModal validates immediately upon file selection and displays optimization status', () => {
    assert.match(modalContent, /accept="image\/jpeg,image\/png,image\/webp,image\/gif"/, 'Input must restrict accept attribute to raster formats');
    assert.match(modalContent, /validateImageFile\(file\)/, 'StickerTrayModal must validate on file selection');
    assert.match(modalContent, /validateImageContent\(file\)/, 'StickerTrayModal must validate content on file selection');
    assert.match(modalContent, /uploadStatus/, 'StickerTrayModal must track upload and optimization status');
    assert.match(modalContent, /Auto-resized & optimized/, 'UI must communicate auto-resize optimization');
  });

  console.log('\n═══════════════════════════════════════════════════════');
  console.log(`📊 PWA TEST RESULTS: ${passedTests}/${totalTests} PASSED (${failedTests} FAILED)`);
  console.log('═══════════════════════════════════════════════════════\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
