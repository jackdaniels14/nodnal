import { NextRequest, NextResponse } from 'next/server';

// ─── OpenClaw Agent Chat Handler ─────────────────────────────────────────────
// Routes browser-capable agents through OpenClaw Gateway via HTTP bridge.
// Non-browser agents use direct Anthropic API with web_search + web_fetch.

const BRIDGE_URL = process.env.OPENCLAW_BRIDGE_URL || 'http://34.67.77.7:18850';
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

  parts.push(`\nWhen responding, stay in character as ${name}. Be helpful and concise — Landon reads on iPad.`);
  parts.push(`Read AGENT_ROLES.md and CREDENTIALS.md in your workspace for your full rules and login credentials.`);
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
  console.log(`[agent-chat] agentId=${agentId} capabilities=${JSON.stringify(agentCapabilities)} browser=${hasBrowserCapability}`);

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
//
// Reliability notes:
// - web_search / web_fetch are server-side tools: Anthropic executes them and
//   streams the results back inside the same response. The model may stop with
//   stop_reason === 'pause_turn' when a long tool chain is still in flight —
//   we must resume by sending the assistant turn back and continuing.
// - max_tokens must be large enough to hold tool results + final answer.
// - Transient 429/5xx get retried with exponential backoff.
// - System prompt gets cache_control so repeated turns hit the prompt cache.

import type Anthropic from '@anthropic-ai/sdk';

const MAX_TOKENS = 16384;
const MAX_TURN_LOOPS = 6;
const MAX_RETRIES = 3;

function isRetryable(err: unknown): boolean {
  const e = err as { status?: number; message?: string };
  if (e?.status && (e.status === 429 || e.status >= 500)) return true;
  const msg = e?.message || '';
  return /overloaded|rate.?limit|timeout|ECONNRESET|fetch failed/i.test(msg);
}

async function createWithRetry(
  client: Anthropic,
  params: Anthropic.Messages.MessageCreateParamsNonStreaming,
): Promise<Anthropic.Messages.Message> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await client.messages.create(params);
    } catch (err) {
      lastErr = err;
      if (!isRetryable(err) || attempt === MAX_RETRIES - 1) throw err;
      const delay = 500 * Math.pow(2, attempt) + Math.random() * 250;
      console.warn(`[agent-chat] retryable error, retry ${attempt + 1}/${MAX_RETRIES} in ${Math.round(delay)}ms:`, (err as Error)?.message);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

async function callAnthropicApi(agentId: string, messages: { role: string; content: string }[], systemPrompt: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({
      agentId,
      content: 'OpenClaw Gateway is unreachable and no ANTHROPIC_API_KEY is set.',
      blockActions: [],
    });
  }

  const AnthropicSdk = (await import('@anthropic-ai/sdk')).default;
  const client = new AnthropicSdk({ apiKey });

  const chatMessages: Anthropic.Messages.MessageParam[] = messages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

  if (chatMessages.length === 0) {
    chatMessages.push({ role: 'user', content: '' });
  }

  // Conversation state — grows as we loop on pause_turn.
  const conversation: Anthropic.Messages.MessageParam[] = [...chatMessages];
  const collectedText: string[] = [];
  let finalStopReason: string | null = null;

  try {
    for (let loop = 0; loop < MAX_TURN_LOOPS; loop++) {
      const response = await createWithRetry(client, {
        model: 'claude-sonnet-4-6',
        max_tokens: MAX_TOKENS,
        system: [
          {
            type: 'text',
            text: systemPrompt,
            cache_control: { type: 'ephemeral' },
          },
        ],
        tools: [
          { name: 'web_search', type: 'web_search_20250305' as const },
          { name: 'web_fetch', type: 'web_fetch_20250910' as const },
        ],
        messages: conversation,
      });

      finalStopReason = response.stop_reason;

      // Log any failed server tool calls so flakiness is debuggable.
      for (const block of response.content) {
        if (block.type === 'web_search_tool_result' || block.type === 'web_fetch_tool_result') {
          const content = (block as { content?: unknown }).content;
          if (content && typeof content === 'object' && 'type' in content && (content as { type: string }).type === 'web_search_tool_result_error') {
            console.warn(`[agent-chat] ${block.type} error:`, content);
          }
        }
        if (block.type === 'text') collectedText.push(block.text);
      }

      // Only pause_turn means the server wants us to continue the same turn.
      // Push the assistant response back and loop.
      if (response.stop_reason === 'pause_turn') {
        conversation.push({ role: 'assistant', content: response.content });
        continue;
      }

      // Any other stop reason: we're done (end_turn, max_tokens, stop_sequence, tool_use).
      break;
    }

    const text = collectedText.join('\n').trim();

    let content = text;
    let blockActions: unknown[] = [];
    const match = text.match(/<block-actions>([\s\S]*?)<\/block-actions>/);
    if (match) {
      try {
        blockActions = JSON.parse(match[1]);
        content = text.replace(/<block-actions>[\s\S]*?<\/block-actions>/, '').trim();
      } catch (err) {
        console.warn('[agent-chat] block-actions JSON parse failed:', err);
      }
    }

    if (!content) {
      const hint = finalStopReason === 'max_tokens'
        ? ' (hit max_tokens — web results were too large for the response budget)'
        : finalStopReason
        ? ` (stop_reason=${finalStopReason})`
        : '';
      content = `Agent returned no text${hint}. Try rephrasing or narrowing the request.`;
    }

    return NextResponse.json({ agentId, content, blockActions });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[agent-chat] anthropic call failed:', msg);
    return NextResponse.json({ agentId, content: `API error: ${msg}`, blockActions: [] });
  }
}
