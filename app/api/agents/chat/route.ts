import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import * as browserPool from '@/lib/agents/browser-pool';

// ─── Agent Tools for Claude ──────────────────────────────────────────────────

const AGENT_TOOLS: Anthropic.Messages.Tool[] = [
  // ── Web Fetch (works everywhere — no browser needed) ──
  {
    name: 'web_fetch',
    description: 'Fetch a web page and return its text content. Works for any public URL. Use this as your primary tool for reading web pages. Returns the page title and text content (links, headings, paragraphs, etc.).',
    input_schema: {
      type: 'object' as const,
      properties: {
        url: { type: 'string', description: 'The full URL to fetch' },
      },
      required: ['url'],
    },
  },
  {
    name: 'web_search_scrape',
    description: 'Fetch multiple URLs and return their content. Use this to compare pages or gather info from several sources.',
    input_schema: {
      type: 'object' as const,
      properties: {
        urls: { type: 'array', items: { type: 'string' }, description: 'Array of URLs to fetch' },
      },
      required: ['urls'],
    },
  },
  // ── Browser Tools (Playwright — works on localhost, may not work on all hosts) ──
  {
    name: 'browser_navigate',
    description: 'Navigate to a URL in a full browser (Playwright). Use this for sites that require JavaScript rendering, login forms, or interactive pages. Falls back to web_fetch if browser is unavailable.',
    input_schema: {
      type: 'object' as const,
      properties: {
        url: { type: 'string', description: 'The full URL to navigate to' },
      },
      required: ['url'],
    },
  },
  {
    name: 'browser_screenshot',
    description: 'Take a screenshot of the current browser page.',
    input_schema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'browser_read_page',
    description: 'Read the text content of the current browser page including links, buttons, and form fields.',
    input_schema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'browser_click',
    description: 'Click an element on the browser page using CSS selectors.',
    input_schema: {
      type: 'object' as const,
      properties: {
        selector: { type: 'string', description: 'CSS selector for the element to click' },
      },
      required: ['selector'],
    },
  },
  {
    name: 'browser_fill',
    description: 'Fill in a form field in the browser.',
    input_schema: {
      type: 'object' as const,
      properties: {
        selector: { type: 'string', description: 'CSS selector for the input field' },
        value: { type: 'string', description: 'The value to type into the field' },
      },
      required: ['selector', 'value'],
    },
  },
  {
    name: 'browser_press',
    description: 'Press a keyboard key in the browser.',
    input_schema: {
      type: 'object' as const,
      properties: {
        key: { type: 'string', description: 'The key to press (e.g. "Enter", "Tab", "Escape")' },
      },
      required: ['key'],
    },
  },
];

// ─── Execute a browser tool call ─────────────────────────────────────────────

// ─── Web Fetch (no browser needed) ───────────────────────────────────────────

async function fetchPageContent(url: string): Promise<{ title: string; content: string; url: string }> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
  });
  const html = await res.text();

  // Extract title
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : url;

  // Strip scripts, styles, and extract text
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#\d+;/g, '')
    .replace(/\n\s*\n/g, '\n')
    .replace(/\s+/g, ' ')
    .trim();

  return { title, content: cleaned.slice(0, 8000), url: res.url };
}

// ─── Execute a tool call ─────────────────────────────────────────────────────

async function executeAgentTool(
  agentId: string,
  toolName: string,
  input: Record<string, unknown>
): Promise<Anthropic.Messages.ToolResultBlockParam> {
  try {
    switch (toolName) {
      // ── Web Fetch tools (work everywhere) ──
      case 'web_fetch': {
        try {
          const result = await fetchPageContent(input.url as string);
          return {
            type: 'tool_result',
            tool_use_id: '',
            content: `Page: "${result.title}" (${result.url})\n\n${result.content}`,
          };
        } catch (fetchErr) {
          return {
            type: 'tool_result',
            tool_use_id: '',
            content: `Failed to fetch ${input.url}: ${String(fetchErr)}`,
            is_error: true,
          };
        }
      }
      case 'web_search_scrape': {
        const urls = input.urls as string[];
        const results = await Promise.all(urls.slice(0, 5).map(async u => {
          try {
            const r = await fetchPageContent(u);
            return `── ${r.title} (${r.url}) ──\n${r.content.slice(0, 2000)}`;
          } catch (e) {
            return `── ${u} ── Error: ${String(e)}`;
          }
        }));
        return {
          type: 'tool_result',
          tool_use_id: '',
          content: results.join('\n\n'),
        };
      }
      // ── Browser tools (Playwright — falls back to web_fetch if unavailable) ──
      case 'browser_navigate': {
        try {
          const result = await browserPool.navigate(agentId, input.url as string);
          return { type: 'tool_result', tool_use_id: '', content: `Navigated to "${result.title}" (${result.url})` };
        } catch {
          const fallback = await fetchPageContent(input.url as string);
          return { type: 'tool_result', tool_use_id: '', content: `[Fallback: web fetch] "${fallback.title}" (${fallback.url})\n\n${fallback.content}` };
        }
      }
      case 'browser_screenshot': {
        try {
          const base64 = await browserPool.screenshot(agentId);
          return { type: 'tool_result', tool_use_id: '', content: [{ type: 'image', source: { type: 'base64', media_type: 'image/png', data: base64 } }] };
        } catch {
          return { type: 'tool_result', tool_use_id: '', content: 'Screenshot unavailable — browser not running. Use web_fetch instead.' };
        }
      }
      case 'browser_read_page': {
        try {
          const text = await browserPool.getPageContent(agentId);
          return { type: 'tool_result', tool_use_id: '', content: text || '(empty page)' };
        } catch {
          return { type: 'tool_result', tool_use_id: '', content: 'Browser not available. Use web_fetch to read pages instead.' };
        }
      }
      case 'browser_click': {
        try {
          const result = await browserPool.click(agentId, input.selector as string);
          return { type: 'tool_result', tool_use_id: '', content: result.success ? `Clicked "${input.selector}"` : `Failed: ${result.error}` };
        } catch {
          return { type: 'tool_result', tool_use_id: '', content: 'Browser not available. Cannot click elements via web_fetch.' };
        }
      }
      case 'browser_fill': {
        try {
          const result = await browserPool.fill(agentId, input.selector as string, input.value as string);
          return { type: 'tool_result', tool_use_id: '', content: result.success ? `Filled "${input.selector}"` : `Failed: ${result.error}` };
        } catch {
          return { type: 'tool_result', tool_use_id: '', content: 'Browser not available. Cannot fill forms via web_fetch.' };
        }
      }
      case 'browser_press': {
        try {
          const result = await browserPool.press(agentId, input.key as string);
          return { type: 'tool_result', tool_use_id: '', content: result.success ? `Pressed "${input.key}"` : `Failed: ${result.error}` };
        } catch {
          return { type: 'tool_result', tool_use_id: '', content: 'Browser not available.' };
        }
      }
      default:
        return { type: 'tool_result', tool_use_id: '', content: `Unknown tool: ${toolName}` };
    }
  } catch (e) {
    return { type: 'tool_result', tool_use_id: '', content: `Error: ${String(e)}`, is_error: true };
  }
}

// ─── Main Agent Chat Handler ─────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ content: 'ANTHROPIC_API_KEY not set in .env.local.' });
  }

  const { agentId, messages, systemPrompt, linkedBlockIds, workspaceContext } = await req.json();
  const client = new Anthropic({ apiKey });

  // Build agent-scoped system prompt
  const agentSystem = [
    systemPrompt || 'You are a helpful AI agent.',
    '',
    'You have web tools to fetch and read any public web page. Use web_fetch as your primary tool — it works reliably everywhere.',
    'For sites needing JavaScript rendering or form interaction, try the browser_ tools (they may not be available on all hosts).',
    'When the user asks you to look up information or scrape a website, use web_fetch first.',
    'You are scoped to a specific agent session. You can only interact with blocks you own.',
    linkedBlockIds?.length
      ? `Your linked blocks: ${linkedBlockIds.join(', ')}`
      : 'You have no linked blocks yet.',
    '',
    '## Workspace Context',
    'You exist on a workspace canvas alongside other blocks. Here are the blocks currently visible:',
    workspaceContext?.length
      ? workspaceContext.map((b: { id: string; type: string; title: string; agentOwned: boolean }) =>
          `- [${b.type}] "${b.title}" (id: ${b.id}${b.agentOwned ? ', yours' : ''})`
        ).join('\n')
      : '(no other blocks)',
    '',
    '## Block Actions',
    'You can create, update, or remove blocks on the workspace to display data visually.',
    'Include a JSON array in your response wrapped in <block-actions> tags.',
    '',
    'Actions:',
    '- spawn: Create a new block. Required: blockType, title. Optional: config, position.',
    '- update: Modify an existing block you own. Required: blockId. Optional: title, config.',
    '- remove: Delete a block you own. Required: blockId.',
    '',
    'Format: <block-actions>[{"action":"spawn","blockType":"stat","title":"Revenue","config":{"statValue":"$12,500","statLabel":"This month"}},...]</block-actions>',
    '',
    'Block types and their config:',
    '- stat: { statValue, statLabel, statUnit }',
    '- text: { textContent }',
    '- table: { tableHeaders: string[], tableRows: string[][] }',
    '- chart: { chartType: "bar"|"line"|"pie", chartData: [{name,value},...], chartColor }',
    '- list: { listItems: string[] }',
    '',
    'Use block actions when the user asks to display, visualize, or show data.',
    'Always tell the user what you created so they know to look for it on the canvas.',
  ].join('\n');

  // Build message history
  const apiMessages: Anthropic.Messages.MessageParam[] = messages.map(
    (m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })
  );

  // Agent loop — run until Claude stops calling tools (max 10 iterations)
  let finalText = '';
  let blockActions: unknown[] = [];

  try {
  for (let i = 0; i < 10; i++) {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: agentSystem,
      tools: AGENT_TOOLS,
      messages: apiMessages,
    });

    // Collect text and tool calls from the response
    const toolCalls: Anthropic.Messages.ToolUseBlock[] = [];

    for (const block of response.content) {
      if (block.type === 'text') {
        finalText += block.text;
      } else if (block.type === 'tool_use') {
        toolCalls.push(block);
      }
    }

    // If no tool calls, we're done
    if (toolCalls.length === 0 || response.stop_reason === 'end_turn') {
      break;
    }

    // Add assistant message with all content blocks
    apiMessages.push({ role: 'assistant', content: response.content });

    // Execute each tool call and collect results
    const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];
    for (const tc of toolCalls) {
      const result = await executeAgentTool(
        agentId,
        tc.name,
        tc.input as Record<string, string>
      );
      result.tool_use_id = tc.id;
      toolResults.push(result);
    }

    // Add tool results as user message
    apiMessages.push({ role: 'user', content: toolResults });
  }

  // Parse block actions from final text
  let content = finalText;
  const actionsMatch = finalText.match(/<block-actions>([\s\S]*?)<\/block-actions>/);
  if (actionsMatch) {
    try {
      blockActions = JSON.parse(actionsMatch[1]);
      content = finalText.replace(/<block-actions>[\s\S]*?<\/block-actions>/, '').trim();
    } catch {
      // If parsing fails, just show raw content
    }
  }

  return NextResponse.json({ agentId, content, blockActions });

  } catch (e: unknown) {
    const errMsg = e instanceof Error ? e.message : String(e);
    // Surface real API errors to the user
    if (errMsg.includes('credit balance')) {
      return NextResponse.json({ agentId, content: 'Your Anthropic account has no credits. Go to console.anthropic.com/settings/billing to add credits.', blockActions: [] });
    }
    if (errMsg.includes('invalid_api_key') || errMsg.includes('authentication')) {
      return NextResponse.json({ agentId, content: 'Invalid Anthropic API key. Check your .env.local file.', blockActions: [] });
    }
    return NextResponse.json({ agentId, content: `API error: ${errMsg}`, blockActions: [] });
  }
}
