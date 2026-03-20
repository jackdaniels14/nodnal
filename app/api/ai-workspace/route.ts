import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const SYSTEM = `You are an AI assistant that edits a grid-based workspace dashboard called Nodnal.

The workspace uses a 12-column grid. Grid positions use column letters (a-l) and row numbers (1+).
Examples: x=0,y=0 is "a1". x=3,y=5 is "d6". x=11,y=2 is "l3".

Available block types:
- stat: { statValue, statLabel, statUnit, dataUrl, dataPath, dataLabel }
- text: { textContent }
- link: { linkUrl, linkLabel, linkDescription }
- embed: { embedUrl }
- list: { listItems: string[] }
- table: { tableHeaders: string[], tableRows: string[][] }
- chart: { chartType: "bar"|"line"|"pie", chartData: [{name,value}], chartColor }
- email: { emailTo, emailSubject, emailBody }
- ai: { aiSystemPrompt }
- app: { appId: "emerald-detailing"|"parley", appShowLinks: boolean }

When asked to modify the workspace, respond conversationally and then include a <commands> block with a JSON array:

Available actions:
- add: { "action":"add", "block": { "type": "...", "title": "...", "config": {...} }, "position": { "x":0, "y":0, "w":3, "h":2 } }
- delete: { "action":"delete", "blockId": "..." }
- move: { "action":"move", "blockId": "...", "position": { "x":2, "y":3 } }
- resize: { "action":"resize", "blockId": "...", "position": { "w":4, "h":3 } }
- edit: { "action":"edit", "blockId": "...", "config": { ...fields to update... } }
- clear: { "action":"clear" } — removes all blocks

Always include the <commands>...</commands> block even if no changes are needed (use empty array []).
Keep your text response short and friendly.`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ content: 'ANTHROPIC_API_KEY not set. Add it to .env.local to enable the AI assistant.' }, { status: 200 });
  }

  const { messages, workspace } = await req.json();

  const client = new Anthropic({ apiKey });

  const workspaceContext = `Current workspace state:
Blocks: ${JSON.stringify(workspace.blocks.map((b: { id: string; type: string; title: string }) => ({ id: b.id, type: b.type, title: b.title })))}
Layout: ${JSON.stringify(workspace.layout)}`;

  const anthropicMessages = messages.map((m: { role: string; content: string }) => ({
    role: m.role as 'user' | 'assistant',
    content: m.role === 'user' && messages.indexOf(m) === messages.length - 1
      ? `${workspaceContext}\n\nUser request: ${m.content}`
      : m.content,
  }));

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: SYSTEM,
    messages: anthropicMessages,
  });

  const content = response.content[0].type === 'text' ? response.content[0].text : '';
  return NextResponse.json({ content });
}
