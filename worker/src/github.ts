/**
 * GitHub Contents API Handler for Doodlebug
 * Directly commits generated HTML into canvas.html on the public GitHub Pages repository.
 */

import { Env, GitHubRepoConfig, PublishRequest, PublishResponse } from './types';

/**
 * Extracts GitHub repository configuration from environment
 */
export function getGitHubConfig(env: Env): GitHubRepoConfig {
  if (env.GITHUB_REPO_CONFIG) {
    try {
      const parsed = typeof env.GITHUB_REPO_CONFIG === 'string' 
        ? JSON.parse(env.GITHUB_REPO_CONFIG) 
        : env.GITHUB_REPO_CONFIG;
      return {
        owner: parsed.owner || env.GITHUB_OWNER || '',
        repo: parsed.repo || env.GITHUB_REPO || '',
        branch: parsed.branch || env.GITHUB_BRANCH || 'main',
        canvasPath: parsed.canvasPath || env.GITHUB_CANVAS_PATH || 'canvas.html',
        committerName: parsed.committerName || env.GITHUB_COMMITTER_NAME || 'Kieran Patton',
        committerEmail: parsed.committerEmail || env.GITHUB_COMMITTER_EMAIL || `${env.GITHUB_OWNER || 'kieranpatton01'}@users.noreply.github.com`,
      };
    } catch (e) {
      // Fall through to individual vars if JSON parse fails
    }
  }

  return {
    owner: env.GITHUB_OWNER || '',
    repo: env.GITHUB_REPO || '',
    branch: env.GITHUB_BRANCH || 'main',
    canvasPath: env.GITHUB_CANVAS_PATH || 'canvas.html',
    committerName: env.GITHUB_COMMITTER_NAME || 'Kieran Patton',
    committerEmail: env.GITHUB_COMMITTER_EMAIL || `${env.GITHUB_OWNER || 'kieranpatton01'}@users.noreply.github.com`,
  };
}

/**
 * UTF-8 safe Base64 encoder for Web Crypto / Cloudflare Workers
 */
export function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Commits the approved HTML directly to the target GitHub repository
 */
export async function commitCanvasToGitHub(
  payload: PublishRequest,
  env: Env
): Promise<PublishResponse> {
  if (!env.GITHUB_PAT) {
    throw new Error('Missing GITHUB_PAT secret on Cloudflare Worker');
  }

  const config = getGitHubConfig(env);
  if (!config.owner || !config.repo) {
    throw new Error(
      `GitHub repository configuration incomplete: owner='${config.owner}', repo='${config.repo}'. Set GITHUB_OWNER and GITHUB_REPO or GITHUB_REPO_CONFIG.`
    );
  }

  if (!payload.html || typeof payload.html !== 'string' || !payload.html.trim()) {
    throw new Error('Empty or invalid HTML content received for publication');
  }

  if (payload.html.length > 1_000_000) {
    throw new Error('HTML content exceeds maximum allowed size of 1MB');
  }

  const headers = {
    'Authorization': `Bearer ${env.GITHUB_PAT}`,
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'Doodlebug-CMS-Worker/1.0',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  const safeCanvasPath = config.canvasPath
    .split('/')
    .map(encodeURIComponent)
    .join('/');
  const fileUrl = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${safeCanvasPath}?ref=${encodeURIComponent(config.branch)}`;
  const putUrl = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${safeCanvasPath}`;
  const base64Content = utf8ToBase64(payload.html);

  const maxAttempts = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // Step 1: Check if file already exists to get its current blob SHA
    let existingSha: string | undefined = undefined;

    const getRes = await fetch(fileUrl, {
      method: 'GET',
      headers,
    });

    if (getRes.ok) {
      const fileData = (await getRes.json()) as { sha?: string };
      existingSha = fileData.sha;
    } else if (getRes.status === 404) {
      existingSha = undefined;
    } else if (getRes.status === 401 || getRes.status === 403) {
      const errorText = await getRes.text();
      throw new Error(`GitHub Authentication Error (${getRes.status}): PAT is invalid or lacks 'Contents: Read and Write' scope. Details: ${errorText}`);
    } else {
      const errorText = await getRes.text();
      throw new Error(`Failed to check existing file on GitHub (${getRes.status}): ${errorText}`);
    }

    // Step 2: PUT /repos/{owner}/{repo}/contents/{path}
    const commitBody: Record<string, unknown> = {
      message: payload.commitMessage || '🎨 Doodlebug update via Vibecode (canvas.html)',
      content: base64Content,
      branch: config.branch,
      committer: {
        name: config.committerName,
        email: config.committerEmail,
      },
      author: {
        name: config.committerName,
        email: config.committerEmail,
      },
    };

    if (existingSha) {
      commitBody.sha = existingSha;
    }

    const putRes = await fetch(putUrl, {
      method: 'PUT',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(commitBody),
    });

    if (putRes.ok) {
      const putData = (await putRes.json()) as {
        commit?: { sha?: string };
        content?: { html_url?: string };
      };

      return {
        success: true,
        commitSha: putData.commit?.sha || 'unknown',
        htmlUrl: putData.content?.html_url || `https://github.com/${config.owner}/${config.repo}/blob/${config.branch}/${config.canvasPath}`,
        path: config.canvasPath,
        branch: config.branch,
      };
    }

    if (putRes.status === 409 && attempt < maxAttempts) {
      // 409 Conflict: concurrent edit changed SHA. Retry with fresh SHA.
      await new Promise((r) => setTimeout(r, 300 * attempt));
      continue;
    }

    const errorText = await putRes.text();
    lastError = new Error(`GitHub Commit Error (${putRes.status}): ${errorText}`);
    break;
  }

  throw lastError || new Error('Failed to commit canvas to GitHub');
}
