'use client';

import {
  collection, doc, getDocs, getDoc, setDoc, deleteDoc, query, where, orderBy, onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import db from '@/lib/firestore';

// ─── Types ──────────────────────────────────────────────────────────────────

export type TaskStatus = 'pending' | 'running' | 'completed' | 'error';

export interface AgentTask {
  id: string;
  agentId: string;
  agentName: string;
  agentColor: string;
  agentInitial: string;
  instruction: string;        // what the agent was asked to do
  result?: string;            // the agent's response when done
  status: TaskStatus;
  error?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

// ─── Collection ─────────────────────────────────────────────────────────────

const tasksCol = () => collection(db, 'agent-tasks');

// ─── CRUD ───────────────────────────────────────────────────────────────────

export async function createTask(task: AgentTask): Promise<void> {
  const { id, ...data } = task;
  await setDoc(doc(tasksCol(), id), data);
}

export async function updateTask(id: string, updates: Partial<AgentTask>): Promise<void> {
  const snap = await getDoc(doc(tasksCol(), id));
  if (snap.exists()) {
    await setDoc(doc(tasksCol(), id), { ...snap.data(), ...updates });
  }
}

export async function getTask(id: string): Promise<AgentTask | undefined> {
  const snap = await getDoc(doc(tasksCol(), id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as AgentTask) : undefined;
}

export async function getActiveTasks(): Promise<AgentTask[]> {
  const snap = await getDocs(query(tasksCol(), where('status', 'in', ['pending', 'running']), orderBy('createdAt', 'desc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as AgentTask);
}

export async function getRecentTasks(limit = 20): Promise<AgentTask[]> {
  const snap = await getDocs(query(tasksCol(), orderBy('createdAt', 'desc')));
  return snap.docs.slice(0, limit).map(d => ({ id: d.id, ...d.data() }) as AgentTask);
}

export async function deleteTask(id: string): Promise<void> {
  await deleteDoc(doc(tasksCol(), id));
}

// ─── Real-time listener ─────────────────────────────────────────────────────

export function onTasksChanged(callback: (tasks: AgentTask[]) => void): Unsubscribe {
  return onSnapshot(
    query(tasksCol(), orderBy('createdAt', 'desc')),
    (snap) => {
      const tasks = snap.docs.map(d => ({ id: d.id, ...d.data() }) as AgentTask);
      callback(tasks);
    }
  );
}

// ─── ID Generator ───────────────────────────────────────────────────────────

export function generateTaskId(): string {
  return `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
