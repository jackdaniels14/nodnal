'use client';

import { RecordTypeDef, DataRecord, LayoutTemplate, autoLayoutFromFields } from './record-types';

const TYPES_KEY = 'nodnal-record-types';
const RECORDS_KEY = 'nodnal-records';

// ─── Record Type CRUD ────────────────────────────────────────────────────────

export function getRecordTypes(): RecordTypeDef[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(TYPES_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function getRecordType(id: string): RecordTypeDef | undefined {
  return getRecordTypes().find(t => t.id === id);
}

export function saveRecordType(typeDef: RecordTypeDef): void {
  const types = getRecordTypes();
  const idx = types.findIndex(t => t.id === typeDef.id);
  // Auto-generate layout if none exists
  if (!typeDef.layoutTemplate && typeDef.fields.length > 0) {
    typeDef.layoutTemplate = autoLayoutFromFields(typeDef.fields);
  }
  if (idx >= 0) {
    types[idx] = typeDef;
  } else {
    types.push(typeDef);
  }
  localStorage.setItem(TYPES_KEY, JSON.stringify(types));
}

export function deleteRecordType(id: string): void {
  const types = getRecordTypes().filter(t => t.id !== id);
  localStorage.setItem(TYPES_KEY, JSON.stringify(types));
  // Also delete all records of this type
  const records = getAllRecords().filter(r => r.typeId !== id);
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
}

// ─── Record CRUD ─────────────────────────────────────────────────────────────

export function getAllRecords(): DataRecord[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(RECORDS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function getRecordsByType(typeId: string): DataRecord[] {
  return getAllRecords().filter(r => r.typeId === typeId);
}

export function getRecord(id: string): DataRecord | undefined {
  return getAllRecords().find(r => r.id === id);
}

export function saveRecord(record: DataRecord): void {
  const records = getAllRecords();
  const idx = records.findIndex(r => r.id === record.id);
  if (idx >= 0) {
    records[idx] = { ...record, updatedAt: new Date().toISOString() };
  } else {
    records.push(record);
  }
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
}

export function deleteRecord(id: string): void {
  const records = getAllRecords().filter(r => r.id !== id);
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
}

export function updateLayoutTemplate(typeId: string, template: LayoutTemplate): void {
  const types = getRecordTypes();
  const idx = types.findIndex(t => t.id === typeId);
  if (idx >= 0) {
    types[idx].layoutTemplate = template;
    localStorage.setItem(TYPES_KEY, JSON.stringify(types));
  }
}

// ─── ID Generators ───────────────────────────────────────────────────────────

export function generateTypeId(): string {
  return `rtype-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function generateRecordId(): string {
  return `rec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function generateFieldId(): string {
  return `field-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}
