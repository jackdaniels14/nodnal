'use client';

import { useState, useEffect, useCallback } from 'react';
import { AgentDef, AgentSession } from './agent-types';
import * as store from './firestore-agents';

export { generateAgentId, generateMemoryId } from './firestore-agents';
export type { AgentMemory } from './firestore-agents';

// ─── Hook: useAgents ────────────────────────────────────────────────────────

export function useAgents() {
  const [agents, setAgents] = useState<AgentDef[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await store.getAgents();
    setAgents(data);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const save = useCallback(async (agent: AgentDef) => {
    await store.saveAgent(agent);
    await refresh();
  }, [refresh]);

  const remove = useCallback(async (id: string) => {
    await store.deleteAgent(id);
    await refresh();
  }, [refresh]);

  return { agents, loading, refresh, save, remove };
}

// ─── Hook: useAgentSession ──────────────────────────────────────────────────

export function useAgentSession(agentId: string | null) {
  const [session, setSession] = useState<AgentSession | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!agentId) { setSession(null); setLoading(false); return; }
    setLoading(true);
    const data = await store.getSession(agentId);
    setSession(data);
    setLoading(false);
  }, [agentId]);

  useEffect(() => { refresh(); }, [refresh]);

  const update = useCallback(async (updates: Partial<AgentSession>) => {
    if (!agentId) return null;
    const updated = await store.updateSession(agentId, updates);
    setSession(updated);
    return updated;
  }, [agentId]);

  return { session, loading, refresh, update };
}

// ─── Hook: useAgentMemory ───────────────────────────────────────────────────

export function useAgentMemory(agentId: string | null) {
  const [memories, setMemories] = useState<store.AgentMemory[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!agentId) { setMemories([]); setLoading(false); return; }
    setLoading(true);
    const data = await store.getMemories(agentId);
    setMemories(data);
    setLoading(false);
  }, [agentId]);

  useEffect(() => { refresh(); }, [refresh]);

  const save = useCallback(async (memory: store.AgentMemory) => {
    await store.saveMemory(memory);
    await refresh();
  }, [refresh]);

  const remove = useCallback(async (memoryId: string) => {
    if (!agentId) return;
    await store.deleteMemory(agentId, memoryId);
    await refresh();
  }, [agentId, refresh]);

  const search = useCallback(async (query: string) => {
    if (!agentId) return [];
    return store.searchMemories(agentId, query);
  }, [agentId]);

  return { memories, loading, refresh, save, remove, search };
}

// ─── Direct helpers ─────────────────────────────────────────────────────────

export const getAgent = store.getAgent;
export const getAgents = store.getAgents;
export const saveAgent = store.saveAgent;
export const getSession = store.getSession;
export const updateSession = store.updateSession;
export const getMemories = store.getMemories;
export const getMemoriesForRecord = store.getMemoriesForRecord;
export const saveMemory = store.saveMemory;
