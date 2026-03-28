import { NextRequest, NextResponse } from 'next/server';

// ─── OpenClaw Agent Chat Handler ─────────────────────────────────────────────
// Sends messages to OpenClaw Gateway via HTTP RPC.

export async function POST(req: NextRequest) {
  const { agentId, messages, systemPrompt } = await req.json();

  const userMessages = messages.filter((m: { role: string }) => m.role === 'user');
  const prompt = userMessages.length > 0 ? userMessages[userMessages.length - 1].content : '';

  if (!prompt) {
    return NextResponse.json({ agentId, content: 'No message provided.', blockActions: [] });
  }

  try {
    // Use OpenClaw gateway via HTTP RPC
    const gatewayUrl = process.env.OPENCLAW_GATEWAY_URL || 'http://34.67.77.7:18789';
    const gatewayToken = process.env.OPENCLAW_GATEWAY_TOKEN || 'nodnal-openclaw-secret-2026';

    const rpcRes = await fetch(`${gatewayUrl}/rpc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(gatewayToken ? { Authorization: `Bearer ${gatewayToken}` } : {}),
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'sessions.send',
        params: {
          key: `agent:main:nodnal-${agentId}`,
          message: prompt,
          createIfMissing: true,
        },
      }),
      signal: AbortSignal.timeout(300000),
    });

    const rpcData = await rpcRes.json() as { result?: { payloads?: Array<{ text?: string }>; status?: string; runId?: string }; error?: { message?: string } };

    if (rpcData.error) {
      throw new Error(rpcData.error.message || JSON.stringify(rpcData.error));
    }

    // If session just started, wait for the agent to respond
    if (rpcData.result?.status === 'started' && rpcData.result?.runId) {
      // Poll for completion
      let attempts = 0;
      while (attempts < 60) {
        await new Promise(r => setTimeout(r, 2000));
        const histRes = await fetch(`${gatewayUrl}/rpc`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(gatewayToken ? { Authorization: `Bearer ${gatewayToken}` } : {}),
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: Date.now(),
            method: 'sessions.history',
            params: { key: `agent:main:nodnal-${agentId}`, limit: 1 },
          }),
        });
        const histData = await histRes.json() as { result?: { messages?: Array<{ role?: string; text?: string }> } };
        const lastMsg = histData.result?.messages?.[0];
        if (lastMsg?.role === 'assistant' && lastMsg?.text) {
          return NextResponse.json({ agentId, content: lastMsg.text, blockActions: [] });
        }
        attempts++;
      }
      return NextResponse.json({ agentId, content: 'Agent is processing your request. Check back shortly.', blockActions: [] });
    }

    // Direct response from gateway
    const respPayloads = rpcData.result?.payloads || [];
    const rawContent = respPayloads.map((p: { text?: string }) => p.text || '').join('\n').trim() || JSON.stringify(rpcData.result);

    // Parse block actions
    let content = rawContent;
    let blockActions: unknown[] = [];
    const baMatch = rawContent.match(/<block-actions>([\s\S]*?)<\/block-actions>/);
    if (baMatch) {
      try {
        blockActions = JSON.parse(baMatch[1]);
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
