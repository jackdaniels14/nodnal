import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import * as browserPool from '@/lib/agents/browser-pool';

// ─── Browser Tools for Claude ────────────────────────────────────────────────

const BROWSER_TOOLS: Anthropic.Messages.Tool[] = [
  {
    name: 'browser_navigate',
    description: 'Navigate to a URL in the browser. Use this to visit websites, login pages, dashboards, etc.',
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
    description: 'Take a screenshot of the current page. Use this to see what is on the page.',
    input_schema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'browser_read_page',
    description: 'Read the text content of the current page including links, buttons, and form fields. Use this to understand the page structure and content.',
    input_schema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'browser_click',
    description: 'Click an element on the page. Use CSS selectors like "button:has-text(\'Login\')", "#submit-btn", "a[href=\'/invoices\']", etc.',
    input_schema: {
      type: 'object' as const,
      properties: {
        selector: { type: 'string', description: 'CSS selector or text selector for the element to click' },
      },
      required: ['selector'],
    },
  },
  {
    name: 'browser_fill',
    description: 'Fill in a form field. Use CSS selectors like "input[name=\'email\']", "#password", "textarea.notes", etc.',
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
    description: 'Press a keyboard key. Use for Enter, Tab, Escape, etc.',
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

async function executeBrowserTool(
  agentId: string,
  toolName: string,
  input: Record<string, string>
): Promise<Anthropic.Messages.ToolResultBlockParam> {
  try {
    switch (toolName) {
      case 'browser_navigate': {
        const result = await browserPool.navigate(agentId, input.url);
        return {
          type: 'tool_result',
          tool_use_id: '', // filled by caller
          content: `Navigated to "${result.title}" (${result.url})`,
        };
      }
      case 'browser_screenshot': {
        const base64 = await browserPool.screenshot(agentId);
        return {
          type: 'tool_result',
          tool_use_id: '',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: 'image/png', data: base64 },
            },
          ],
        };
      }
      case 'browser_read_page': {
        const text = await browserPool.getPageContent(agentId);
        return {
          type: 'tool_result',
          tool_use_id: '',
          content: text || '(empty page)',
        };
      }
      case 'browser_click': {
        const result = await browserPool.click(agentId, input.selector);
        return {
          type: 'tool_result',
          tool_use_id: '',
          content: result.success ? `Clicked "${input.selector}"` : `Failed to click: ${result.error}`,
        };
      }
      case 'browser_fill': {
        const result = await browserPool.fill(agentId, input.selector, input.value);
        return {
          type: 'tool_result',
          tool_use_id: '',
          content: result.success ? `Filled "${input.selector}" with value` : `Failed to fill: ${result.error}`,
        };
      }
      case 'browser_press': {
        const result = await browserPool.press(agentId, input.key);
        return {
          type: 'tool_result',
          tool_use_id: '',
          content: result.success ? `Pressed "${input.key}"` : `Failed to press: ${result.error}`,
        };
      }
      default:
        return {
          type: 'tool_result',
          tool_use_id: '',
          content: `Unknown tool: ${toolName}`,
        };
    }
  } catch (e) {
    return {
      type: 'tool_result',
      tool_use_id: '',
      content: `Error: ${String(e)}`,
      is_error: true,
    };
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
    'You have access to a browser you can use to navigate websites, read content, fill forms, and click elements.',
    'Use the browser tools when the user asks you to interact with a website.',
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
      tools: BROWSER_TOOLS,
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
      const result = await executeBrowserTool(
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
