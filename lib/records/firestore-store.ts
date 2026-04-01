'use client';

import {
  collection, doc, getDocs, getDoc, setDoc, deleteDoc, query, where, writeBatch, orderBy,
  Timestamp,
} from 'firebase/firestore';
import db from '@/lib/firestore';
import { RecordTypeDef, DataRecord, LayoutTemplate, autoLayoutFromFields } from './record-types';

// ─── Collections ────────────────────────────────────────────────────────────

const typesCol = () => collection(db, 'record-types');
const recordsCol = () => collection(db, 'records');
const contactsCol = (recordId: string) => collection(db, 'records', recordId, 'contacts');

// ─── Record Type CRUD ───────────────────────────────────────────────────────

export async function getRecordTypes(): Promise<RecordTypeDef[]> {
  const snap = await getDocs(query(typesCol(), orderBy('name')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as RecordTypeDef);
}

export async function getRecordType(id: string): Promise<RecordTypeDef | undefined> {
  const snap = await getDoc(doc(typesCol(), id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as RecordTypeDef) : undefined;
}

export async function saveRecordType(typeDef: RecordTypeDef): Promise<void> {
  if (!typeDef.layoutTemplate && typeDef.fields.length > 0) {
    typeDef.layoutTemplate = autoLayoutFromFields(typeDef.fields);
  }
  const { id, ...data } = typeDef;
  await setDoc(doc(typesCol(), id), data);
}

export async function deleteRecordType(id: string): Promise<void> {
  // Delete all records of this type first
  const records = await getRecordsByType(id);
  const batch = writeBatch(db);
  for (const r of records) {
    batch.delete(doc(recordsCol(), r.id));
  }
  batch.delete(doc(typesCol(), id));
  await batch.commit();
}

// ─── Record CRUD ────────────────────────────────────────────────────────────

export async function getAllRecords(): Promise<DataRecord[]> {
  const snap = await getDocs(query(recordsCol(), orderBy('updatedAt', 'desc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as DataRecord);
}

export async function getRecordsByType(typeId: string): Promise<DataRecord[]> {
  const snap = await getDocs(query(recordsCol(), where('typeId', '==', typeId), orderBy('updatedAt', 'desc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as DataRecord);
}

export async function getRecord(id: string): Promise<DataRecord | undefined> {
  const snap = await getDoc(doc(recordsCol(), id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as DataRecord) : undefined;
}

export async function saveRecord(record: DataRecord): Promise<void> {
  const { id, ...data } = { ...record, updatedAt: new Date().toISOString() };
  await setDoc(doc(recordsCol(), id), data);
}

export async function deleteRecord(id: string): Promise<void> {
  await deleteDoc(doc(recordsCol(), id));
}

export async function updateLayoutTemplate(typeId: string, template: LayoutTemplate): Promise<void> {
  const typeDef = await getRecordType(typeId);
  if (typeDef) {
    await setDoc(doc(typesCol(), typeId), { ...typeDef, layoutTemplate: template, id: undefined });
  }
}

// ─── Contacts (sub-collection) ──────────────────────────────────────────────

export interface Contact {
  id: string;
  state: 'Active' | 'Inactive';
  contactType: string;
  name: string;
  email?: string;
  phone?: string;
  cell?: string;
  linkedUser?: string;
}

export async function getContacts(recordId: string): Promise<Contact[]> {
  const snap = await getDocs(contactsCol(recordId));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Contact);
}

export async function saveContact(recordId: string, contact: Contact): Promise<void> {
  const { id, ...data } = contact;
  await setDoc(doc(contactsCol(recordId), id), data);
}

export async function deleteContact(recordId: string, contactId: string): Promise<void> {
  await deleteDoc(doc(contactsCol(recordId), contactId));
}

// ─── Batch Import ───────────────────────────────────────────────────────────

export async function batchSaveRecords(records: DataRecord[]): Promise<void> {
  // Firestore batch limit is 500, chunk if needed
  const chunks = [];
  for (let i = 0; i < records.length; i += 450) {
    chunks.push(records.slice(i, i + 450));
  }
  for (const chunk of chunks) {
    const batch = writeBatch(db);
    for (const record of chunk) {
      const { id, ...data } = record;
      batch.set(doc(recordsCol(), id), data);
    }
    await batch.commit();
  }
}

// ─── ID Generators ──────────────────────────────────────────────────────────

export function generateTypeId(): string {
  return `rtype-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function generateRecordId(): string {
  return `rec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function generateFieldId(): string {
  return `field-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}
