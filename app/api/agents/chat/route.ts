import { NextRequest, NextResponse } from 'next/server';

// ─── OpenClaw Agent Chat Handler ─────────────────────────────────────────────
// Sends messages to the OpenClaw Gateway and returns the agent's response.
// Gateway runs locally (openclaw gateway) or on a remote host.

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:18788';
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || '';

async function callGateway(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
  const url = `${GATEWAY_URL}/rpc`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(GATEWAY_TOKEN ? { Authorization: `Bearer ${GATEWAY_TOKEN}` } : {}),
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params,
    }),
    signal: AbortSignal.timeout(120000),
  });

  if (!res.ok) {
    throw new Error(`Gateway error: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  if (data.error) {
    throw new Error(data.error.message || JSON.stringify(data.error));
  }
  return data.result;
}

export async function POST(req: NextRequest) {
  const { agentId, messages, systemPrompt, linkedBlockIds, workspaceContext } = await req.json();

  // Get the latest user message
  const userMessages = messages.filter((m: { role: string }) => m.role === 'user');
  const prompt = userMessages.length > 0 ? userMessages[userMessages.length - 1].content : '';

  if (!prompt) {
    return NextResponse.json({ agentId, content: 'No message provided.', blockActions: [] });
  }

  // Build context
  const contextParts: string[] = [];
  if (linkedBlockIds?.length) contextParts.push(`Linked blocks: ${linkedBlockIds.join(', ')}`);
  if (workspaceContext?.length) {
    contextParts.push(`Workspace: ${workspaceContext.map((b: { type: string; title: string }) => `[${b.type}] "${b.title}"`).join(', ')}`);
  }

  const fullMessage = [
    contextParts.length > 0 ? `[Context: ${contextParts.join('; ')}]\n\n` : '',
    prompt,
  ].join('');

  try {
    // Try OpenClaw Gateway first
    const result = await callGateway('agent.run', {
      message: fullMessage,
      agent: agentId || undefined,
      systemPrompt: systemPrompt || undefined,
    }) as { reply?: string; content?: string; text?: string };

    const rawContent = result?.reply || result?.content || result?.text || JSON.stringify(result);

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

    // If gateway is unreachable, fall back to direct Anthropic API
    if (errMsg.includes('ECONNREFUSED') || errMsg.includes('fetch failed') || errMsg.includes('Gateway error')) {
      return await fallbackDirectApi(agentId, prompt, systemPrompt);
    }

    return NextResponse.json({ agentId, content: `Error: ${errMsg}`, blockActions: [] });
  }
}

// ─── Fallback: Direct Anthropic API ──────────────────────────────────────────

async function fallbackDirectApi(agentId: string, prompt: string, systemPrompt: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({
      agentId,
      content: 'OpenClaw Gateway is not running and no ANTHROPIC_API_KEY is set.\n\nStart the gateway with: openclaw gateway\n\nOr set ANTHROPIC_API_KEY in .env.local for direct API fallback.',
      blockActions: [],
    });
  }

  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: systemPrompt || 'You are a helpful AI agent. Note: OpenClaw Gateway is offline so browser tools are unavailable. Answer from your knowledge.',
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
