import { NextRequest, NextResponse } from 'next/server';

// ─── OpenClaw Agent Chat Handler ─────────────────────────────────────────────
// Routes browser-capable agents through OpenClaw Gateway via HTTP bridge.
// Non-browser agents use direct Anthropic API with web_search + web_fetch.

const BRIDGE_URL = process.env.OPENCLAW_BRIDGE_URL || 'http://34.67.77.7:18800';
const BRIDGE_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || 'nodnal-openclaw-secret-2026';

async function callOpenClawBridge(sessionKey: string, message: string, systemPrompt?: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 180000); // 3 min

  try {
    const res = await fetch(BRIDGE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${BRIDGE_TOKEN}`,
      },
      body: JSON.stringify({ sessionKey, message, systemPrompt }),
      signal: controller.signal,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Bridge error: ${res.status}`);
    return data.text || '';
  } finally {
    clearTimeout(timeout);
  }
}

function buildSystemPrompt(body: {
  agentName?: string;
  agentDescription?: string;
  agentSystemPrompt?: string;
  agentTargetUrl?: string;
  agentCapabilities?: string[];
}): string {
  const name = body.agentName || 'Agent';
  const parts: string[] = [];

  parts.push(`You are "${name}", an AI agent in the Nodnal workspace.`);
  parts.push(`IMPORTANT: You are NOT Claude. You are ${name}. Never introduce yourself as Claude or say you are Claude. Always identify as ${name}.`);

  if (body.agentDescription) {
    parts.push(`Your role: ${body.agentDescription}`);
  }

  if (body.agentTargetUrl) {
    parts.push(`Your target system: ${body.agentTargetUrl}`);
  }

  if (body.agentCapabilities?.length) {
    parts.push(`Your capabilities: ${body.agentCapabilities.join(', ')}`);
  }

  if (body.agentSystemPrompt) {
    parts.push(`\nCustom instructions:\n${body.agentSystemPrompt}`);
  }

  parts.push(`\nWhen responding, stay in character as ${name}. Be helpful and concise.`);
  parts.push(`You can create, update, or remove blocks in the workspace by including a <block-actions>[JSON array]</block-actions> tag in your response.`);

  return parts.join('\n');
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { agentId, messages, agentCapabilities } = body;

  const systemPrompt = buildSystemPrompt(body);

  const userMessages = messages.filter((m: { role: string }) => m.role === 'user');
  const prompt = userMessages.length > 0 ? userMessages[userMessages.length - 1].content : '';

  if (!prompt) {
    return NextResponse.json({ agentId, content: 'No message provided.', blockActions: [] });
  }

  // Agents with browser capability use OpenClaw Gateway (has headless Chrome via Browserless).
  // Other agents use the direct Anthropic API.
  const hasBrowserCapability = Array.isArray(agentCapabilities) && agentCapabilities.includes('browser');

  if (hasBrowserCapability) {
    try {
      const sessionKey = `agent:main:nodnal-${agentId || 'default'}`;
      const rawContent = await callOpenClawBridge(sessionKey, prompt, systemPrompt);

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

      // If bridge fails, fall back to direct API (without browser tools)
      if (errMsg.includes('ECONNREFUSED') || errMsg.includes('fetch failed') || errMsg.includes('abort')) {
        return await callAnthropicApi(agentId, messages, systemPrompt);
      }

      return NextResponse.json({ agentId, content: `Agent error: ${errMsg}`, blockActions: [] });
    }
  }

  // Non-browser agents use direct Anthropic API
  return await callAnthropicApi(agentId, messages, systemPrompt);
}

// ─── Direct Anthropic API ───────────────────────────────────────────────────
// Used for non-browser agents, with web_search + web_fetch tools for web access.

async function callAnthropicApi(agentId: string, messages: { role: string; content: string }[], systemPrompt: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({
      agentId,
      content: 'OpenClaw Gateway is unreachable and no ANTHROPIC_API_KEY is set.',
      blockActions: [],
    });
  }

  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const client = new Anthropic({ apiKey });

  // Build proper conversation history, only user/assistant roles
  const chatMessages = messages
    .filter((m: { role: string }) => m.role === 'user' || m.role === 'assistant')
    .map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: systemPrompt,
      tools: [
        { name: 'web_search', type: 'web_search_20250305' as const },
        { name: 'web_fetch', type: 'web_fetch_20250910' as const },
      ],
      messages: chatMessages.length > 0 ? chatMessages : [{ role: 'user' as const, content: '' }],
    });

    // Extract text from response, handling both text and tool_use content blocks
    const text = response.content
      .filter(b => b.type === 'text')
      .map(b => b.type === 'text' ? b.text : '')
      .join('\n');
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
