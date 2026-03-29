'use client';

import { useState } from 'react';

type DashTab = 'overview' | 'notes' | 'recent';

export default function DashboardPage() {
  const [tab, setTab] = useState<DashTab>('overview');
  const [notes, setNotes] = useState(() => {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem('nodnal-dashboard-notes');
    return saved ? JSON.parse(saved) : [];
  });
  const [newNote, setNewNote] = useState('');

  const addNote = () => {
    if (!newNote.trim()) return;
    const updated = [{ id: Date.now(), text: newNote.trim(), date: new Date().toISOString() }, ...notes];
    setNotes(updated);
    localStorage.setItem('nodnal-dashboard-notes', JSON.stringify(updated));
    setNewNote('');
  };

  const deleteNote = (id: number) => {
    const updated = notes.filter((n: { id: number }) => n.id !== id);
    setNotes(updated);
    localStorage.setItem('nodnal-dashboard-notes', JSON.stringify(updated));
  };

  const tabs: { id: DashTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'notes', label: 'Notes' },
    { id: 'recent', label: 'Recent Activity' },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Tabs */}
      <div className="flex items-center gap-1 px-6 pt-4 pb-0">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              tab === t.id ? 'bg-gray-800 text-white border-b-2 border-emerald-500' : 'text-gray-500 hover:text-gray-300'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {tab === 'overview' && (
          <div className="space-y-6">
            {/* Stats row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Entries', value: '—', sub: 'accounts & contacts' },
                { label: 'Active Agents', value: '—', sub: 'running tasks' },
                { label: 'Activities', value: '—', sub: 'this week' },
                { label: 'Reports', value: '—', sub: 'pending review' },
              ].map((s, i) => (
                <div key={i} className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                  <p className="text-xs text-gray-500">{s.label}</p>
                  <p className="text-2xl font-bold text-white mt-1">{s.value}</p>
                  <p className="text-xs text-gray-600 mt-1">{s.sub}</p>
                </div>
              ))}
            </div>

            {/* Quick info */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-white mb-3">Agent Status</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between py-2 border-b border-gray-700/50">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                      <span className="text-sm text-gray-300">Spector</span>
                    </div>
                    <span className="text-xs text-gray-500">Idle</span>
                  </div>
                  <p className="text-xs text-gray-600 italic">Configure agents in AI Manager</p>
                </div>
              </div>

              <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-white mb-3">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'New Entry', href: '/console/entries' },
                    { label: 'View Agents', href: '/console/agents' },
                    { label: 'Activities', href: '/console/activities' },
                    { label: 'View Data', href: '/console/data' },
                  ].map(a => (
                    <a key={a.label} href={a.href}
                      className="px-3 py-2 bg-gray-700/50 hover:bg-gray-700 border border-gray-600/50 rounded-lg text-xs text-gray-300 hover:text-white text-center transition-colors">
                      {a.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'notes' && (
          <div className="space-y-4 max-w-2xl">
            <div className="flex gap-2">
              <input value={newNote} onChange={e => setNewNote(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addNote(); }}
                placeholder="Add a note..."
                className="flex-1 px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
              <button onClick={addNote} className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm rounded-lg transition-colors">Add</button>
            </div>
            {notes.length === 0 ? (
              <p className="text-sm text-gray-600 text-center py-8">No notes yet.</p>
            ) : (
              <div className="space-y-2">
                {notes.map((n: { id: number; text: string; date: string }) => (
                  <div key={n.id} className="flex items-start gap-3 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 group">
                    <div className="flex-1">
                      <p className="text-sm text-gray-200">{n.text}</p>
                      <p className="text-xs text-gray-600 mt-1">{new Date(n.date).toLocaleDateString()}</p>
                    </div>
                    <button onClick={() => deleteNote(n.id)}
                      className="p-1 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'recent' && (
          <div className="max-w-2xl">
            <p className="text-sm text-gray-600 text-center py-12">Recent activity will appear here as you and your agents work.</p>
          </div>
        )}
      </div>
    </div>
  );
}
