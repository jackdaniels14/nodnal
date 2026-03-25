import { AgentDef, AgentSession } from './agent-types';

const STORAGE_KEY = 'nodnal-agents';
const SESSIONS_KEY = 'nodnal-agent-sessions';

// ─── Agent CRUD ──────────────────────────────────────────────────────────────

export function getAgents(): AgentDef[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function getAgent(id: string): AgentDef | undefined {
  return getAgents().find(a => a.id === id);
}

export function saveAgent(agent: AgentDef): void {
  const agents = getAgents();
  const idx = agents.findIndex(a => a.id === agent.id);
  if (idx >= 0) {
    agents[idx] = agent;
  } else {
    agents.push(agent);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(agents));
}

export function deleteAgent(id: string): void {
  const agents = getAgents().filter(a => a.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(agents));
  // Also clean up the session
  deleteSession(id);
}

// ─── Session Management ──────────────────────────────────────────────────────
// Each agent gets its own isolated session — no cross-reads.

function getAllSessions(): Record<string, AgentSession> {
  if (typeof window === 'undefined') return {};
  const raw = localStorage.getItem(SESSIONS_KEY);
  return raw ? JSON.parse(raw) : {};
}

function saveAllSessions(sessions: Record<string, AgentSession>): void {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

export function getSession(agentId: string): AgentSession {
  const sessions = getAllSessions();
  if (sessions[agentId]) return sessions[agentId];
  // Create fresh isolated session
  const session: AgentSession = {
    agentId,
    status: 'idle',
    messages: [],
    linkedBlockIds: [],
    lastActiveAt: new Date().toISOString(),
  };
  sessions[agentId] = session;
  saveAllSessions(sessions);
  return session;
}

export function updateSession(agentId: string, updates: Partial<AgentSession>): AgentSession {
  const sessions = getAllSessions();
  const current = sessions[agentId] ?? getSession(agentId);
  const updated = { ...current, ...updates, lastActiveAt: new Date().toISOString() };
  sessions[agentId] = updated;
  saveAllSessions(sessions);
  return updated;
}

export function deleteSession(agentId: string): void {
  const sessions = getAllSessions();
  delete sessions[agentId];
  saveAllSessions(sessions);
}

// ─── Linked Block Tracking ──────────────────────────────────────────────────

export function addLinkedBlock(agentId: string, blockId: string): void {
  const session = getSession(agentId);
  if (!session.linkedBlockIds.includes(blockId)) {
    updateSession(agentId, {
      linkedBlockIds: [...session.linkedBlockIds, blockId],
    });
  }
}

export function removeLinkedBlock(agentId: string, blockId: string): void {
  const session = getSession(agentId);
  updateSession(agentId, {
    linkedBlockIds: session.linkedBlockIds.filter(id => id !== blockId),
  });
}

// ─── ID Generator ────────────────────────────────────────────────────────────

export function generateAgentId(): string {
  return `agent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
