'use client';

import {
  collection, doc, getDocs, getDoc, setDoc, deleteDoc, query, orderBy, where, writeBatch,
} from 'firebase/firestore';
import db from '@/lib/firestore';
import { AgentDef, AgentSession, AgentMessage } from './agent-types';

// ─── Collections ────────────────────────────────────────────────────────────

const agentsCol = () => collection(db, 'agents');
const sessionsCol = () => collection(db, 'agent-sessions');
const memoryCol = (agentId: string) => collection(db, 'agents', agentId, 'memory');

// ─── Agent CRUD ─────────────────────────────────────────────────────────────

export async function getAgents(): Promise<AgentDef[]> {
  const snap = await getDocs(query(agentsCol(), orderBy('name')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as AgentDef);
}

export async function getAgent(id: string): Promise<AgentDef | undefined> {
  const snap = await getDoc(doc(agentsCol(), id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as AgentDef) : undefined;
}

export async function saveAgent(agent: AgentDef): Promise<void> {
  const { id, ...data } = agent;
  await setDoc(doc(agentsCol(), id), data);
}

export async function deleteAgent(id: string): Promise<void> {
  await deleteDoc(doc(agentsCol(), id));
  // Also clean up the session
  await deleteSession(id);
}

// ─── Session Management ─────────────────────────────────────────────────────

export async function getSession(agentId: string): Promise<AgentSession> {
  const snap = await getDoc(doc(sessionsCol(), agentId));
  if (snap.exists()) return { agentId, ...snap.data() } as AgentSession;
  // Create fresh isolated session
  const session: AgentSession = {
    agentId,
    status: 'idle',
    messages: [],
    linkedBlockIds: [],
    lastActiveAt: new Date().toISOString(),
  };
  await setDoc(doc(sessionsCol(), agentId), session);
  return session;
}

export async function updateSession(agentId: string, updates: Partial<AgentSession>): Promise<AgentSession> {
  const current = await getSession(agentId);
  const updated = { ...current, ...updates, lastActiveAt: new Date().toISOString() };
  const { agentId: _, ...data } = updated;
  await setDoc(doc(sessionsCol(), agentId), data);
  return updated;
}

export async function deleteSession(agentId: string): Promise<void> {
  await deleteDoc(doc(sessionsCol(), agentId));
}

// ─── Agent Memory ───────────────────────────────────────────────────────────
// Persistent facts/knowledge that survives across sessions.

export interface AgentMemory {
  id: string;
  agentId: string;
  type: 'fact' | 'preference' | 'relationship' | 'task' | 'observation';
  content: string;
  source?: string;         // where this memory came from (e.g. "ouzo-erp", "user", "self")
  relatedRecordId?: string; // link to a property account or other record
  confidence: number;       // 0-1, how confident the agent is in this memory
  createdAt: string;
  updatedAt: string;
}

export async function getMemories(agentId: string): Promise<AgentMemory[]> {
  const snap = await getDocs(query(memoryCol(agentId), orderBy('updatedAt', 'desc')));
  return snap.docs.map(d => ({ id: d.id, agentId, ...d.data() }) as AgentMemory);
}

export async function getMemoriesByType(agentId: string, type: AgentMemory['type']): Promise<AgentMemory[]> {
  const snap = await getDocs(query(memoryCol(agentId), where('type', '==', type)));
  return snap.docs.map(d => ({ id: d.id, agentId, ...d.data() }) as AgentMemory);
}

export async function getMemoriesForRecord(agentId: string, recordId: string): Promise<AgentMemory[]> {
  const snap = await getDocs(query(memoryCol(agentId), where('relatedRecordId', '==', recordId)));
  return snap.docs.map(d => ({ id: d.id, agentId, ...d.data() }) as AgentMemory);
}

export async function saveMemory(memory: AgentMemory): Promise<void> {
  const { id, agentId, ...data } = memory;
  await setDoc(doc(memoryCol(agentId), id), { ...data, updatedAt: new Date().toISOString() });
}

export async function deleteMemory(agentId: string, memoryId: string): Promise<void> {
  await deleteDoc(doc(memoryCol(agentId), memoryId));
}

export async function searchMemories(agentId: string, query_text: string): Promise<AgentMemory[]> {
  // Client-side search since Firestore doesn't support full-text search
  const all = await getMemories(agentId);
  const q = query_text.toLowerCase();
  return all.filter(m => m.content.toLowerCase().includes(q));
}

// ─── Linked Block Tracking ──────────────────────────────────────────────────

export async function addLinkedBlock(agentId: string, blockId: string): Promise<void> {
  const session = await getSession(agentId);
  if (!session.linkedBlockIds.includes(blockId)) {
    await updateSession(agentId, {
      linkedBlockIds: [...session.linkedBlockIds, blockId],
    });
  }
}

export async function removeLinkedBlock(agentId: string, blockId: string): Promise<void> {
  const session = await getSession(agentId);
  await updateSession(agentId, {
    linkedBlockIds: session.linkedBlockIds.filter(id => id !== blockId),
  });
}

// ─── ID Generator ───────────────────────────────────────────────────────────

export function generateAgentId(): string {
  return `agent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function generateMemoryId(): string {
  return `mem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
