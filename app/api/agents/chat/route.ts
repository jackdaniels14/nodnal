import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ content: 'ANTHROPIC_API_KEY not set in .env.local.' });
  }

  const { agentId, messages, systemPrompt, linkedBlockIds } = await req.json();

  const client = new Anthropic({ apiKey });

  // Build agent-scoped system prompt
  const agentSystem = [
    systemPrompt || 'You are a helpful AI agent.',
    '',
    'You are scoped to a specific agent session. You can only interact with blocks you own.',
    linkedBlockIds?.length
      ? `Your linked blocks: ${linkedBlockIds.join(', ')}`
      : 'You have no linked blocks yet.',
    '',
    'When you want to create, update, or remove blocks on the workspace, include a JSON block in your response wrapped in <block-actions> tags.',
    'Format: <block-actions>[{"action":"spawn","blockType":"stat","title":"...","config":{...},"position":{"x":0,"y":0,"w":2,"h":2}},...]</block-actions>',
    'Available block types: stat, text, table, chart, list, link',
    'Only include <block-actions> when the user asks you to display data or create visual outputs.',
  ].join('\n');

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: agentSystem,
    messages: messages.map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  });

  const rawContent = response.content[0].type === 'text' ? response.content[0].text : '';

  // Parse block actions from response
  let content = rawContent;
  let blockActions = [];

  const actionsMatch = rawContent.match(/<block-actions>([\s\S]*?)<\/block-actions>/);
  if (actionsMatch) {
    try {
      blockActions = JSON.parse(actionsMatch[1]);
      // Remove the tag from visible content
      content = rawContent.replace(/<block-actions>[\s\S]*?<\/block-actions>/, '').trim();
    } catch {
      // If parsing fails, just show the raw content
    }
  }

  return NextResponse.json({ agentId, content, blockActions });
}
