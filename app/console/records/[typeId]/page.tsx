'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { RecordTypeDef, DataRecord as RecordData, FieldDef } from '@/lib/records/record-types';
import { useRecords, useRecordTypes, generateRecordId } from '@/lib/records/use-records';

// ─── Record Form ─────────────────────────────────────────────────────────────

function RecordForm({ typeDef, record, onSave, onCancel }: {
  typeDef: RecordTypeDef;
  record?: RecordData;
  onSave: (record: RecordData) => void;
  onCancel: () => void;
}) {
  const [data, setData] = useState<{ [key: string]: unknown }>(record?.data ?? {});

  const setField = (fieldId: string, value: unknown) => {
    setData(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleSave = () => {
    const rec: RecordData = {
      id: record?.id ?? generateRecordId(),
      typeId: typeDef.id,
      data,
      createdAt: record?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: record?.createdBy ?? 'manual',
    };
    onSave(rec);
  };

  const renderField = (field: FieldDef) => {
    const value = data[field.id] ?? '';
    const inputClass = "w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500";

    switch (field.type) {
      case 'number':
      case 'currency':
        return <input type="number" value={String(value)} onChange={e => setField(field.id, parseFloat(e.target.value) || 0)} className={inputClass} />;
      case 'boolean':
        return (
          <button onClick={() => setField(field.id, !value)}
            className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${value ? 'bg-emerald-500' : 'bg-gray-600'}`}>
            <span className={`inline-block h-4 w-4 mt-0.5 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </button>
        );
      case 'select':
        return (
          <select value={String(value)} onChange={e => setField(field.id, e.target.value)} className={inputClass}>
            <option value="">Select...</option>
            {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        );
      case 'richtext':
        return <textarea value={String(value)} onChange={e => setField(field.id, e.target.value)} rows={4} className={`${inputClass} resize-none`} />;
      case 'date':
        return <input type="date" value={String(value)} onChange={e => setField(field.id, e.target.value)} className={inputClass} />;
      default:
        return <input type="text" value={String(value)} onChange={e => setField(field.id, e.target.value)} placeholder={field.name} className={inputClass} />;
    }
  };

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 space-y-4 max-w-2xl">
      <h2 className="text-sm font-semibold text-white">{record ? 'Edit Record' : 'New Record'}</h2>
      {typeDef.fields.map(field => (
        <div key={field.id}>
          <label className="block text-xs text-gray-400 mb-1">{field.name} {field.required && <span className="text-red-400">*</span>}</label>
          {renderField(field)}
        </div>
      ))}
      <div className="flex gap-2 pt-2">
        <button onClick={handleSave} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg transition-colors">Save</button>
        <button onClick={onCancel} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded-lg transition-colors">Cancel</button>
      </div>
    </div>
  );
}

// ─── Record Viewer (template layout) ─────────────────────────────────────────

function RecordViewer({ typeDef, record }: { typeDef: RecordTypeDef; record: RecordData }) {
  const template = typeDef.layoutTemplate;

  if (!template || template.blocks.length === 0) {
    // Fallback: simple field list
    return (
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 space-y-3">
        {typeDef.fields.map(field => (
          <div key={field.id} className="flex items-baseline gap-3">
            <span className="text-xs text-gray-500 w-24 flex-shrink-0">{field.name}</span>
            <span className="text-sm text-white">{String(record.data[field.id] ?? '—')}</span>
          </div>
        ))}
      </div>
    );
  }

  // Render using template blocks
  return (
    <div className="grid grid-cols-12 gap-3">
      {template.blocks.map(tb => {
        const resolveValue = (mapping: string): unknown => {
          if (mapping.startsWith('"') && mapping.endsWith('"')) return mapping.slice(1, -1);
          return record.data[mapping] ?? '—';
        };

        const style = {
          gridColumn: `${tb.position.x + 1} / span ${tb.position.w}`,
          gridRow: `${tb.position.y + 1} / span ${tb.position.h}`,
        };

        return (
          <div key={tb.id} className="bg-gray-800 border border-gray-700 rounded-xl p-3" style={style}>
            <p className="text-xs text-gray-500 mb-2">{tb.title}</p>
            {tb.blockType === 'stat' && (
              <div>
                <p className="text-2xl font-bold text-white">{String(resolveValue(tb.fieldMapping.statValue ?? ''))}</p>
                {tb.fieldMapping.statLabel && <p className="text-xs text-gray-400 mt-1">{String(resolveValue(tb.fieldMapping.statLabel))}</p>}
              </div>
            )}
            {tb.blockType === 'text' && (
              <p className="text-sm text-gray-300 whitespace-pre-wrap">{String(resolveValue(tb.fieldMapping.textContent ?? ''))}</p>
            )}
            {tb.blockType === 'list' && (() => {
              const items = resolveValue(tb.fieldMapping.listItems ?? '') as string[] | string;
              const list = Array.isArray(items) ? items : [];
              return (
                <ul className="space-y-1">
                  {list.map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              );
            })()}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function RecordTypePage() {
  const params = useParams();
  const typeId = params.typeId as string;
  const { types, loading: typesLoading } = useRecordTypes();
  const { records, loading: recordsLoading, save: saveRecord, remove: removeRecord } = useRecords(typeId);
  const [view, setView] = useState<'list' | 'create' | 'edit' | 'view'>('list');
  const [selectedRecord, setSelectedRecord] = useState<RecordData | null>(null);

  const typeDef = types.find(t => t.id === typeId) ?? null;

  if (typesLoading || recordsLoading) {
    return <div className="text-center py-16"><p className="text-gray-400">Loading...</p></div>;
  }

  if (!typeDef) {
    return <div className="text-center py-16"><p className="text-gray-400">Record type not found.</p></div>;
  }

  const handleSave = async (record: RecordData) => {
    await saveRecord(record);
    setView('list');
    setSelectedRecord(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this record?')) return;
    await removeRecord(id);
  };

  // Get primary display field (first text-like field)
  const primaryField = typeDef.fields.find(f => ['text', 'email'].includes(f.type)) ?? typeDef.fields[0];

  if (view === 'create' || view === 'edit') {
    return (
      <div className="space-y-4">
        <RecordForm typeDef={typeDef} record={view === 'edit' ? selectedRecord ?? undefined : undefined}
          onSave={handleSave} onCancel={() => setView('list')} />
      </div>
    );
  }

  if (view === 'view' && selectedRecord) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <button onClick={() => { setView('list'); setSelectedRecord(null); }} className="p-1.5 text-gray-400 hover:text-white transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className={`w-8 h-8 ${typeDef.color} rounded-lg flex items-center justify-center`}>
            <span className="text-white text-sm font-bold">{typeDef.icon}</span>
          </div>
          <h1 className="text-lg font-semibold text-white">{primaryField ? String(selectedRecord.data[primaryField.id] ?? 'Untitled') : 'Record'}</h1>
          <button onClick={() => { setView('edit'); }} className="ml-auto px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded-lg transition-colors">Edit</button>
        </div>
        <RecordViewer typeDef={typeDef} record={selectedRecord} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href="/console/records" className="p-1.5 text-gray-400 hover:text-white transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </a>
          <div className={`w-8 h-8 ${typeDef.color} rounded-lg flex items-center justify-center`}>
            <span className="text-white text-sm font-bold">{typeDef.icon}</span>
          </div>
          <h1 className="text-lg font-semibold text-white">{typeDef.name}</h1>
          <span className="text-xs text-gray-500">{records.length} records</span>
        </div>
        <button onClick={() => setView('create')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 text-xs font-medium rounded-lg transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          New Record
        </button>
      </div>

      {records.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-700 rounded-xl">
          <p className="text-sm text-gray-400">No records yet.</p>
          <p className="text-xs text-gray-600 mt-1">Create one manually or let an AI agent populate them.</p>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                {typeDef.fields.slice(0, 5).map(f => (
                  <th key={f.id} className="text-left py-2.5 px-4 text-xs text-gray-400 font-medium">{f.name}</th>
                ))}
                <th className="w-20" />
              </tr>
            </thead>
            <tbody>
              {records.map(rec => (
                <tr key={rec.id} className="border-b border-gray-700/40 hover:bg-gray-700/20 cursor-pointer"
                  onClick={() => { setSelectedRecord(rec); setView('view'); }}>
                  {typeDef.fields.slice(0, 5).map(f => (
                    <td key={f.id} className="py-2.5 px-4 text-gray-300 truncate max-w-[200px]">
                      {f.type === 'boolean' ? (rec.data[f.id] ? 'Yes' : 'No') : String(rec.data[f.id] ?? '—')}
                    </td>
                  ))}
                  <td className="py-2.5 px-4">
                    <div className="flex gap-1 justify-end">
                      <button onClick={e => { e.stopPropagation(); setSelectedRecord(rec); setView('edit'); }}
                        className="p-1 text-gray-500 hover:text-gray-200 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      </button>
                      <button onClick={e => { e.stopPropagation(); handleDelete(rec.id); }}
                        className="p-1 text-gray-500 hover:text-red-400 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
