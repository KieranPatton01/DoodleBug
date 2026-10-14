/**
 * HTML Validator for Doodlebug Canvas Output
 * Enforces security guardrails, structural integrity, and safe script execution
 * inside sandboxed iframes.
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateCanvasHtml(html: string): ValidationResult {
  if (!html || typeof html !== 'string' || !html.trim()) {
    return { valid: false, error: 'Missing required field: html' };
  }

  if (html.length > 1_000_000) {
    return { valid: false, error: 'HTML exceeds maximum allowed size (1MB)' };
  }

  const lower = html.toLowerCase();
  const hasOpening = lower.includes('<!doctype html') || lower.includes('<html');
  const hasClosing = lower.includes('</html>');

  if (!hasOpening || !hasClosing) {
    return {
      valid: false,
      error: 'Invalid HTML: must contain a complete HTML document with <!DOCTYPE html>, <html>, and closing </html>',
    };
  }

  // Reject meta refresh redirects
  if (/<meta\b[^>]*\bhttp-equiv\s*=\s*["']?refresh["']?/i.test(html)) {
    return { valid: false, error: 'Invalid HTML: meta refresh redirect is not permitted.' };
  }

  // Ensure every <script> has a corresponding closing </script>
  const openScriptMatches = html.match(/<script\b/gi) || [];
  const closeScriptMatches = html.match(/<\/script>/gi) || [];
  if (openScriptMatches.length !== closeScriptMatches.length) {
    return {
      valid: false,
      error: 'Invalid HTML: mismatched or unclosed <script> tags detected.',
    };
  }

  // Check markup outside <script> tags
  const htmlWithoutScripts = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');

  // Reject hazardous inline event handlers on HTML elements (onerror=, onload=, onclick=, etc.)
  // Note: Scanning htmlWithoutScripts ensures valid JS like 'window.onload = ...' inside <script> is NOT rejected!
  if (/\bon[a-z]+\s*=/i.test(htmlWithoutScripts)) {
    return { valid: false, error: 'Invalid HTML: hazardous inline event handlers detected on HTML elements.' };
  }

  // Reject javascript:, vbscript:, and data:text/html URIs in markup attributes
  if (/\b(?:href|src|action|data)\s*=\s*["']?\s*(?:javascript|vbscript|data\s*:\s*text\/html)\s*:/i.test(htmlWithoutScripts)) {
    return { valid: false, error: 'Invalid HTML: script pseudo-protocol URIs are not permitted.' };
  }

  // Reject <base>, <form>, <iframe>, <object>, and <embed> tags in canvas components
  if (/<(?:base|form|iframe|object|embed)\b/i.test(htmlWithoutScripts)) {
    return { valid: false, error: 'Invalid HTML: <base>, <form>, <iframe>, <object>, and <embed> elements are not permitted in canvas components.' };
  }

  // Inspect <script> tags:
  // External scripts: only official Tailwind CDN is permitted
  // Inline scripts: dangerous redirects, eval, Function constructor, and storage APIs are blocked
  const scriptTagRegex = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = scriptTagRegex.exec(html)) !== null) {
    const attrs = match[1];
    const scriptBody = match[2];

    // Check src attribute with support for double quotes, single quotes, or unquoted values
    const srcMatch = attrs.match(/\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i);
    if (srcMatch) {
      const src = (srcMatch[1] || srcMatch[2] || srcMatch[3] || '').trim();
      const isAllowedSrc =
        src === 'https://cdn.tailwindcss.com' ||
        src.startsWith('https://cdn.tailwindcss.com?') ||
        src.startsWith('https://cdn.tailwindcss.com/');
      if (!isAllowedSrc) {
        return {
          valid: false,
          error: `Invalid HTML: unauthorized external script source '${src}'. Only official Tailwind CDN is permitted.`,
        };
      }
    }

    if (scriptBody) {
      const lowerBody = scriptBody.toLowerCase();
      const dangerousPatterns = [
        /\btop\.location\b/,
        /\bparent\.location\b/,
        /\bwindow\.top\b/,
        /\beval\s*\(/,
        /\bnew\s+function\b/,
        /\bdocument\.cookie\b/,
        /\blocalstorage\b/,
        /\bsessionstorage\b/,
      ];
      for (const pattern of dangerousPatterns) {
        if (pattern.test(lowerBody)) {
          return {
            valid: false,
            error: 'Invalid HTML: hazardous script pattern detected in inline JavaScript.',
          };
        }
      }
    }
  }

  return { valid: true };
}
