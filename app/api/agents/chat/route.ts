import { NextRequest, NextResponse } from 'next/server';
import WebSocket from 'ws';

// ─── OpenClaw Agent Chat Handler ─────────────────────────────────────────────
// Sends messages to OpenClaw Gateway via WebSocket RPC.

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://34.67.77.7:18789';
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || 'nodnal-openclaw-secret-2026';

function getWsUrl(): string {
  return GATEWAY_URL.replace('http://', 'ws://').replace('https://', 'wss://');
}

function rpcCall(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const wsUrl = `${getWsUrl()}?auth.token=${encodeURIComponent(GATEWAY_TOKEN)}`;
    const ws = new WebSocket(wsUrl);
    const id = Date.now();
    let resolved = false;
    let agentText = '';

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        ws.close();
        if (agentText) {
          resolve({ text: agentText });
        } else {
          reject(new Error('Gateway timeout'));
        }
      }
    }, 180000); // 3 min timeout

    ws.on('open', () => {
      ws.send(JSON.stringify({ jsonrpc: '2.0', id, method, params }));
    });

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());

        // RPC response
        if (msg.id === id) {
          if (msg.error) {
            resolved = true;
            clearTimeout(timeout);
            ws.close();
            reject(new Error(msg.error.message || JSON.stringify(msg.error)));
            return;
          }
          // For sessions.send, result contains runId — we need to wait for completion
          if (msg.result?.status === 'started') {
            // Keep listening for agent completion
            return;
          }
          resolved = true;
          clearTimeout(timeout);
          ws.close();
          resolve(msg.result);
          return;
        }

        // Notification/event — agent response
        if (msg.method === 'session.output' || msg.method === 'session.turn.complete') {
          const text = msg.params?.text || msg.params?.payloads?.[0]?.text || msg.params?.content;
          if (text) agentText = text;

          if (msg.method === 'session.turn.complete' || msg.params?.final) {
            resolved = true;
            clearTimeout(timeout);
            ws.close();
            resolve({ text: agentText || text });
            return;
          }
        }

        // Any message with payloads
        if (msg.params?.payloads) {
          const texts = msg.params.payloads.map((p: { text?: string }) => p.text).filter(Boolean);
          if (texts.length > 0) agentText = texts.join('\n');
        }

        // Session complete notification
        if (msg.method?.includes('complete') || msg.method?.includes('done') || msg.method?.includes('finish')) {
          if (agentText) {
            resolved = true;
            clearTimeout(timeout);
            ws.close();
            resolve({ text: agentText });
            return;
          }
        }
      } catch { /* ignore parse errors */ }
    });

    ws.on('error', (err) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        reject(err);
      }
    });

    ws.on('close', () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        if (agentText) {
          resolve({ text: agentText });
        } else {
          reject(new Error('WebSocket closed without response'));
        }
      }
    });
  });
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
      const result = await rpcCall('sessions.send', {
        key: `agent:main:nodnal-${agentId || 'default'}`,
        message: prompt,
        systemPrompt,
        createIfMissing: true,
        resetSystem: true, // Tell gateway to use our system prompt, not its cached one
      }) as { text?: string; payloads?: Array<{ text?: string }> };

      const rawContent = result?.text || result?.payloads?.map(p => p.text).join('\n') || JSON.stringify(result);

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

      // If gateway fails, fall back to direct API (without browser tools)
      if (errMsg.includes('ECONNREFUSED') || errMsg.includes('timeout') || errMsg.includes('WebSocket')) {
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
