'use client';

import { useState, useRef, useEffect } from 'react';
import { RecordTypeDef, DataRecord } from '@/lib/records/record-types';
import { useContacts, useNotes } from '@/lib/records/use-records';
import { stateColor } from '@/lib/records/state-colors';

export default function AccountDetailView({ typeDef, record }: { typeDef: RecordTypeDef; record: DataRecord }) {
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

  const noteSummaryParts: string[] = [];
  const userNotes = notes.filter(n => n.authorType === 'user');
  const agentNotes = notes.filter(n => n.authorType === 'agent');
  if (userNotes.length > 0) noteSummaryParts.push(`${userNotes.length} note${userNotes.length > 1 ? 's' : ''} from you`);
  if (agentNotes.length > 0) noteSummaryParts.push(`${agentNotes.length} note${agentNotes.length > 1 ? 's' : ''} from agents`);

  return (
    <div className="space-y-4">
      {/* Top Row: General Info + Contacts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Top Left: General Info */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">General Information</h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <div>
              <span className="text-xs text-gray-500">State</span>
              <p className="text-sm mt-0.5">
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${stateColor(getField('f-state'))}`}>{getField('f-state')}</span>
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

        {/* Top Right: Contacts & Management */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Contacts & Management</h3>

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

      {/* Bottom: Account Notes (single block with chat + summary) */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Account Notes & Summary</h3>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
          {/* Notes Chat */}
          <div className="flex flex-col" style={{ minHeight: '250px' }}>
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

          {/* Summary sidebar */}
          <div className="border-l border-gray-700 pl-4">
            <h4 className="text-xs text-gray-500 font-medium mb-3">Summary</h4>
            {notes.length === 0 ? (
              <p className="text-xs text-gray-600 italic">Notes will be summarized here.</p>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-gray-400 mb-2">{noteSummaryParts.join(', ')}</p>
                {notes.slice(0, 10).map(note => (
                  <div key={note.id} className="flex items-start gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                      note.authorType === 'user' ? 'bg-emerald-500' :
                      note.authorType === 'agent' ? 'bg-violet-500' : 'bg-gray-500'
                    }`} />
                    <div>
                      <p className="text-xs text-gray-300">{note.content.slice(0, 80)}{note.content.length > 80 ? '...' : ''}</p>
                      <p className="text-xs text-gray-600 mt-0.5">{note.author} — {new Date(note.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
