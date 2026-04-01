import { NextRequest, NextResponse } from 'next/server';
import { doc, setDoc, getFirestore } from 'firebase/firestore';
import firebaseApp from '@/lib/firebase';

const db = getFirestore(firebaseApp);
const BRIDGE_URL = process.env.OPENCLAW_BRIDGE_URL || 'http://34.67.77.7:18850';
const BRIDGE_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || 'nodnal-openclaw-secret-2026';

// POST: Start a background agent task
// Returns immediately with the task ID, then processes async

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { taskId, agentId, agentName, agentColor, agentInitial, instruction, agentCapabilities, agentSystemPrompt, agentDescription, agentTargetUrl } = body;

  if (!taskId || !agentId || !instruction) {
    return NextResponse.json({ error: 'taskId, agentId, and instruction required' }, { status: 400 });
  }

  // Build system prompt
  const name = agentName || 'Agent';
  const parts: string[] = [];
  parts.push(`You are "${name}", an AI agent in the Nodnal workspace.`);
  parts.push(`IMPORTANT: You are NOT Claude. You are ${name}. Never identify as Claude. Always identify as ${name}.`);
  if (agentDescription) parts.push(`Your role: ${agentDescription}`);
  if (agentTargetUrl) parts.push(`Your target system: ${agentTargetUrl}`);
  if (agentCapabilities?.length) parts.push(`Your capabilities: ${agentCapabilities.join(', ')}`);
  if (agentSystemPrompt) parts.push(`\nCustom instructions:\n${agentSystemPrompt}`);
  parts.push(`\nWhen responding, stay in character as ${name}. Be helpful and concise — Landon reads on iPad.`);
  parts.push(`Read AGENT_ROLES.md and CREDENTIALS.md in your workspace for your full rules and login credentials.`);
  const systemPrompt = parts.join('\n');

  // Write task as 'running' to Firestore immediately
  const taskRef = doc(db, 'agent-tasks', taskId);
  await setDoc(taskRef, {
    agentId,
    agentName: agentName || 'Agent',
    agentColor: agentColor || 'bg-gray-500',
    agentInitial: agentInitial || 'A',
    instruction,
    status: 'running',
    createdAt: new Date().toISOString(),
    startedAt: new Date().toISOString(),
  });

  // Fire and forget — process in background
  const hasBrowser = Array.isArray(agentCapabilities) && agentCapabilities.includes('browser');

  processTask(taskId, agentId, instruction, systemPrompt, hasBrowser).catch(err => {
    console.error(`[agent-task] ${taskId} failed:`, err);
  });

  return NextResponse.json({ taskId, status: 'running' });
}

// ─── Background processing ──────────────────────────────────────────────────

async function processTask(taskId: string, agentId: string, instruction: string, systemPrompt: string, hasBrowser: boolean) {
  const taskRef = doc(db, 'agent-tasks', taskId);

  try {
    let result: string;

    if (hasBrowser) {
      // Use OpenClaw bridge
      const res = await fetch(BRIDGE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${BRIDGE_TOKEN}` },
        body: JSON.stringify({
          sessionKey: `agent:main:nodnal-${agentId}`,
          message: instruction,
          systemPrompt,
        }),
        signal: AbortSignal.timeout(180000),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Bridge error: ${res.status}`);
      result = data.text || '';
    } else {
      // Use Anthropic API directly
      const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
      if (!apiKey) throw new Error('No ANTHROPIC_API_KEY set');

      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const client = new Anthropic({ apiKey });

      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: systemPrompt,
        tools: [
          { name: 'web_search', type: 'web_search_20250305' as const },
          { name: 'web_fetch', type: 'web_fetch_20250910' as const },
        ],
        messages: [{ role: 'user', content: instruction }],
      });

      result = response.content
        .filter(b => b.type === 'text')
        .map(b => b.type === 'text' ? b.text : '')
        .join('\n');
    }

    // Mark complete
    await setDoc(taskRef, {
      agentId,
      status: 'completed',
      result,
      completedAt: new Date().toISOString(),
    }, { merge: true });

  } catch (err) {
    // Mark error
    await setDoc(taskRef, {
      status: 'error',
      error: err instanceof Error ? err.message : String(err),
      completedAt: new Date().toISOString(),
    }, { merge: true });
  }
}
