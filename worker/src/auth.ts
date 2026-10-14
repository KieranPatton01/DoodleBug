/**
 * Firebase ID Token Verification & Identity Lockdown for Cloudflare Worker
 * 
 * Enforces zero-trust:
 * 1. Checks Authorization: Bearer <token>
 * 2. Verifies cryptographic signature against Google's JWKS
 * 3. Verifies claims (exp, iat, aud, iss)
 * 4. Strictly enforces sub === ALLOWED_FIREBASE_UID (403 Forbidden otherwise)
 */

import { Env, AuthVerificationResult } from './types';

interface JwkKey {
  kty: string;
  alg: string;
  use: string;
  kid: string;
  n: string;
  e: string;
}

interface JwksResponse {
  keys: JwkKey[];
}

interface JwtHeader {
  alg: string;
  kid: string;
  typ?: string;
}

interface JwtPayload {
  iss?: string;
  aud?: string;
  sub?: string;
  user_id?: string;
  iat?: number;
  exp?: number;
  email?: string;
  [key: string]: unknown;
}

const GOOGLE_JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

// In-memory cache for Google public JWKS keys to avoid re-fetching on every request
let jwksCache: { keys: JwkKey[]; expiry: number } | null = null;
let lastJwksFetchTimestamp = 0;
export const JWKS_MIN_REFETCH_INTERVAL_MS = 60 * 1000; // Throttle: At most once per minute

/**
 * Base64URL decode helper for Web Crypto / Workers
 */
function base64UrlDecode(str: string): Uint8Array {
  // Convert Base64URL to standard Base64
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function base64UrlDecodeToString(str: string): string {
  const bytes = base64UrlDecode(str);
  return new TextDecoder().decode(bytes);
}

/**
 * Fetches Google public JWKS with caching and throttling protection
 */
export async function getGoogleJwks(customJwksUrl?: string, forceRefresh = false): Promise<JwkKey[]> {
  const now = Date.now();
  if (!forceRefresh && jwksCache && jwksCache.expiry > now) {
    return jwksCache.keys;
  }

  const url = customJwksUrl || GOOGLE_JWKS_URL;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      lastJwksFetchTimestamp = now;
      if (jwksCache && jwksCache.keys.length > 0) {
        return jwksCache.keys;
      }
      throw new Error(`Failed to fetch Google JWKS: ${res.status} ${res.statusText}`);
    }

    const data = (await res.json()) as JwksResponse;
    if (!data || !Array.isArray(data.keys)) {
      lastJwksFetchTimestamp = now;
      if (jwksCache && jwksCache.keys.length > 0) {
        return jwksCache.keys;
      }
      throw new Error('Malformed JWKS response from Google');
    }

    lastJwksFetchTimestamp = now;

    // Cache for 6 hours (Google rotates keys slowly)
    jwksCache = {
      keys: data.keys,
      expiry: now + 6 * 60 * 60 * 1000,
    };

    return data.keys;
  } catch (err) {
    lastJwksFetchTimestamp = now;
    if (jwksCache && jwksCache.keys.length > 0) {
      return jwksCache.keys;
    }
    throw err;
  }
}

/**
 * Set or reset JWKS cache (used in testing or key refresh)
 */
export function setCachedJwks(keys: JwkKey[] | null, lastFetchTime?: number) {
  if (keys) {
    jwksCache = { keys, expiry: Date.now() + 60 * 60 * 1000 };
    lastJwksFetchTimestamp = lastFetchTime !== undefined ? lastFetchTime : Date.now();
  } else {
    jwksCache = null;
    lastJwksFetchTimestamp = 0;
  }
}

export function getLastJwksFetchTime(): number {
  return lastJwksFetchTimestamp;
}

/**
 * Validates the Firebase ID token and ensures the user UID is authorized
 */
export async function verifyFirebaseToken(
  authHeader: string | null | undefined,
  env: Env,
  customJwksUrl?: string
): Promise<AuthVerificationResult> {
  if (!authHeader) {
    return {
      valid: false,
      error: 'Missing Authorization header',
      statusCode: 401,
    };
  }

  const parts = authHeader.trim().split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return {
      valid: false,
      error: 'Invalid Authorization header format. Expected "Bearer <token>"',
      statusCode: 401,
    };
  }

  const token = parts[1];

  // Dev bypass support for local offline testing if explicitly configured (strictly forbidden in production)
  if (
    env.DEV_BYPASS_AUTH === 'true' &&
    env.ENVIRONMENT !== 'production' &&
    token.startsWith('mock-token-uid-')
  ) {
    const mockUid = token.replace('mock-token-uid-', '');
    if (mockUid !== env.ALLOWED_FIREBASE_UID) {
      return {
        valid: false,
        error: 'Forbidden: User is not authorized for this site',
        statusCode: 403,
      };
    }
    return { valid: true, uid: mockUid };
  }

  const segments = token.split('.');
  if (segments.length !== 3) {
    return {
      valid: false,
      error: 'Invalid JWT structure: must contain 3 segments',
      statusCode: 401,
    };
  }

  const [headerB64, payloadB64, signatureB64] = segments;

  let header: JwtHeader;
  let payload: JwtPayload;

  try {
    header = JSON.parse(base64UrlDecodeToString(headerB64));
    payload = JSON.parse(base64UrlDecodeToString(payloadB64));
  } catch (err) {
    return {
      valid: false,
      error: 'Failed to parse JWT header or payload',
      statusCode: 401,
    };
  }

  // Mandatory project configuration check
  if (!env.FIREBASE_PROJECT_ID) {
    return {
      valid: false,
      error: 'Server configuration error: FIREBASE_PROJECT_ID is not configured on Cloudflare Worker',
      statusCode: 500,
    };
  }

  if (!env.ALLOWED_FIREBASE_UID) {
    return {
      valid: false,
      error: 'Server configuration error: ALLOWED_FIREBASE_UID is not configured on Cloudflare Worker',
      statusCode: 500,
    };
  }

  // Check basic token parameters
  if (header.alg !== 'RS256' || !header.kid) {
    return {
      valid: false,
      error: 'Invalid JWT header: algorithm must be RS256 with valid kid',
      statusCode: 401,
    };
  }

  // 1. Cryptographic signature verification using Web Crypto API FIRST
  try {
    let keys = await getGoogleJwks(customJwksUrl);
    let matchingKey = keys.find((k) => k.kid === header.kid);

    // If key not found in cache, only force fresh fetch if throttled interval has elapsed
    // This prevents cache-refresh abuse where attackers send random 'kid' values to spam Google JWKS
    if (!matchingKey && jwksCache) {
      const now = Date.now();
      if (now - lastJwksFetchTimestamp >= JWKS_MIN_REFETCH_INTERVAL_MS) {
        keys = await getGoogleJwks(customJwksUrl, true);
        matchingKey = keys.find((k) => k.kid === header.kid);
      }
    }

    if (!matchingKey) {
      return {
        valid: false,
        error: `Public key with kid '${header.kid}' not found in JWKS`,
        statusCode: 401,
      };
    }

    const cryptoKey = await crypto.subtle.importKey(
      'jwk',
      matchingKey,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      false,
      ['verify']
    );

    const signedData = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const signature = base64UrlDecode(signatureB64);

    const isSignatureValid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      signature as unknown as BufferSource,
      signedData as unknown as BufferSource
    );

    if (!isSignatureValid) {
      return {
        valid: false,
        error: 'Cryptographic signature verification failed',
        statusCode: 401,
      };
    }
  } catch (err) {
    return {
      valid: false,
      error: `Signature verification error: ${err instanceof Error ? err.message : String(err)}`,
      statusCode: 401,
    };
  }

  const nowSec = Math.floor(Date.now() / 1000);

  // 2. Check expiration
  if (!payload.exp || payload.exp < nowSec) {
    return {
      valid: false,
      error: 'Firebase ID token has expired',
      statusCode: 401,
    };
  }

  // 3. Check iat (allow 5-minute clock drift into future)
  if (payload.iat && payload.iat > nowSec + 300) {
    return {
      valid: false,
      error: 'Firebase ID token issued in the future',
      statusCode: 401,
    };
  }

  // 4. Check Firebase project audience & issuer
  if (payload.aud !== env.FIREBASE_PROJECT_ID) {
    return {
      valid: false,
      error: 'Invalid audience: token does not match authorized project',
      statusCode: 401,
    };
  }

  const expectedIssuer = `https://securetoken.google.com/${env.FIREBASE_PROJECT_ID}`;
  if (payload.iss !== expectedIssuer) {
    return {
      valid: false,
      error: 'Invalid issuer: token not issued by authorized Firebase project',
      statusCode: 401,
    };
  }

  // 5. CRITICAL SECURITY CONSTRAINT: Identity Lockdown check
  // sub claim holds the Firebase user UID
  const userUid = payload.sub || payload.user_id;
  if (!userUid) {
    return {
      valid: false,
      error: 'Token missing subject (UID) claim',
      statusCode: 401,
    };
  }

  if (userUid !== env.ALLOWED_FIREBASE_UID) {
    return {
      valid: false,
      error: 'Forbidden: User is not authorized for this site',
      statusCode: 403,
    };
  }

  return {
    valid: true,
    uid: userUid,
  };
}
