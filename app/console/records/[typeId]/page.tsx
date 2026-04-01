'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { RecordTypeDef, DataRecord as RecordData, FieldDef } from '@/lib/records/record-types';
import { useRecords, useRecordTypes, useContacts, useNotes, generateRecordId } from '@/lib/records/use-records';
import type { Contact, AccountNote } from '@/lib/records/use-records';

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

// ─── Account Detail View (3-panel layout) ───────────────────────────────────

function AccountDetailView({ typeDef, record }: { typeDef: RecordTypeDef; record: RecordData }) {
  const { contacts } = useContacts(record.id);
  const { notes, save: saveNote } = useNotes(record.id);
  const [noteInput, setNoteInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [notes]);

  const d = record.data;
  const getField = (id: string) => String(d[id] ?? '—');
  const getBool = (id: string) => d[id] ? 'Yes' : 'No';

  const handleAddNote = async () => {
    if (!noteInput.trim()) return;
    await saveNote({
      id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      content: noteInput.trim(),
      author: 'You',
      authorType: 'user',
      createdAt: new Date().toISOString(),
    });
    setNoteInput('');
  };

  // Summarize notes for the right panel
  const noteSummaryParts: string[] = [];
  const userNotes = notes.filter(n => n.authorType === 'user');
  const agentNotes = notes.filter(n => n.authorType === 'agent');
  if (userNotes.length > 0) noteSummaryParts.push(`${userNotes.length} note${userNotes.length > 1 ? 's' : ''} from you`);
  if (agentNotes.length > 0) noteSummaryParts.push(`${agentNotes.length} note${agentNotes.length > 1 ? 's' : ''} from agents`);

  return (
    <div className="space-y-4">
      {/* ── Top Row: General Info + Contacts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* ── Top Left: General Info ── */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">General Information</h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <div>
              <span className="text-xs text-gray-500">State</span>
              <p className="text-sm mt-0.5">
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                  getField('f-state') === 'Prospect' ? 'bg-sky-500/15 text-sky-400' :
                  getField('f-state') === 'Active' ? 'bg-emerald-500/15 text-emerald-400' :
                  getField('f-state') === 'Inactive' ? 'bg-gray-500/15 text-gray-400' :
                  'bg-red-500/15 text-red-400'
                }`}>{getField('f-state')}</span>
              </p>
            </div>
            <div>
              <span className="text-xs text-gray-500">Account Number</span>
              <p className="text-sm text-emerald-400 font-mono mt-0.5">{getField('f-number')}</p>
            </div>
            <div>
              <span className="text-xs text-gray-500">Customer</span>
              <p className="text-sm text-white mt-0.5">{getField('f-customer')}</p>
            </div>
            <div>
              <span className="text-xs text-gray-500">City</span>
              <p className="text-sm text-gray-300 mt-0.5">{getField('f-city')}</p>
            </div>
            <div>
              <span className="text-xs text-gray-500">Unit Count</span>
              <p className="text-sm text-white font-semibold mt-0.5">{getField('f-units')}</p>
            </div>
            <div>
              <span className="text-xs text-gray-500">Rep</span>
              <p className="text-sm text-gray-300 mt-0.5">{getField('f-rep')}</p>
            </div>
            <div className="col-span-2">
              <span className="text-xs text-gray-500">Term</span>
              <p className="text-sm text-gray-300 mt-0.5">{getField('f-term')}</p>
            </div>
            <div className="col-span-2">
              <span className="text-xs text-gray-500">Billing Method</span>
              <p className="text-sm text-gray-300 mt-0.5">{getField('f-billing')}</p>
            </div>
          </div>

          {/* Flags */}
          <div className="mt-4 pt-4 border-t border-gray-700">
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'f-master', label: 'Master Account' },
                { id: 'f-cash', label: 'Cash Account' },
                { id: 'f-exempt-fees', label: 'Exempt Fees' },
                { id: 'f-require-po', label: 'Require PO' },
                { id: 'f-group-line', label: 'Group Line Items' },
                { id: 'f-trip-charge', label: 'Trip Charge' },
                { id: 'f-am-installs', label: 'AM Installs' },
                { id: 'f-rep-review', label: 'Rep Review' },
              ].map(flag => (
                <span key={flag.id} className={`px-2 py-0.5 rounded text-xs ${
                  d[flag.id] ? 'bg-emerald-500/15 text-emerald-400' : 'bg-gray-700 text-gray-500'
                }`}>
                  {flag.label}: {getBool(flag.id)}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── Top Right: Contacts & Management ── */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Contacts & Management</h3>

          {/* Address & Management */}
          <div className="space-y-3 mb-5">
            <div>
              <span className="text-xs text-gray-500">Physical Address</span>
              <p className="text-sm text-white mt-0.5">{getField('f-address')}</p>
            </div>
            <div>
              <span className="text-xs text-gray-500">Management Company</span>
              <p className="text-sm text-white mt-0.5">{getField('f-mgmt')}</p>
            </div>
          </div>

          {/* Contacts list */}
          <div className="border-t border-gray-700 pt-4">
            <h4 className="text-xs text-gray-500 mb-3">Key Contacts</h4>
            {contacts.length === 0 ? (
              <p className="text-xs text-gray-600 italic">No contacts added yet.</p>
            ) : (
              <div className="space-y-3">
                {contacts.map(c => (
                  <div key={c.id} className="flex items-start gap-3 p-2.5 bg-gray-700/30 rounded-lg">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      c.state === 'Active' ? 'bg-emerald-500/20' : 'bg-gray-600/30'
                    }`}>
                      <span className="text-xs font-bold text-gray-300">{c.name?.charAt(0) || '?'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-white font-medium">{c.name}</span>
                        <span className="text-xs text-gray-500">{c.contactType}</span>
                      </div>
                      {c.email && (
                        <a href={`mailto:${c.email}`} className="text-xs text-emerald-400 hover:underline block truncate">{c.email}</a>
                      )}
                      <div className="flex gap-3 mt-0.5">
                        {c.phone && <span className="text-xs text-gray-400">{c.phone}</span>}
                        {c.cell && <span className="text-xs text-gray-400">{c.cell}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes from record */}
          {(getField('f-installer-notes') !== '—' || getField('f-internal-notes') !== '—') && (
            <div className="border-t border-gray-700 pt-4 mt-4">
              {getField('f-installer-notes') !== '—' && (
                <div className="mb-3">
                  <span className="text-xs text-gray-500">Installer Notes</span>
                  <p className="text-xs text-gray-300 mt-1 whitespace-pre-wrap">{getField('f-installer-notes')}</p>
                </div>
              )}
              {getField('f-internal-notes') !== '—' && (
                <div>
                  <span className="text-xs text-gray-500">Internal Notes</span>
                  <p className="text-xs text-gray-300 mt-1 whitespace-pre-wrap">{getField('f-internal-notes')}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom: AI Notes ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Notes Chat */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 flex flex-col" style={{ minHeight: '300px' }}>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Account Notes</h3>
          <p className="text-xs text-gray-600 mb-3">Add notes about this account. AI agents can also contribute. Type <code className="text-emerald-400">/agentname</code> to tag an agent.</p>

          <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-2 mb-3 max-h-64">
            {notes.length === 0 && (
              <p className="text-xs text-gray-600 italic pt-4 text-center">No notes yet. Add one below.</p>
            )}
            {[...notes].reverse().map(note => (
              <div key={note.id} className={`text-xs rounded-lg px-3 py-2 max-w-[85%] ${
                note.authorType === 'user'
                  ? 'bg-emerald-600/20 text-emerald-100 ml-auto'
                  : note.authorType === 'agent'
                  ? 'bg-violet-600/20 text-violet-100'
                  : 'bg-gray-700 text-gray-300'
              }`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="font-medium">{note.author}</span>
                  <span className="text-gray-500">{new Date(note.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="whitespace-pre-wrap">{note.content}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              value={noteInput}
              onChange={e => setNoteInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddNote(); }}
              placeholder="Add a note..."
              className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <button onClick={handleAddNote}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded-lg transition-colors">
              Add
            </button>
          </div>
        </div>

        {/* Notes Summary */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Summary</h3>
          {notes.length === 0 ? (
            <p className="text-xs text-gray-600 italic">Notes will be summarized here as they are added.</p>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-gray-400">{noteSummaryParts.join(', ') || 'No notes'}</p>
              <div className="space-y-2">
                {notes.slice(0, 10).map(note => (
                  <div key={note.id} className="flex items-start gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                      note.authorType === 'user' ? 'bg-emerald-500' :
                      note.authorType === 'agent' ? 'bg-violet-500' : 'bg-gray-500'
                    }`} />
                    <div>
                      <p className="text-xs text-gray-300">{note.content.slice(0, 120)}{note.content.length > 120 ? '...' : ''}</p>
                      <p className="text-xs text-gray-600 mt-0.5">{note.author} — {new Date(note.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function RecordTypePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const typeId = params.typeId as string;
  const viewRecordId = searchParams.get('view');
  const { types, loading: typesLoading } = useRecordTypes();
  const { records, loading: recordsLoading, save: saveRecord, remove: removeRecord } = useRecords(typeId);
  const [view, setView] = useState<'list' | 'create' | 'edit' | 'view'>(viewRecordId ? 'view' : 'list');
  const [selectedRecord, setSelectedRecord] = useState<RecordData | null>(null);

  // Auto-select record from URL param
  useEffect(() => {
    if (viewRecordId && records.length > 0 && !selectedRecord) {
      const rec = records.find(r => r.id === viewRecordId);
      if (rec) { setSelectedRecord(rec); setView('view'); }
    }
  }, [viewRecordId, records, selectedRecord]);

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
        <AccountDetailView typeDef={typeDef} record={selectedRecord} />
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
