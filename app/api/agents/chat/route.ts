import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// ─── OpenClaw Agent Chat Handler ─────────────────────────────────────────────
// Runs agent turns via the OpenClaw CLI.

export async function POST(req: NextRequest) {
  const { agentId, messages, systemPrompt } = await req.json();

  const userMessages = messages.filter((m: { role: string }) => m.role === 'user');
  const prompt = userMessages.length > 0 ? userMessages[userMessages.length - 1].content : '';

  if (!prompt) {
    return NextResponse.json({ agentId, content: 'No message provided.', blockActions: [] });
  }

  try {
    // Call OpenClaw agent via CLI
    const escapedMessage = prompt.replace(/"/g, '\\"').replace(/`/g, '\\`').replace(/\$/g, '\\$');
    const agentFlag = agentId && agentId !== 'default' ? `--agent ${agentId}` : '--agent main';
    const apiKey = process.env.ANTHROPIC_API_KEY?.trim() || '';

    // Find openclaw binary
    const openclawPaths = [
      '/Users/workstation/Downloads/node-v22.14.0-darwin-arm64/bin/openclaw',
      '/usr/local/bin/openclaw',
      '/opt/homebrew/bin/openclaw',
      'openclaw',
    ];
    const openclawBin = openclawPaths[0]; // Use known path first

    const cmd = `"${openclawBin}" agent ${agentFlag} --local --message "${escapedMessage}" --json 2>&1`;

    const { stdout } = await execAsync(cmd, {
      timeout: 300000, // 5 min for complex agent tasks
      env: {
        ...process.env,
        ANTHROPIC_API_KEY: apiKey,
        HOME: process.env.HOME || '/Users/workstation',
        PATH: '/Users/workstation/Downloads/node-v22.14.0-darwin-arm64/bin:' + (process.env.PATH || '/usr/bin:/bin'),
      },
    });

    // Parse JSON output — OpenClaw outputs JSON with --json flag
    // Find the JSON object in stdout (may have log lines before it)
    const jsonMatch = stdout.match(/\{[\s\S]*"payloads"[\s\S]*\}/);
    if (!jsonMatch) {
      // Try to extract any useful text
      const cleanOutput = stdout
        .split('\n')
        .filter((line: string) => !line.startsWith('['))
        .join('\n')
        .trim();
      return NextResponse.json({ agentId, content: cleanOutput || stdout, blockActions: [] });
    }

    const result = JSON.parse(jsonMatch[0]);
    const payloads = result.payloads || [];
    const rawContent = payloads.map((p: { text?: string }) => p.text || '').join('\n').trim();

    // Parse block actions
    let content = rawContent;
    let blockActions: unknown[] = [];
    const match = rawContent.match(/<block-actions>([\s\S]*?)<\/block-actions>/);
    if (match) {
      try {
        blockActions = JSON.parse(match[1]);
        content = rawContent.replace(/<block-actions>[\s\S]*?<\/block-actions>/, '').trim();
      } catch { /* keep raw */ }
    }

    return NextResponse.json({ agentId, content, blockActions });

  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);

    // If OpenClaw CLI not found, fall back to direct API
    if (errMsg.includes('not found') || errMsg.includes('ENOENT')) {
      return await fallbackDirectApi(agentId, prompt, systemPrompt);
    }

    // Extract useful error from stderr
    const cleanErr = errMsg
      .split('\n')
      .filter((line: string) => !line.includes('[diagnostic]') && !line.includes('[model-fallback'))
      .join('\n')
      .trim();

    return NextResponse.json({ agentId, content: `Agent error: ${cleanErr}`, blockActions: [] });
  }
}

// ─── Fallback: Direct Anthropic API ──────────────────────────────────────────

async function fallbackDirectApi(agentId: string, prompt: string, systemPrompt: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({
      agentId,
      content: 'OpenClaw is not installed and no ANTHROPIC_API_KEY is set.\n\nInstall OpenClaw: npm install -g openclaw@latest\nOr set ANTHROPIC_API_KEY in .env.local',
      blockActions: [],
    });
  }

  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: systemPrompt || 'You are a helpful AI agent. Note: OpenClaw is offline so browser/web tools are unavailable.',
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    let content = text;
    let blockActions: unknown[] = [];
    const match = text.match(/<block-actions>([\s\S]*?)<\/block-actions>/);
    if (match) {
      try {
        blockActions = JSON.parse(match[1]);
        content = text.replace(/<block-actions>[\s\S]*?<\/block-actions>/, '').trim();
      } catch { /* keep raw */ }
    }

    return NextResponse.json({ agentId, content, blockActions });
  } catch (e) {
    return NextResponse.json({ agentId, content: `API error: ${e instanceof Error ? e.message : String(e)}`, blockActions: [] });
  }
}
