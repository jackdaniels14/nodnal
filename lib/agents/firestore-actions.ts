// ─── Firestore Action Executor ──────────────────────────────────────────────
// Runs FirestoreAction payloads emitted by agents against the client Firestore
// SDK. Writes happen under the user's auth (firestore.rules require it), so
// this mirrors the same capability the user already has in the UI — the agent
// is just driving it. Every action is logged to `agent-audit` so there is a
// record of what an agent did.

import {
  collection as fsCollection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import db from '@/lib/firestore';
import { FirestoreAction } from './agent-types';

const MAX_ACTIONS_PER_MESSAGE = 20;

export interface FirestoreActionResult {
  kind: FirestoreAction['kind'];
  collection: string;
  id?: string;
  ok: boolean;
  error?: string;
}

async function writeAudit(agentId: string, action: FirestoreAction, result: FirestoreActionResult) {
  try {
    await addDoc(fsCollection(db, 'agent-audit'), {
      agentId,
      kind: action.kind,
      collection: action.collection,
      targetId: action.id ?? result.id ?? null,
      data: action.data ?? null,
      ok: result.ok,
      error: result.error ?? null,
      ts: serverTimestamp(),
    });
  } catch (err) {
    console.warn('[agent-audit] failed to write audit entry:', err);
  }
}

async function runOne(agentId: string, action: FirestoreAction): Promise<FirestoreActionResult> {
  const result: FirestoreActionResult = {
    kind: action.kind,
    collection: action.collection,
    id: action.id,
    ok: false,
  };

  try {
    if (!action.collection || typeof action.collection !== 'string') {
      throw new Error('collection is required');
    }

    switch (action.kind) {
      case 'firestore.create': {
        if (action.id) {
          await setDoc(doc(db, action.collection, action.id), {
            ...(action.data ?? {}),
            createdByAgent: agentId,
            createdAt: serverTimestamp(),
          });
          result.id = action.id;
        } else {
          const ref = await addDoc(fsCollection(db, action.collection), {
            ...(action.data ?? {}),
            createdByAgent: agentId,
            createdAt: serverTimestamp(),
          });
          result.id = ref.id;
        }
        break;
      }
      case 'firestore.update': {
        if (!action.id) throw new Error('id is required for firestore.update');
        await updateDoc(doc(db, action.collection, action.id), {
          ...(action.data ?? {}),
          updatedByAgent: agentId,
          updatedAt: serverTimestamp(),
        });
        break;
      }
      case 'firestore.remove': {
        if (!action.id) throw new Error('id is required for firestore.remove');
        await deleteDoc(doc(db, action.collection, action.id));
        break;
      }
      default:
        throw new Error(`unknown kind: ${(action as { kind: string }).kind}`);
    }
    result.ok = true;
  } catch (err) {
    result.error = err instanceof Error ? err.message : String(err);
  }

  await writeAudit(agentId, action, result);
  return result;
}

export async function runFirestoreActions(
  agentId: string,
  actions: FirestoreAction[],
): Promise<FirestoreActionResult[]> {
  if (!actions.length) return [];
  const capped = actions.slice(0, MAX_ACTIONS_PER_MESSAGE);
  const results: FirestoreActionResult[] = [];
  for (const action of capped) {
    results.push(await runOne(agentId, action));
  }
  if (actions.length > MAX_ACTIONS_PER_MESSAGE) {
    console.warn(`[agent-actions] dropped ${actions.length - MAX_ACTIONS_PER_MESSAGE} actions (rate limit: ${MAX_ACTIONS_PER_MESSAGE}/message)`);
  }
  return results;
}
