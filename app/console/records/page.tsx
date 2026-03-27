'use client';

import { useState, useEffect } from 'react';
import { RecordTypeDef, FieldDef, FieldType } from '@/lib/records/record-types';
import { getRecordTypes, saveRecordType, deleteRecordType, getRecordsByType, generateTypeId, generateFieldId } from '@/lib/records/record-store';

const FIELD_TYPE_OPTIONS: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'currency', label: 'Currency' },
  { value: 'email', label: 'Email' },
  { value: 'url', label: 'URL' },
  { value: 'date', label: 'Date' },
  { value: 'boolean', label: 'Yes/No' },
  { value: 'select', label: 'Dropdown' },
  { value: 'list', label: 'List' },
  { value: 'richtext', label: 'Rich Text' },
];

const COLORS = ['bg-emerald-500', 'bg-blue-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500'];

export default function RecordsPage() {
  const [types, setTypes] = useState<RecordTypeDef[]>([]);
  const [creating, setCreating] = useState(false);
  const [editingType, setEditingType] = useState<RecordTypeDef | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [fields, setFields] = useState<FieldDef[]>([]);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<FieldType>('text');

  useEffect(() => { setTypes(getRecordTypes()); }, []);

  const resetForm = () => {
    setName(''); setIcon(''); setColor(COLORS[0]); setFields([]); setNewFieldName(''); setEditingType(null);
  };

  const loadType = (t: RecordTypeDef) => {
    setEditingType(t); setName(t.name); setIcon(t.icon); setColor(t.color); setFields([...t.fields]); setCreating(true);
  };

  const addField = () => {
    if (!newFieldName.trim()) return;
    setFields(prev => [...prev, { id: generateFieldId(), name: newFieldName.trim(), type: newFieldType }]);
    setNewFieldName('');
  };

  const removeField = (id: string) => setFields(prev => prev.filter(f => f.id !== id));

  const handleSave = () => {
    if (!name.trim()) return;
    const typeDef: RecordTypeDef = {
      id: editingType?.id ?? generateTypeId(),
      name: name.trim(),
      icon: icon || name[0]?.toUpperCase() || 'R',
      color,
      fields,
      layoutTemplate: editingType?.layoutTemplate, // preserve existing template
      createdAt: editingType?.createdAt ?? new Date().toISOString(),
    };
    saveRecordType(typeDef);
    setTypes(getRecordTypes());
    resetForm();
    setCreating(false);
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this record type and all its records?')) return;
    deleteRecordType(id);
    setTypes(getRecordTypes());
  };

  if (creating) {
    return (
      <div className="space-y-4 max-w-2xl">
        <div className="flex items-center gap-2">
          <button onClick={() => { resetForm(); setCreating(false); }} className="p-1.5 text-gray-400 hover:text-white transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h1 className="text-lg font-semibold text-white">{editingType ? `Edit ${editingType.name}` : 'New Record Type'}</h1>
        </div>

        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 space-y-4">
          {/* Name + Icon */}
          <div className="grid grid-cols-[1fr_80px] gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Account, Invoice, Contact"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Icon</label>
              <input value={icon} onChange={e => setIcon(e.target.value)} placeholder="A" maxLength={2}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-100 text-center focus:outline-none focus:ring-1 focus:ring-emerald-500" />
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Color</label>
            <div className="flex gap-1.5">
              {COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-lg ${c} transition-all ${color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-800 scale-110' : 'opacity-60 hover:opacity-100'}`} />
              ))}
            </div>
          </div>

          {/* Fields */}
          <div>
            <label className="block text-xs text-gray-400 mb-2">Fields</label>
            <div className="space-y-1.5 mb-3">
              {fields.map(f => (
                <div key={f.id} className="flex items-center gap-2 bg-gray-700/50 rounded-lg px-3 py-2">
                  <span className="text-sm text-white flex-1">{f.name}</span>
                  <span className="text-xs text-gray-400 bg-gray-600 px-2 py-0.5 rounded">{f.type}</span>
                  <button onClick={() => removeField(f.id)} className="p-0.5 text-gray-500 hover:text-red-400 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
              {fields.length === 0 && <p className="text-xs text-gray-600 italic">No fields yet. Add some below.</p>}
            </div>
            <div className="flex gap-2">
              <input value={newFieldName} onChange={e => setNewFieldName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addField(); }}
                placeholder="Field name..." className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
              <select value={newFieldType} onChange={e => setNewFieldType(e.target.value as FieldType)}
                className="px-2 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-emerald-500">
                {FIELD_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <button onClick={addField} className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg transition-colors">Add</button>
            </div>
          </div>
        </div>

        <button onClick={handleSave} disabled={!name.trim()}
          className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-600 text-white text-sm font-semibold rounded-lg transition-colors">
          {editingType ? 'Save Changes' : 'Create Record Type'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-white">Records</h1>
        <button onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 text-xs font-medium rounded-lg transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          New Type
        </button>
      </div>

      {types.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-700 rounded-xl">
          <svg className="w-10 h-10 text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <p className="text-sm text-gray-400">No record types yet.</p>
          <p className="text-xs text-gray-600 mt-1">Create one to start organizing your data.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {types.map(t => {
            const recordCount = getRecordsByType(t.id).length;
            return (
              <div key={t.id} className="bg-gray-800 border border-gray-700 rounded-xl p-4 hover:border-gray-600 transition-colors group">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 ${t.color} rounded-lg flex items-center justify-center`}>
                    <span className="text-white font-bold">{t.icon}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{t.name}</p>
                    <p className="text-xs text-gray-500">{t.fields.length} fields · {recordCount} records</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a href={`/console/records/${t.id}`}
                    className="flex-1 text-center px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded-lg transition-colors">
                    View Records
                  </a>
                  <button onClick={() => loadType(t)} className="p-1.5 text-gray-500 hover:text-gray-200 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  </button>
                  <button onClick={() => handleDelete(t.id)} className="p-1.5 text-gray-500 hover:text-red-400 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
