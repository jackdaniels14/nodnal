import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import * as browser from '@/lib/agents/browser-pool';

// ─── Tools ───────────────────────────────────────────────────────────────────

const TOOLS: Anthropic.Messages.Tool[] = [
  {
    name: 'navigate',
    description: 'Go to a URL in the browser and read the page content. Returns the page title, URL, and text content. Use this as your primary tool for visiting any website.',
    input_schema: {
      type: 'object' as const,
      properties: { url: { type: 'string', description: 'Full URL to visit' } },
      required: ['url'],
    },
  },
  {
    name: 'read_page',
    description: 'Read the current page content in detail, including all links, buttons, form fields, and text. Use after navigating to understand the page structure.',
    input_schema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'click',
    description: 'Click an element on the page. Use CSS selectors like "button:text(\"Login\")", "#submit", "a:text(\"Sign In\")", "[type=submit]", etc. After clicking, returns the new page state.',
    input_schema: {
      type: 'object' as const,
      properties: { selector: { type: 'string', description: 'CSS or text selector for the element' } },
      required: ['selector'],
    },
  },
  {
    name: 'fill',
    description: 'Type text into a form field. Use CSS selectors like "input[name=email]", "#password", "input[placeholder=Username]", etc.',
    input_schema: {
      type: 'object' as const,
      properties: {
        selector: { type: 'string', description: 'CSS selector for the input field' },
        value: { type: 'string', description: 'Text to type' },
      },
      required: ['selector', 'value'],
    },
  },
  {
    name: 'press_key',
    description: 'Press a keyboard key. Common keys: Enter, Tab, Escape.',
    input_schema: {
      type: 'object' as const,
      properties: { key: { type: 'string', description: 'Key to press' } },
      required: ['key'],
    },
  },
  {
    name: 'screenshot',
    description: 'Take a screenshot of the current page. Use this to see what the page looks like visually.',
    input_schema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'fetch_url',
    description: 'Quick HTTP fetch of a URL — returns raw text content. Use this for simple pages that don\'t need JavaScript. For interactive sites, use navigate instead.',
    input_schema: {
      type: 'object' as const,
      properties: { url: { type: 'string', description: 'URL to fetch' } },
      required: ['url'],
    },
  },
];

// ─── Execute Tool ────────────────────────────────────────────────────────────

async function executeTool(agentId: string, name: string, input: Record<string, string>): Promise<string | Array<{ type: 'image'; source: { type: 'base64'; media_type: 'image/png'; data: string } }>> {
  switch (name) {
    case 'navigate':
      return await browser.navigate(agentId, input.url);

    case 'read_page':
      return await browser.readPage(agentId);

    case 'click':
      return await browser.click(agentId, input.selector);

    case 'fill':
      return await browser.fill(agentId, input.selector, input.value);

    case 'press_key':
      return await browser.pressKey(agentId, input.key);

    case 'screenshot': {
      const base64 = await browser.screenshot(agentId);
      return [{ type: 'image', source: { type: 'base64', media_type: 'image/png', data: base64 } }];
    }

    case 'fetch_url': {
      const res = await fetch(input.url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NodnalBot/1.0)' },
        redirect: 'follow',
      });
      const html = await res.text();
      const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : input.url;
      const clean = html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 6000);
      return `"${title}" (${res.url})\n\n${clean}`;
    }

    default:
      return `Unknown tool: ${name}`;
  }
}

// ─── Main Handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ content: 'ANTHROPIC_API_KEY not set.' });
  }

  const { agentId, messages, systemPrompt, linkedBlockIds, workspaceContext } = await req.json();
  const client = new Anthropic({ apiKey });

  const system = [
    systemPrompt || 'You are a helpful AI agent.',
    '',
    '## Your Tools',
    'You have a real web browser. Use it to visit websites, read content, fill forms, and click buttons.',
    '- navigate: Go to a URL and read the page',
    '- read_page: Read the current page in detail',
    '- click: Click buttons and links',
    '- fill: Type into form fields',
    '- press_key: Press Enter, Tab, etc.',
    '- screenshot: See what the page looks like',
    '- fetch_url: Quick HTTP fetch for simple pages',
    '',
    'IMPORTANT: When asked to visit a website or look something up, ALWAYS use the navigate tool. Do not make up information.',
    '',
    linkedBlockIds?.length ? `Your linked blocks: ${linkedBlockIds.join(', ')}` : '',
    workspaceContext?.length
      ? `Workspace blocks: ${workspaceContext.map((b: { type: string; title: string; id: string }) => `[${b.type}] "${b.title}" (${b.id})`).join(', ')}`
      : '',
    '',
    'You can create blocks on the workspace. Wrap commands in <block-actions>[...]</block-actions>.',
    'Actions: spawn (blockType, title, config), update (blockId, config), remove (blockId).',
    'Block types: stat {statValue, statLabel}, text {textContent}, table {tableHeaders, tableRows}, chart {chartType, chartData}, list {listItems}.',
  ].filter(Boolean).join('\n');

  const apiMessages: Anthropic.Messages.MessageParam[] = messages.map(
    (m: { role: string; content: string }) => ({ role: m.role as 'user' | 'assistant', content: m.content })
  );

  let finalText = '';
  let blockActions: unknown[] = [];

  try {
    // Agent loop — max 15 iterations for complex tasks
    for (let i = 0; i < 15; i++) {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system,
        tools: TOOLS,
        messages: apiMessages,
      });

      const toolCalls: Anthropic.Messages.ToolUseBlock[] = [];
      for (const block of response.content) {
        if (block.type === 'text') finalText += block.text;
        else if (block.type === 'tool_use') toolCalls.push(block);
      }

      // Done if no tool calls
      if (toolCalls.length === 0) break;

      // Add assistant response
      apiMessages.push({ role: 'assistant', content: response.content });

      // Execute tools
      const results: Anthropic.Messages.ToolResultBlockParam[] = [];
      for (const tc of toolCalls) {
        try {
          const result = await executeTool(agentId, tc.name, tc.input as Record<string, string>);
          results.push({
            type: 'tool_result',
            tool_use_id: tc.id,
            content: typeof result === 'string' ? result : result,
          });
        } catch (e) {
          results.push({
            type: 'tool_result',
            tool_use_id: tc.id,
            content: `Tool error: ${e instanceof Error ? e.message : String(e)}`,
            is_error: true,
          });
        }
      }

      apiMessages.push({ role: 'user', content: results });

      // If stop reason is end_turn after tool results, continue to get final response
      if (response.stop_reason === 'end_turn') break;
    }

    // Parse block actions
    let content = finalText;
    const match = finalText.match(/<block-actions>([\s\S]*?)<\/block-actions>/);
    if (match) {
      try {
        blockActions = JSON.parse(match[1]);
        content = finalText.replace(/<block-actions>[\s\S]*?<\/block-actions>/, '').trim();
      } catch { /* keep raw */ }
    }

    return NextResponse.json({ agentId, content, blockActions });

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('credit balance')) {
      return NextResponse.json({ agentId, content: 'Anthropic account has no credits. Add credits at console.anthropic.com/settings/billing.', blockActions: [] });
    }
    return NextResponse.json({ agentId, content: `Error: ${msg}`, blockActions: [] });
  }
}
