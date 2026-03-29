'use client';

import { useState } from 'react';

type ActivityTab = 'all' | 'lists' | 'projects';

export default function ActivitiesPage() {
  const [tab, setTab] = useState<ActivityTab>('all');
  const [items, setItems] = useState(() => {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem('nodnal-activities');
    return saved ? JSON.parse(saved) : [];
  });
  const [newItem, setNewItem] = useState('');
  const [newType, setNewType] = useState<'task' | 'list' | 'project'>('task');

  const save = (updated: typeof items) => {
    setItems(updated);
    localStorage.setItem('nodnal-activities', JSON.stringify(updated));
  };

  const addItem = () => {
    if (!newItem.trim()) return;
    save([{ id: Date.now(), text: newItem.trim(), type: newType, done: false, date: new Date().toISOString() }, ...items]);
    setNewItem('');
  };

  const toggleDone = (id: number) => save(items.map((i: { id: number; done: boolean }) => i.id === id ? { ...i, done: !i.done } : i));
  const deleteItem = (id: number) => { if (confirm('Delete this?')) save(items.filter((i: { id: number }) => i.id !== id)); };

  const filtered = tab === 'all' ? items : items.filter((i: { type: string }) => tab === 'lists' ? i.type === 'list' : i.type === 'project');

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 pt-4 pb-3 flex items-center gap-4 flex-shrink-0">
        <h1 className="text-lg font-semibold text-white">Activities</h1>
        {(['all', 'lists', 'projects'] as ActivityTab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1 text-xs rounded-lg transition-colors ${tab === t ? 'bg-emerald-500/15 text-emerald-400' : 'text-gray-500 hover:text-gray-300'}`}>
            {t === 'all' ? 'All' : t === 'lists' ? 'Lists' : 'Projects'}
          </button>
        ))}
      </div>

      <div className="px-6 pb-3 flex gap-2 flex-shrink-0">
        <input value={newItem} onChange={e => setNewItem(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') addItem(); }}
          placeholder="Add activity..." className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
        <select value={newType} onChange={e => setNewType(e.target.value as typeof newType)}
          className="px-2 py-2 bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-300">
          <option value="task">Task</option>
          <option value="list">List</option>
          <option value="project">Project</option>
        </select>
        <button onClick={addItem} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm rounded-lg transition-colors">Add</button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {filtered.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-gray-700 rounded-xl">
            <p className="text-sm text-gray-500">No activities yet. Add tasks, lists, or projects above.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {filtered.map((item: { id: number; text: string; type: string; done: boolean; date: string }) => (
              <div key={item.id} className="flex items-center gap-3 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 group">
                <button onClick={() => toggleDone(item.id)}
                  className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${item.done ? 'bg-emerald-500 border-emerald-500' : 'border-gray-600 hover:border-gray-400'}`}>
                  {item.done && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                </button>
                <span className={`flex-1 text-sm ${item.done ? 'text-gray-500 line-through' : 'text-gray-200'}`}>{item.text}</span>
                <span className="text-xs text-gray-600 bg-gray-700 px-1.5 py-0.5 rounded">{item.type}</span>
                <span className="text-xs text-gray-600">{new Date(item.date).toLocaleDateString()}</span>
                <button onClick={() => deleteItem(item.id)} className="p-1 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
