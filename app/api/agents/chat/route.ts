import { NextRequest, NextResponse } from 'next/server';

// ─── Agent Chat Handler ──────────────────────────────────────────────────────
// Proxies to the Agent SDK server running separately.
// Falls back to direct Anthropic API if agent server is unavailable.

const AGENT_SERVER_URL = process.env.AGENT_SERVER_URL || 'http://localhost:3100';

export async function POST(req: NextRequest) {
  const { agentId, messages, systemPrompt, linkedBlockIds, workspaceContext } = await req.json();

  // Build context string from workspace blocks
  const contextParts: string[] = [];
  if (linkedBlockIds?.length) {
    contextParts.push(`Linked blocks: ${linkedBlockIds.join(', ')}`);
  }
  if (workspaceContext?.length) {
    contextParts.push(`Workspace: ${workspaceContext.map((b: { type: string; title: string; id: string }) => `[${b.type}] "${b.title}"`).join(', ')}`);
  }

  // Get the latest user message as the prompt
  const userMessages = messages.filter((m: { role: string }) => m.role === 'user');
  const prompt = userMessages.length > 0 ? userMessages[userMessages.length - 1].content : '';

  // Build conversation history for context
  const history = messages.slice(0, -1).map((m: { role: string; content: string }) => `${m.role}: ${m.content}`).join('\n');
  const fullContext = [
    history ? `Previous conversation:\n${history}` : '',
    contextParts.length > 0 ? contextParts.join('\n') : '',
  ].filter(Boolean).join('\n\n');

  try {
    // Try the Claude Agent SDK server first
    const agentRes = await fetch(`${AGENT_SERVER_URL}/api/agent/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId,
        prompt,
        systemPrompt: [
          systemPrompt || 'You are a helpful AI agent.',
          '',
          'You have browser tools to visit websites, read content, fill forms, click buttons, and take screenshots.',
          'When asked to look something up or interact with a website, ALWAYS use the navigate tool.',
          'Do not make up information — use your tools to find it.',
          '',
          'You can create blocks on the workspace. Wrap commands in <block-actions>[...]</block-actions>.',
          'Actions: spawn (blockType, title, config), update (blockId, config), remove (blockId).',
          'Block types: stat {statValue, statLabel}, text {textContent}, table {tableHeaders, tableRows}, chart {chartType, chartData}, list {listItems}.',
        ].join('\n'),
        context: fullContext,
      }),
      signal: AbortSignal.timeout(120000), // 2 min timeout for complex agent tasks
    });

    if (agentRes.ok) {
      const data = await agentRes.json();
      return NextResponse.json(data);
    }

    // Agent server returned error
    const errText = await agentRes.text();
    return NextResponse.json({
      agentId,
      content: `Agent server error: ${errText}`,
      blockActions: [],
    });

  } catch (err) {
    // Agent server unreachable — fall back to direct API call
    const errMsg = err instanceof Error ? err.message : String(err);

    // Check if it's just a connection error (server not running)
    if (errMsg.includes('ECONNREFUSED') || errMsg.includes('fetch failed') || errMsg.includes('TimeoutError')) {
      // Fallback: use Anthropic API directly
      return await directApiCall(agentId, prompt, systemPrompt, fullContext);
    }

    return NextResponse.json({
      agentId,
      content: `Error: ${errMsg}`,
      blockActions: [],
    });
  }
}

// ─── Fallback: Direct Anthropic API ──────────────────────────────────────────

async function directApiCall(agentId: string, prompt: string, systemPrompt: string, context: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ agentId, content: 'ANTHROPIC_API_KEY not set and agent server unavailable.', blockActions: [] });
  }

  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: [
        systemPrompt || 'You are a helpful AI agent.',
        context ? `\n\nContext:\n${context}` : '',
        '\nNote: Browser tools are currently unavailable. Answer based on your knowledge, or let the user know you need the agent server running to browse websites.',
      ].join(''),
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
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ agentId, content: `API error: ${msg}`, blockActions: [] });
  }
}
