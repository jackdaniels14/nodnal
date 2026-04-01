'use client';

import { useState, useEffect, useMemo } from 'react';
import { RecordTypeDef, DataRecord, FieldDef, FieldType } from '@/lib/records/record-types';
import { useRecordTypes, useRecords, generateTypeId, generateFieldId, generateRecordId } from '@/lib/records/use-records';
import AccountDetailView from '@/components/records/AccountDetailView';

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'Text' }, { value: 'number', label: 'Number' }, { value: 'currency', label: 'Currency' },
  { value: 'email', label: 'Email' }, { value: 'url', label: 'URL' }, { value: 'date', label: 'Date' },
  { value: 'boolean', label: 'Yes/No' }, { value: 'select', label: 'Dropdown' }, { value: 'list', label: 'List' },
  { value: 'richtext', label: 'Rich Text' },
];

export default function EntriesPage() {
  const { types, loading: typesLoading, save: saveRecordType, remove: removeRecordType } = useRecordTypes();
  const { records, loading: recordsLoading, save: saveRecordHook, remove: removeRecordHook } = useRecords();
  const [selectedType, setSelectedType] = useState<string | null>(null);

  // Auto-select first type
  useEffect(() => {
    if (types.length > 0 && !selectedType) setSelectedType(types[0].id);
  }, [types, selectedType]);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'list' | 'create-type' | 'create-record' | 'view'>('list');
  const [viewRecord, setViewRecord] = useState<DataRecord | null>(null);

  // Type form
  const [typeName, setTypeName] = useState('');
  const [typeFields, setTypeFields] = useState<FieldDef[]>([]);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<FieldType>('text');

  // Record form
  const [recordData, setRecordData] = useState<Record<string, unknown>>({});

  const filtered = useMemo(() => {
    let recs = selectedType ? records.filter(r => r.typeId === selectedType) : records;
    if (search) {
      const q = search.toLowerCase();
      recs = recs.filter(r => JSON.stringify(r.data).toLowerCase().includes(q));
    }
    return recs;
  }, [records, selectedType, search]);

  const currentType = selectedType ? types.find(t => t.id === selectedType) : null;

  const saveType = async () => {
    if (!typeName.trim()) return;
    await saveRecordType({ id: generateTypeId(), name: typeName.trim(), icon: typeName[0].toUpperCase(), color: 'bg-emerald-500', fields: typeFields, createdAt: new Date().toISOString() });
    setTypeName(''); setTypeFields([]); setView('list');
  };

  const saveNewRecord = async () => {
    if (!selectedType) return;
    await saveRecordHook({ id: generateRecordId(), typeId: selectedType, data: recordData, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), createdBy: 'manual' });
    setRecordData({}); setView('list');
  };

  if (view === 'create-type') {
    return (
      <div className="p-6 max-w-xl">
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => setView('list')} className="text-gray-400 hover:text-white"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
          <h2 className="text-sm font-semibold text-white">New Entry Type</h2>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Name</label>
            <input value={typeName} onChange={e => setTypeName(e.target.value)} placeholder="e.g. Account, Contact, Company"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-2">Fields</label>
            {typeFields.map(f => (
              <div key={f.id} className="flex items-center gap-2 bg-gray-700/50 rounded-lg px-3 py-1.5 mb-1">
                <span className="text-xs text-white flex-1">{f.name}</span>
                <span className="text-xs text-gray-500">{f.type}</span>
                <button onClick={() => setTypeFields(prev => prev.filter(x => x.id !== f.id))} className="text-gray-500 hover:text-red-400">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ))}
            <div className="flex gap-2 mt-2">
              <input value={newFieldName} onChange={e => setNewFieldName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && newFieldName.trim()) { setTypeFields(p => [...p, { id: generateFieldId(), name: newFieldName.trim(), type: newFieldType }]); setNewFieldName(''); } }}
                placeholder="Field name..." className="flex-1 px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
              <select value={newFieldType} onChange={e => setNewFieldType(e.target.value as FieldType)}
                className="px-2 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-xs text-gray-100">
                {FIELD_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <button onClick={() => { if (newFieldName.trim()) { setTypeFields(p => [...p, { id: generateFieldId(), name: newFieldName.trim(), type: newFieldType }]); setNewFieldName(''); } }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded-lg">Add</button>
            </div>
          </div>
        </div>
        <button onClick={saveType} disabled={!typeName.trim()} className="mt-4 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-600 text-white text-sm rounded-lg">Create Type</button>
      </div>
    );
  }

  if (view === 'create-record' && currentType) {
    return (
      <div className="p-6 max-w-xl">
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => setView('list')} className="text-gray-400 hover:text-white"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
          <h2 className="text-sm font-semibold text-white">New {currentType.name}</h2>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-3">
          {currentType.fields.map(f => (
            <div key={f.id}>
              <label className="block text-xs text-gray-400 mb-1">{f.name}</label>
              <input value={String(recordData[f.id] ?? '')} onChange={e => setRecordData(p => ({ ...p, [f.id]: e.target.value }))}
                type={f.type === 'number' || f.type === 'currency' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
            </div>
          ))}
        </div>
        <button onClick={saveNewRecord} className="mt-4 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm rounded-lg">Save Entry</button>
      </div>
    );
  }

  if (view === 'view' && viewRecord) {
    const recType = types.find(t => t.id === viewRecord.typeId);
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => { setView('list'); setViewRecord(null); }} className="text-gray-400 hover:text-white"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
          <h2 className="text-sm font-semibold text-white">{String(viewRecord.data['f-customer'] ?? recType?.name ?? 'Entry')}</h2>
          <span className="text-xs text-emerald-400 font-mono">{String(viewRecord.data['f-number'] ?? '')}</span>
        </div>
        {recType ? (
          <AccountDetailView typeDef={recType} record={viewRecord} />
        ) : (
          <p className="text-gray-500 text-sm">Record type not found.</p>
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 pt-4 pb-3 flex items-center justify-between flex-shrink-0">
        <h1 className="text-lg font-semibold text-white">Entries</h1>
        <div className="flex gap-2">
          {selectedType && (
            <button onClick={() => { setRecordData({}); setView('create-record'); }} className="px-3 py-1.5 text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/30 transition-colors">New Entry</button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 pb-3 flex gap-2 flex-wrap items-center flex-shrink-0">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
          className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-48" />
        <button onClick={() => setSelectedType(null)} className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${!selectedType ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'text-gray-400 border-gray-700 hover:border-gray-500'}`}>All</button>
        {types.map(t => (
          <button key={t.id} onClick={() => setSelectedType(t.id)}
            className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${selectedType === t.id ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'text-gray-400 border-gray-700 hover:border-gray-500'}`}>
            {t.name} ({records.filter(r => r.typeId === t.id).length})
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {filtered.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-gray-700 rounded-xl">
            <p className="text-sm text-gray-500">{types.length === 0 ? 'Create an entry type to get started.' : 'No entries found.'}</p>
          </div>
        ) : (
          <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-2 px-4 text-xs text-gray-500 font-medium">Type</th>
                  {currentType?.fields.slice(0, 4).map(f => (
                    <th key={f.id} className="text-left py-2 px-4 text-xs text-gray-500 font-medium">{f.name}</th>
                  ))}
                  {!currentType && <th className="text-left py-2 px-4 text-xs text-gray-500 font-medium">Summary</th>}
                  <th className="text-left py-2 px-4 text-xs text-gray-500 font-medium">Date</th>
                  <th className="w-12" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(rec => {
                  const rt = types.find(t => t.id === rec.typeId);
                  return (
                    <tr key={rec.id} className="border-b border-gray-700/40 hover:bg-gray-700/20 cursor-pointer" onClick={() => { setViewRecord(rec); setView('view'); }}>
                      <td className="py-2 px-4 text-xs text-gray-400">{rt?.name || '—'}</td>
                      {currentType?.fields.slice(0, 4).map(f => (
                        <td key={f.id} className="py-2 px-4 text-xs text-gray-300 truncate max-w-[180px]">{String(rec.data[f.id] ?? '—')}</td>
                      ))}
                      {!currentType && <td className="py-2 px-4 text-xs text-gray-300 truncate max-w-[250px]">{Object.values(rec.data).filter(v => typeof v === 'string').slice(0, 2).join(' — ') || '—'}</td>}
                      <td className="py-2 px-4 text-xs text-gray-500">{new Date(rec.createdAt).toLocaleDateString()}</td>
                      <td className="py-2 px-4">
                        <button onClick={async e => { e.stopPropagation(); if (confirm('Delete?')) { await removeRecordHook(rec.id); } }}
                          className="p-1 text-gray-600 hover:text-red-400"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
