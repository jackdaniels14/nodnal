import { NextRequest, NextResponse } from 'next/server';
import type Anthropic from '@anthropic-ai/sdk';

// ─── Build-Fixer Agent ──────────────────────────────────────────────────────
// A specialized nodnal agent that edits the repo itself. Uses the GitHub REST
// API (no local filesystem) so it works from Firebase App Hosting — edits land
// as commits on a fresh work branch that you review on iPad.
//
// Required env:
//   GITHUB_TOKEN            — PAT with repo:contents write scope
//   ANTHROPIC_API_KEY       — for Claude
// Optional env:
//   BUILD_FIXER_REPO        — "owner/repo" (default: jackdaniels14/nodnal)
//   BUILD_FIXER_BASE_BRANCH — base branch (default: master)

const REPO = process.env.BUILD_FIXER_REPO || 'jackdaniels14/nodnal';
const BASE_BRANCH = process.env.BUILD_FIXER_BASE_BRANCH || 'master';
const GH_API = 'https://api.github.com';
const MAX_TOOL_LOOPS = 20;
const MAX_TOKENS = 16384;

// Paths the agent must never touch, even if asked.
const FORBIDDEN_PATH_PATTERNS = [
  /^\.git\//,
  /^node_modules\//,
  /^\.env($|\.)/,
  /^firestore\.rules$/,
  /^apphosting\.yaml$/,
];

function isForbidden(path: string): boolean {
  return FORBIDDEN_PATH_PATTERNS.some(re => re.test(path));
}

// ─── GitHub REST helpers ────────────────────────────────────────────────────

function ghHeaders(token: string): HeadersInit {
  return {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'nodnal-build-fixer',
  };
}

async function gh<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${GH_API}${path}`, {
    ...init,
    headers: { ...ghHeaders(token), ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub ${res.status} ${path}: ${body.slice(0, 400)}`);
  }
  return res.json() as Promise<T>;
}

async function getBranchSha(token: string, branch: string): Promise<string> {
  const data = await gh<{ object: { sha: string } }>(
    token,
    `/repos/${REPO}/git/refs/heads/${encodeURIComponent(branch)}`,
  );
  return data.object.sha;
}

async function createBranch(token: string, newBranch: string, fromSha: string): Promise<void> {
  await gh(token, `/repos/${REPO}/git/refs`, {
    method: 'POST',
    body: JSON.stringify({ ref: `refs/heads/${newBranch}`, sha: fromSha }),
  });
}

async function listDir(token: string, path: string, ref: string): Promise<string> {
  const clean = path.replace(/^\/+/, '');
  const entries = await gh<Array<{ name: string; type: string; size?: number }>>(
    token,
    `/repos/${REPO}/contents/${encodeURIComponent(clean)}?ref=${encodeURIComponent(ref)}`,
  );
  if (!Array.isArray(entries)) throw new Error(`path is a file, not a directory: ${clean}`);
  return entries
    .map(e => `${e.type === 'dir' ? 'd' : 'f'} ${e.name}${e.size ? ` (${e.size}b)` : ''}`)
    .join('\n');
}

async function readFile(token: string, path: string, ref: string): Promise<{ content: string; sha: string }> {
  const clean = path.replace(/^\/+/, '');
  const data = await gh<{ content: string; encoding: string; sha: string; type: string }>(
    token,
    `/repos/${REPO}/contents/${encodeURIComponent(clean)}?ref=${encodeURIComponent(ref)}`,
  );
  if (data.type !== 'file') throw new Error(`not a file: ${clean}`);
  const content = data.encoding === 'base64'
    ? Buffer.from(data.content, 'base64').toString('utf-8')
    : data.content;
  return { content, sha: data.sha };
}

async function writeFile(
  token: string,
  path: string,
  content: string,
  branch: string,
  commitMessage: string,
  currentSha?: string,
): Promise<string> {
  const clean = path.replace(/^\/+/, '');
  const res = await gh<{ content: { sha: string } }>(
    token,
    `/repos/${REPO}/contents/${encodeURIComponent(clean)}`,
    {
      method: 'PUT',
      body: JSON.stringify({
        message: commitMessage,
        content: Buffer.from(content, 'utf-8').toString('base64'),
        branch,
        ...(currentSha ? { sha: currentSha } : {}),
      }),
    },
  );
  return res.content.sha;
}

// ─── Tool definitions exposed to Claude ─────────────────────────────────────

const TOOLS: Anthropic.Messages.Tool[] = [
  {
    name: 'list_dir',
    description: 'List files and folders in a directory of the nodnal repo. Use this to explore the codebase.',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Repo-relative path. Use "" or "." for the repo root.' },
      },
      required: ['path'],
    },
  },
  {
    name: 'read_file',
    description: 'Read the full contents of a file from the work branch. Always read a file before editing it.',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Repo-relative path.' },
      },
      required: ['path'],
    },
  },
  {
    name: 'write_file',
    description: 'Create or overwrite a file on the work branch with a commit. Pass the ENTIRE new file content, not a diff. The commit message should be short and descriptive.',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Repo-relative path.' },
        content: { type: 'string', description: 'Full new file content.' },
        commit_message: { type: 'string', description: 'Short commit message for this change.' },
      },
      required: ['path', 'content', 'commit_message'],
    },
  },
];

// ─── Tool execution ─────────────────────────────────────────────────────────

interface ToolContext {
  token: string;
  branch: string;
  fileShas: Map<string, string>;   // path → latest sha on work branch
  modifiedFiles: Set<string>;
}

async function runTool(
  ctx: ToolContext,
  name: string,
  input: Record<string, unknown>,
): Promise<{ ok: boolean; result: string }> {
  try {
    if (name === 'list_dir') {
      const path = String(input.path ?? '');
      const result = await listDir(ctx.token, path, ctx.branch);
      return { ok: true, result: result || '(empty)' };
    }
    if (name === 'read_file') {
      const path = String(input.path ?? '');
      if (!path) throw new Error('path is required');
      if (isForbidden(path)) throw new Error(`refused: path is protected (${path})`);
      const { content, sha } = await readFile(ctx.token, path, ctx.branch);
      ctx.fileShas.set(path, sha);
      return { ok: true, result: content };
    }
    if (name === 'write_file') {
      const path = String(input.path ?? '');
      const content = String(input.content ?? '');
      const commitMessage = String(input.commit_message ?? 'build-fixer: update file');
      if (!path) throw new Error('path is required');
      if (isForbidden(path)) throw new Error(`refused: path is protected (${path})`);
      const currentSha = ctx.fileShas.get(path);
      const newSha = await writeFile(ctx.token, path, content, ctx.branch, commitMessage, currentSha);
      ctx.fileShas.set(path, newSha);
      ctx.modifiedFiles.add(path);
      return { ok: true, result: `wrote ${path} (${content.length} bytes, sha=${newSha.slice(0, 7)})` };
    }
    return { ok: false, result: `unknown tool: ${name}` };
  } catch (err) {
    return { ok: false, result: err instanceof Error ? err.message : String(err) };
  }
}

// ─── System prompt ──────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are the Nodnal Build-Fixer agent. Your job is to make surgical code fixes to the nodnal Next.js repo (${REPO}, base branch ${BASE_BRANCH}).

Every change you make is committed to a fresh work branch that Landon reviews on iPad via GitHub. You are NOT working against a local filesystem.

Workflow:
1. Use list_dir / read_file to understand the code before editing. Never edit blind.
2. Make the smallest possible fix. Do not refactor unrelated code. Do not add features that weren't asked for.
3. When writing a file, pass the FULL new content — write_file is an overwrite, not a diff.
4. One commit per file change with a clear message. Batch related edits into one response.
5. When done, briefly summarize what you changed and why. Do not invent changes you didn't make.

Important constraints:
- Do NOT touch: .git/, node_modules/, .env*, firestore.rules, apphosting.yaml. These are protected.
- This is Next.js — but the repo's version has breaking changes from training data. When in doubt, read node_modules/next/dist/docs/ before editing route handlers or server components.
- Never push to master directly. You can only write to your work branch.
- If you cannot safely fix something, say so — do not make guesses.`;

// ─── Main handler ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const {
    message,
    history,
    branch: existingBranch,
  }: {
    message?: string;
    history?: { role: 'user' | 'assistant'; content: string }[];
    branch?: string;
  } = body;

  if (!message || typeof message !== 'string') {
    return NextResponse.json({ error: 'message is required' }, { status: 400 });
  }

  const token = process.env.GITHUB_TOKEN?.trim();
  if (!token) {
    return NextResponse.json(
      { error: 'GITHUB_TOKEN not configured. Add it as a secret in apphosting.yaml to enable the build-fixer.' },
      { status: 500 },
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  // Ensure a work branch exists.
  let branch = existingBranch;
  if (!branch) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    branch = `build-fix/${stamp}`;
    try {
      const baseSha = await getBranchSha(token, BASE_BRANCH);
      await createBranch(token, branch, baseSha);
    } catch (err) {
      return NextResponse.json(
        { error: `failed to create work branch: ${err instanceof Error ? err.message : String(err)}` },
        { status: 500 },
      );
    }
  }

  const AnthropicSdk = (await import('@anthropic-ai/sdk')).default;
  const client = new AnthropicSdk({ apiKey });

  const ctx: ToolContext = {
    token,
    branch,
    fileShas: new Map(),
    modifiedFiles: new Set(),
  };

  const conversation: Anthropic.Messages.MessageParam[] = [];
  if (Array.isArray(history)) {
    for (const m of history) {
      if (m.role === 'user' || m.role === 'assistant') {
        conversation.push({ role: m.role, content: m.content });
      }
    }
  }
  conversation.push({ role: 'user', content: message });

  let finalText = '';
  let stopReason: string | null = null;

  try {
    for (let i = 0; i < MAX_TOOL_LOOPS; i++) {
      const response: Anthropic.Messages.Message = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: MAX_TOKENS,
        system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
        tools: TOOLS,
        messages: conversation,
      });

      stopReason = response.stop_reason;

      // Accumulate any text from this turn.
      for (const block of response.content) {
        if (block.type === 'text') finalText += (finalText ? '\n' : '') + block.text;
      }

      if (response.stop_reason !== 'tool_use') break;

      // Execute each requested tool and build tool_result blocks.
      conversation.push({ role: 'assistant', content: response.content });

      const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type !== 'tool_use') continue;
        const { ok, result } = await runTool(ctx, block.name, block.input as Record<string, unknown>);
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: result,
          is_error: !ok,
        });
      }

      if (toolResults.length === 0) break;
      conversation.push({ role: 'user', content: toolResults });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[build-fixer] error:', msg);
    return NextResponse.json(
      { error: msg, branch, modifiedFiles: [...ctx.modifiedFiles] },
      { status: 500 },
    );
  }

  return NextResponse.json({
    content: finalText || '(no text response)',
    branch,
    modifiedFiles: [...ctx.modifiedFiles],
    stopReason,
    reviewUrl: `https://github.com/${REPO}/tree/${branch}`,
    compareUrl: `https://github.com/${REPO}/compare/${BASE_BRANCH}...${branch}`,
  });
}
