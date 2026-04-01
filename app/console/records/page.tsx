'use client';

import { useState, useEffect, useMemo } from 'react';
import { RecordTypeDef, DataRecord, FieldDef, FieldType } from '@/lib/records/record-types';
import { useRecordTypes, useRecords, generateTypeId, generateFieldId, generateRecordId } from '@/lib/records/use-records';
import { getAgents } from '@/lib/agents/agent-registry';
import { AgentDef } from '@/lib/agents/agent-types';

// ─── Types ───────────────────────────────────────────────────────────────────

type MainTab = 'entries' | 'activities' | 'reports';
type SideTab = 'agents' | 'filters' | 'views' | 'actions';

interface ActivityEntry {
  id: string;
  type: 'research' | 'modification' | 'creation' | 'report';
  agentId?: string;
  description: string;
  timestamp: string;
  relatedRecordId?: string;
}

// ─── Filter State ────────────────────────────────────────────────────────────

interface Filters {
  search: string;
  itemState: string;
  dateFrom: string;
  dateTo: string;
  entryType: string;
  agentId: string;
  salesRep: string;
  managementCompany: string;
  region: string;
}

const emptyFilters: Filters = {
  search: '', itemState: '', dateFrom: '', dateTo: '', entryType: '',
  agentId: '', salesRep: '', managementCompany: '', region: '',
};

// ─── Field type options for record type creation ─────────────────────────────

const FIELD_TYPE_OPTIONS: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'Text' }, { value: 'number', label: 'Number' },
  { value: 'currency', label: 'Currency' }, { value: 'email', label: 'Email' },
  { value: 'url', label: 'URL' }, { value: 'date', label: 'Date' },
  { value: 'boolean', label: 'Yes/No' }, { value: 'select', label: 'Dropdown' },
  { value: 'list', label: 'List' }, { value: 'richtext', label: 'Rich Text' },
];
const COLORS = ['bg-emerald-500', 'bg-blue-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500'];

// ─── Input Component ─────────────────────────────────────────────────────────

function FilterInput({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-2.5 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-2.5 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-xs text-gray-100 focus:outline-none focus:ring-1 focus:ring-emerald-500">
        <option value="">All</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════

export default function RecordsPage() {
  const [mainTab, setMainTab] = useState<MainTab>('entries');
  const [sideTab, setSideTab] = useState<SideTab>('filters');
  const [sideOpen, setSideOpen] = useState(true);
  const [filters, setFilters] = useState<Filters>(emptyFilters);

  // Data
  const { types, save: saveType, remove: removeType } = useRecordTypes();
  const { records: allRecords, save: saveRec, remove: removeRec, refresh: refreshRecords } = useRecords();
  const [agents, setAgents] = useState<AgentDef[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);

  // Record type creation
  const [creating, setCreating] = useState(false);
  const [editingType, setEditingType] = useState<RecordTypeDef | null>(null);
  const [typeName, setTypeName] = useState('');
  const [typeIcon, setTypeIcon] = useState('');
  const [typeColor, setTypeColor] = useState(COLORS[0]);
  const [typeFields, setTypeFields] = useState<FieldDef[]>([]);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<FieldType>('text');

  // Record creation
  const [creatingRecord, setCreatingRecord] = useState(false);
  const [recordData, setRecordData] = useState<Record<string, unknown>>({});

  useEffect(() => {
    setAgents(getAgents());
  }, []);

  const setFilter = (key: keyof Filters, value: string) =>
    setFilters(prev => ({ ...prev, [key]: value }));

  // ─── Filtered records ──────────────────────────────────────────────────────
  const filteredRecords = useMemo(() => {
    let recs = selectedTypeId ? allRecords.filter(r => r.typeId === selectedTypeId) : allRecords;

    if (filters.search) {
      const q = filters.search.toLowerCase();
      recs = recs.filter(r => JSON.stringify(r.data).toLowerCase().includes(q));
    }
    if (filters.agentId) {
      recs = recs.filter(r => r.createdBy === filters.agentId);
    }
    if (filters.dateFrom) {
      recs = recs.filter(r => r.createdAt >= filters.dateFrom);
    }
    if (filters.dateTo) {
      recs = recs.filter(r => r.createdAt <= filters.dateTo + 'T23:59:59');
    }
    if (filters.entryType) {
      recs = recs.filter(r => r.typeId === filters.entryType);
    }
    return recs;
  }, [allRecords, selectedTypeId, filters]);

  // ─── Record type CRUD ──────────────────────────────────────────────────────
  const resetTypeForm = () => {
    setTypeName(''); setTypeIcon(''); setTypeColor(COLORS[0]); setTypeFields([]); setNewFieldName(''); setEditingType(null);
  };

  const handleSaveType = async () => {
    if (!typeName.trim()) return;
    const typeDef: RecordTypeDef = {
      id: editingType?.id ?? generateTypeId(), name: typeName.trim(),
      icon: typeIcon || typeName[0]?.toUpperCase() || 'R', color: typeColor, fields: typeFields,
      layoutTemplate: editingType?.layoutTemplate, createdAt: editingType?.createdAt ?? new Date().toISOString(),
    };
    await saveType(typeDef);
    resetTypeForm();
    setCreating(false);
  };

  const handleSaveRecord = async () => {
    if (!selectedTypeId) return;
    const rec: DataRecord = {
      id: generateRecordId(), typeId: selectedTypeId, data: recordData,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), createdBy: 'manual',
    };
    await saveRec(rec);
    setRecordData({});
    setCreatingRecord(false);
  };

  // ─── Main tabs ─────────────────────────────────────────────────────────────
  const mainTabs: { id: MainTab; label: string; icon: string }[] = [
    { id: 'entries', label: 'Entries', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
    { id: 'activities', label: 'Activities', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
    { id: 'reports', label: 'Reports', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  ];

  const sideTabs: { id: SideTab; label: string; icon: string }[] = [
    { id: 'agents', label: 'Agents', icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
    { id: 'filters', label: 'Filters', icon: 'M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z' },
    { id: 'views', label: 'Saved', icon: 'M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z' },
    { id: 'actions', label: 'Actions', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
  ];

  // Get the selected type for field display
  const selectedType = selectedTypeId ? types.find(t => t.id === selectedTypeId) : null;

  return (
    <div className="flex h-[calc(100vh-120px)] gap-0">
      {/* ═══ Main Content ═══ */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Main Tabs */}
        <div className="flex items-center border-b border-gray-700 px-4">
          {mainTabs.map(tab => (
            <button key={tab.id} onClick={() => setMainTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                mainTab === tab.id ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
              </svg>
              {tab.label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            {mainTab === 'entries' && (
              <>
                <button onClick={() => setCreating(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-400 hover:text-emerald-400 border border-gray-600 hover:border-emerald-500/50 rounded-lg transition-colors">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  New Type
                </button>
                {selectedTypeId && (
                  <button onClick={() => { setRecordData({}); setCreatingRecord(true); }}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/30 transition-colors">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    New Entry
                  </button>
                )}
              </>
            )}
            <button onClick={() => setSideOpen(!sideOpen)}
              className={`p-1.5 rounded-lg transition-colors ${sideOpen ? 'text-emerald-400 bg-emerald-500/10' : 'text-gray-400 hover:text-gray-200'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* ── Entries Tab ── */}
          {mainTab === 'entries' && !creating && !creatingRecord && (
            <div className="space-y-4">
              {/* Type chips */}
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => setSelectedTypeId(null)}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                    !selectedTypeId ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'text-gray-400 border-gray-600 hover:border-gray-500'
                  }`}>All</button>
                {types.map(t => (
                  <button key={t.id} onClick={() => setSelectedTypeId(t.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                      selectedTypeId === t.id ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'text-gray-400 border-gray-600 hover:border-gray-500'
                    }`}>
                    <div className={`w-4 h-4 ${t.color} rounded flex items-center justify-center`}>
                      <span className="text-white text-xs" style={{ fontSize: '8px' }}>{t.icon}</span>
                    </div>
                    {t.name}
                    <span className="text-gray-600">({allRecords.filter(r => r.typeId === t.id).length})</span>
                  </button>
                ))}
              </div>

              {/* Records table */}
              {filteredRecords.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-gray-700 rounded-xl">
                  <p className="text-sm text-gray-400">{types.length === 0 ? 'Create a record type to get started.' : 'No entries found.'}</p>
                </div>
              ) : (
                <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-700">
                        {selectedType ? (
                          selectedType.fields
                            .filter(f => !['boolean', 'richtext'].includes(f.type))
                            .slice(0, 6)
                            .map(f => (
                              <th key={f.id} className="text-left py-2.5 px-4 text-xs text-gray-400 font-medium whitespace-nowrap">{f.name}</th>
                            ))
                        ) : (
                          <>
                            <th className="text-left py-2.5 px-4 text-xs text-gray-400 font-medium">Type</th>
                            <th className="text-left py-2.5 px-4 text-xs text-gray-400 font-medium">Summary</th>
                            <th className="text-left py-2.5 px-4 text-xs text-gray-400 font-medium">Created</th>
                          </>
                        )}
                        <th className="w-10" />
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRecords.map(rec => {
                        const recType = types.find(t => t.id === rec.typeId);
                        const visibleFields = selectedType
                          ? selectedType.fields.filter(f => !['boolean', 'richtext'].includes(f.type)).slice(0, 6)
                          : null;
                        return (
                          <tr key={rec.id} className="border-b border-gray-700/40 hover:bg-gray-700/20 cursor-pointer"
                            onClick={() => {
                              if (recType) window.location.href = `/console/records/${recType.id}?view=${rec.id}`;
                            }}>
                            {visibleFields ? (
                              visibleFields.map((f, i) => (
                                <td key={f.id} className={`py-2.5 px-4 text-xs truncate max-w-[200px] ${i === 0 ? 'font-medium' : ''}`}>
                                  {i === 0 && recType ? (
                                    <div className="flex items-center gap-2">
                                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                                        String(rec.data[f.id]) === 'Prospect' ? 'bg-sky-500/15 text-sky-400' :
                                        String(rec.data[f.id]) === 'Active' ? 'bg-emerald-500/15 text-emerald-400' :
                                        String(rec.data[f.id]) === 'Inactive' ? 'bg-gray-500/15 text-gray-400' :
                                        'bg-red-500/15 text-red-400'
                                      }`}>{String(rec.data[f.id] ?? '—')}</span>
                                    </div>
                                  ) : f.id === 'f-number' ? (
                                    <span className="text-emerald-400 font-mono">{String(rec.data[f.id] ?? '—')}</span>
                                  ) : f.type === 'number' ? (
                                    <span className="text-gray-200">{rec.data[f.id] != null ? String(rec.data[f.id]) : '—'}</span>
                                  ) : (
                                    <span className="text-gray-300">{String(rec.data[f.id] ?? '—')}</span>
                                  )}
                                </td>
                              ))
                            ) : (
                              <>
                                <td className="py-2.5 px-4">
                                  {recType && (
                                    <div className="flex items-center gap-1.5">
                                      <div className={`w-5 h-5 ${recType.color} rounded flex items-center justify-center`}>
                                        <span className="text-white" style={{ fontSize: '8px' }}>{recType.icon}</span>
                                      </div>
                                      <span className="text-xs text-gray-400">{recType.name}</span>
                                    </div>
                                  )}
                                </td>
                                <td className="py-2.5 px-4 text-gray-300 text-xs truncate max-w-[250px]">
                                  {Object.values(rec.data).filter(v => typeof v === 'string').slice(0, 2).join(' — ') || '—'}
                                </td>
                                <td className="py-2.5 px-4 text-xs text-gray-500">
                                  {new Date(rec.createdAt).toLocaleDateString()}
                                </td>
                              </>
                            )}
                            <td className="py-2.5 px-4">
                              <button onClick={async (e) => { e.stopPropagation(); if (confirm('Delete this record?')) { await removeRec(rec.id); } }}
                                className="p-1 text-gray-600 hover:text-red-400 transition-colors">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── Create Type Form ── */}
          {mainTab === 'entries' && creating && (
            <div className="space-y-4 max-w-2xl">
              <div className="flex items-center gap-2">
                <button onClick={() => { resetTypeForm(); setCreating(false); }} className="p-1.5 text-gray-400 hover:text-white">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h2 className="text-sm font-semibold text-white">{editingType ? 'Edit Type' : 'New Record Type'}</h2>
              </div>
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 space-y-4">
                <div className="grid grid-cols-[1fr_70px] gap-3">
                  <FilterInput label="Name" value={typeName} onChange={setTypeName} placeholder="e.g. Account, Invoice" />
                  <FilterInput label="Icon" value={typeIcon} onChange={v => setTypeIcon(v.slice(0, 2))} placeholder="A" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Color</label>
                  <div className="flex gap-1.5">
                    {COLORS.map(c => (
                      <button key={c} onClick={() => setTypeColor(c)}
                        className={`w-6 h-6 rounded-lg ${c} transition-all ${typeColor === c ? 'ring-2 ring-white ring-offset-1 ring-offset-gray-800 scale-110' : 'opacity-50 hover:opacity-100'}`} />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Fields</label>
                  {typeFields.map(f => (
                    <div key={f.id} className="flex items-center gap-2 bg-gray-700/50 rounded-lg px-3 py-1.5 mb-1">
                      <span className="text-xs text-white flex-1">{f.name}</span>
                      <span className="text-xs text-gray-500 bg-gray-600 px-1.5 py-0.5 rounded">{f.type}</span>
                      <button onClick={() => setTypeFields(prev => prev.filter(x => x.id !== f.id))} className="text-gray-500 hover:text-red-400">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-2 mt-2">
                    <input value={newFieldName} onChange={e => setNewFieldName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && newFieldName.trim()) { setTypeFields(prev => [...prev, { id: generateFieldId(), name: newFieldName.trim(), type: newFieldType }]); setNewFieldName(''); } }}
                      placeholder="Field name..." className="flex-1 px-2.5 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                    <select value={newFieldType} onChange={e => setNewFieldType(e.target.value as FieldType)}
                      className="px-2 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-xs text-gray-100">
                      {FIELD_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <button onClick={() => { if (newFieldName.trim()) { setTypeFields(prev => [...prev, { id: generateFieldId(), name: newFieldName.trim(), type: newFieldType }]); setNewFieldName(''); } }}
                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded-lg">Add</button>
                  </div>
                </div>
              </div>
              <button onClick={handleSaveType} disabled={!typeName.trim()}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-600 text-white text-xs font-semibold rounded-lg">
                {editingType ? 'Save' : 'Create'}
              </button>
            </div>
          )}

          {/* ── Create Record Form ── */}
          {mainTab === 'entries' && creatingRecord && selectedType && (
            <div className="space-y-4 max-w-2xl">
              <div className="flex items-center gap-2">
                <button onClick={() => setCreatingRecord(false)} className="p-1.5 text-gray-400 hover:text-white">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h2 className="text-sm font-semibold text-white">New {selectedType.name}</h2>
              </div>
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 space-y-3">
                {selectedType.fields.map(f => (
                  <FilterInput key={f.id} label={f.name} value={String(recordData[f.id] ?? '')}
                    onChange={v => setRecordData(prev => ({ ...prev, [f.id]: f.type === 'number' || f.type === 'currency' ? parseFloat(v) || 0 : v }))}
                    type={f.type === 'number' || f.type === 'currency' ? 'number' : f.type === 'date' ? 'date' : 'text'} />
                ))}
              </div>
              <button onClick={handleSaveRecord} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg">Save Entry</button>
            </div>
          )}

          {/* ── Activities Tab ── */}
          {mainTab === 'activities' && (
            <div className="space-y-4">
              <div className="text-center py-16 border-2 border-dashed border-gray-700 rounded-xl">
                <svg className="w-10 h-10 text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <p className="text-sm text-gray-400">Agent activity tracking</p>
                <p className="text-xs text-gray-600 mt-1">Research, modifications, and agent actions will appear here as your agents work.</p>
              </div>
            </div>
          )}

          {/* ── Reports Tab ── */}
          {mainTab === 'reports' && (
            <div className="space-y-4">
              <div className="text-center py-16 border-2 border-dashed border-gray-700 rounded-xl">
                <svg className="w-10 h-10 text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm text-gray-400">Reports & insights</p>
                <p className="text-xs text-gray-600 mt-1">AI-generated reports, client summaries, and analytics will show here.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══ Right Side Panel ═══ */}
      {sideOpen && (
        <div className="w-72 border-l border-gray-700 bg-gray-800/50 flex flex-col flex-shrink-0">
          {/* Side tabs */}
          <div className="flex border-b border-gray-700">
            {sideTabs.map(tab => (
              <button key={tab.id} onClick={() => setSideTab(tab.id)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs transition-colors border-b-2 ${
                  sideTab === tab.id ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-gray-500 hover:text-gray-300'
                }`}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                </svg>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Side content */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {/* ── Agents Tab ── */}
            {sideTab === 'agents' && (
              <>
                <p className="text-xs text-gray-500 uppercase tracking-wider">AI Agents</p>
                {agents.length === 0 ? (
                  <p className="text-xs text-gray-600 italic">No agents configured. Create one in the workspace.</p>
                ) : (
                  agents.map(agent => (
                    <div key={agent.id} className="flex items-center gap-2 p-2 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors cursor-pointer"
                      onClick={() => setFilter('agentId', filters.agentId === agent.id ? '' : agent.id)}>
                      <div className={`w-7 h-7 ${agent.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                        <span className="text-white text-xs font-bold">{agent.initial}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white truncate">{agent.name}</p>
                        <p className="text-xs text-gray-500 truncate">{agent.targetUrl || agent.description || 'No target'}</p>
                      </div>
                      {filters.agentId === agent.id && (
                        <span className="w-2 h-2 bg-emerald-500 rounded-full flex-shrink-0" />
                      )}
                    </div>
                  ))
                )}
              </>
            )}

            {/* ── Filters Tab ── */}
            {sideTab === 'filters' && (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Search Filters</p>
                  <button onClick={() => setFilters(emptyFilters)} className="text-xs text-gray-600 hover:text-gray-400 transition-colors">Clear</button>
                </div>
                <FilterInput label="Search" value={filters.search} onChange={v => setFilter('search', v)} placeholder="Search entries..." />
                <FilterSelect label="Entry Type" value={filters.entryType} onChange={v => setFilter('entryType', v)}
                  options={types.map(t => ({ value: t.id, label: t.name }))} />
                <FilterSelect label="Item State" value={filters.itemState} onChange={v => setFilter('itemState', v)}
                  options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }, { value: 'pending', label: 'Pending' }, { value: 'closed', label: 'Closed' }]} />
                <div className="grid grid-cols-2 gap-2">
                  <FilterInput label="Date From" value={filters.dateFrom} onChange={v => setFilter('dateFrom', v)} type="date" />
                  <FilterInput label="Date To" value={filters.dateTo} onChange={v => setFilter('dateTo', v)} type="date" />
                </div>
                <FilterSelect label="AI Agent" value={filters.agentId} onChange={v => setFilter('agentId', v)}
                  options={agents.map(a => ({ value: a.id, label: a.name }))} />
                <FilterInput label="Sales Rep" value={filters.salesRep} onChange={v => setFilter('salesRep', v)} placeholder="Name..." />
                <FilterInput label="Management Company" value={filters.managementCompany} onChange={v => setFilter('managementCompany', v)} placeholder="Company..." />
                <FilterInput label="Region / State / City / Zip" value={filters.region} onChange={v => setFilter('region', v)} placeholder="Location..." />
              </>
            )}

            {/* ── Saved Views Tab ── */}
            {sideTab === 'views' && (
              <>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Saved Views</p>
                <p className="text-xs text-gray-600 italic">Save your current filter combination as a view for quick access.</p>
                <button className="w-full px-3 py-2 text-xs text-gray-400 border border-dashed border-gray-600 rounded-lg hover:border-gray-500 hover:text-gray-300 transition-colors">
                  + Save Current View
                </button>
              </>
            )}

            {/* ── Quick Actions Tab ── */}
            {sideTab === 'actions' && (
              <>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Quick Actions</p>
                <button onClick={() => setCreating(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-300 bg-gray-700/30 hover:bg-gray-700/50 rounded-lg transition-colors">
                  <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New Record Type
                </button>
                {selectedTypeId && (
                  <button onClick={() => { setRecordData({}); setCreatingRecord(true); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-300 bg-gray-700/30 hover:bg-gray-700/50 rounded-lg transition-colors">
                    <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    New Entry
                  </button>
                )}
                <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-300 bg-gray-700/30 hover:bg-gray-700/50 rounded-lg transition-colors">
                  <svg className="w-3.5 h-3.5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Import Data
                </button>
                <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-300 bg-gray-700/30 hover:bg-gray-700/50 rounded-lg transition-colors">
                  <svg className="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export Records
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
