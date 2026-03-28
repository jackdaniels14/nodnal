import express from 'express';
import cors from 'cors';
import { query } from '@anthropic-ai/claude-agent-sdk';
import { browserServer, cleanupSessions } from './browser-tools.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const PORT = process.env.AGENT_PORT || 3100;

// ─── Health Check ────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'nodnal-agent-server' });
});

// ─── Agent Chat Endpoint ─────────────────────────────────────────────────────

app.post('/api/agent/chat', async (req, res) => {
  const { agentId, prompt, systemPrompt, context } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'prompt is required' });
  }

  const fullPrompt = [
    context ? `Context:\n${context}\n\n` : '',
    prompt,
  ].join('');

  try {
    let finalText = '';
    const toolCalls = [];

    for await (const message of query({
      prompt: fullPrompt,
      options: {
        systemPrompt: systemPrompt || 'You are a helpful AI agent with browser tools. Use them to visit websites, read content, fill forms, and click buttons.',
        mcpServers: {
          browser: browserServer,
        },
        allowedTools: [
          'mcp__browser__navigate',
          'mcp__browser__read_page',
          'mcp__browser__click',
          'mcp__browser__fill',
          'mcp__browser__press_key',
          'mcp__browser__screenshot',
          'mcp__browser__fetch_url',
        ],
        tools: [], // disable built-in file tools
        maxTurns: 20,
        env: {
          ...process.env,
          ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
        },
      },
    })) {
      if (message.type === 'assistant') {
        for (const block of message.message?.content || []) {
          if (block.type === 'text') {
            finalText += block.text;
          }
          if (block.type === 'tool_use') {
            toolCalls.push({ name: block.name, input: block.input });
          }
        }
      }

      if (message.type === 'result') {
        if (message.subtype === 'success' && message.result) {
          finalText = message.result;
        }
        if (message.subtype === 'error') {
          finalText = `Error: ${message.error || 'Unknown error'}`;
        }
      }
    }

    // Parse block actions from response
    let content = finalText;
    let blockActions = [];
    const match = finalText.match(/<block-actions>([\s\S]*?)<\/block-actions>/);
    if (match) {
      try {
        blockActions = JSON.parse(match[1]);
        content = finalText.replace(/<block-actions>[\s\S]*?<\/block-actions>/, '').trim();
      } catch { /* keep raw */ }
    }

    res.json({ agentId, content, blockActions, toolCalls });
  } catch (err) {
    console.error('Agent error:', err);
    res.status(500).json({
      agentId,
      content: `Agent error: ${err.message || String(err)}`,
      blockActions: [],
    });
  }
});

// ─── Cleanup on exit ─────────────────────────────────────────────────────────

process.on('SIGINT', () => { cleanupSessions(); process.exit(0); });
process.on('SIGTERM', () => { cleanupSessions(); process.exit(0); });

// ─── Start ───────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Agent server running on http://localhost:${PORT}`);
  console.log(`Browser tools: navigate, read_page, click, fill, press_key, screenshot, fetch_url`);
  console.log(`Browserless: ${process.env.BROWSERLESS_API_KEY ? 'configured' : 'local browser'}`);
});
