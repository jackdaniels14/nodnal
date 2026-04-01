'use client';

import { useState, useEffect, useCallback } from 'react';
import { RecordTypeDef, DataRecord } from './record-types';
import * as store from './firestore-store';

export { generateTypeId, generateRecordId, generateFieldId } from './firestore-store';
export type { Contact } from './firestore-store';

// ─── Hook: useRecordTypes ───────────────────────────────────────────────────

export function useRecordTypes() {
  const [types, setTypes] = useState<RecordTypeDef[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await store.getRecordTypes();
    setTypes(data);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const save = useCallback(async (typeDef: RecordTypeDef) => {
    await store.saveRecordType(typeDef);
    await refresh();
  }, [refresh]);

  const remove = useCallback(async (id: string) => {
    await store.deleteRecordType(id);
    await refresh();
  }, [refresh]);

  return { types, loading, refresh, save, remove };
}

// ─── Hook: useRecords ───────────────────────────────────────────────────────

export function useRecords(typeId?: string) {
  const [records, setRecords] = useState<DataRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = typeId
      ? await store.getRecordsByType(typeId)
      : await store.getAllRecords();
    setRecords(data);
    setLoading(false);
  }, [typeId]);

  useEffect(() => { refresh(); }, [refresh]);

  const save = useCallback(async (record: DataRecord) => {
    await store.saveRecord(record);
    await refresh();
  }, [refresh]);

  const remove = useCallback(async (id: string) => {
    await store.deleteRecord(id);
    await refresh();
  }, [refresh]);

  return { records, loading, refresh, save, remove };
}

// ─── Hook: useContacts ──────────────────────────────────────────────────────

export function useContacts(recordId: string | null) {
  const [contacts, setContacts] = useState<store.Contact[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!recordId) { setContacts([]); setLoading(false); return; }
    setLoading(true);
    const data = await store.getContacts(recordId);
    setContacts(data);
    setLoading(false);
  }, [recordId]);

  useEffect(() => { refresh(); }, [refresh]);

  const save = useCallback(async (contact: store.Contact) => {
    if (!recordId) return;
    await store.saveContact(recordId, contact);
    await refresh();
  }, [recordId, refresh]);

  const remove = useCallback(async (contactId: string) => {
    if (!recordId) return;
    await store.deleteContact(recordId, contactId);
    await refresh();
  }, [recordId, refresh]);

  return { contacts, loading, refresh, save, remove };
}

// ─── Direct async helpers (for one-off calls) ──────────────────────────────

export const getRecordType = store.getRecordType;
export const getRecord = store.getRecord;
export const batchSaveRecords = store.batchSaveRecords;
export const saveRecordType = store.saveRecordType;
export const saveRecord = store.saveRecord;
