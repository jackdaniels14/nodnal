'use client';

import { useState, useEffect } from 'react';
import { AgentDef, AgentCapability } from '@/lib/agents/agent-types';
import { getAgents, saveAgent, deleteAgent, generateAgentId } from '@/lib/agents/agent-registry';

const COLORS = ['bg-emerald-500', 'bg-violet-500', 'bg-blue-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500'];
const CAPABILITIES: { value: AgentCapability; label: string }[] = [
  { value: 'browser', label: 'Browser' }, { value: 'api', label: 'API' },
  { value: 'read', label: 'Read' }, { value: 'write', label: 'Write' },
];

export default function AIManagerPage() {
  const [agents, setAgents] = useState<AgentDef[]>([]);
  const [view, setView] = useState<'list' | 'create' | 'edit'>('list');
  const [editing, setEditing] = useState<AgentDef | null>(null);

  // Form
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [target, setTarget] = useState('');
  const [caps, setCaps] = useState<AgentCapability[]>([]);
  const [prompt, setPrompt] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [initial, setInitial] = useState('');

  useEffect(() => { setAgents(getAgents()); }, []);

  const resetForm = () => { setName(''); setDesc(''); setTarget(''); setCaps([]); setPrompt(''); setColor(COLORS[0]); setInitial(''); setEditing(null); };

  const loadAgent = (a: AgentDef) => {
    setEditing(a); setName(a.name); setDesc(a.description); setTarget(a.targetUrl || '');
    setCaps([...a.capabilities]); setPrompt(a.systemPrompt); setColor(a.color); setInitial(a.initial);
    setView('edit');
  };

  const handleSave = () => {
    if (!name.trim()) return;
    saveAgent({
      id: editing?.id ?? generateAgentId(), name: name.trim(), description: desc.trim(),
      color, initial: (initial || name[0] || 'A').toUpperCase(),
      targetUrl: target.trim() || undefined, capabilities: caps,
      systemPrompt: prompt.trim() || `You are ${name.trim()}. Follow your instructions in AGENTS.md.`,
      createdAt: editing?.createdAt ?? new Date().toISOString(),
    });
    setAgents(getAgents()); resetForm(); setView('list');
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this agent?')) return;
    deleteAgent(id); setAgents(getAgents());
  };

  if (view === 'create' || view === 'edit') {
    return (
      <div className="p-6 max-w-xl">
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => { resetForm(); setView('list'); }} className="text-gray-400 hover:text-white">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h2 className="text-sm font-semibold text-white">{editing ? `Edit ${editing.name}` : 'New Agent'}</h2>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-4">
          <div className="grid grid-cols-[1fr_60px] gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Name</label>
              <input value={name} onChange={e => { setName(e.target.value); if (!initial) setInitial(e.target.value[0] || ''); }}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-emerald-500" placeholder="Spector" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Icon</label>
              <input value={initial} onChange={e => setInitial(e.target.value.slice(0, 1))} maxLength={1}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-100 text-center focus:outline-none focus:ring-1 focus:ring-emerald-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Color</label>
            <div className="flex gap-1.5">
              {COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-lg ${c} transition-all ${color === c ? 'ring-2 ring-white ring-offset-1 ring-offset-gray-800 scale-110' : 'opacity-50 hover:opacity-100'}`} />
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Description</label>
            <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="What does this agent do?"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Target URL (optional)</label>
            <input value={target} onChange={e => setTarget(e.target.value)} placeholder="https://app.ouzoerp.com"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Capabilities</label>
            <div className="flex gap-2 flex-wrap">
              {CAPABILITIES.map(c => (
                <button key={c.value} onClick={() => setCaps(prev => prev.includes(c.value) ? prev.filter(x => x !== c.value) : [...prev, c.value])}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${caps.includes(c.value) ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'text-gray-400 border-gray-600 hover:border-gray-500'}`}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">System Prompt (managed by OpenClaw — optional override)</label>
            <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={3} placeholder="Leave blank to use AGENTS.md on the server"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none" />
          </div>

          {/* Communication rules */}
          <div className="pt-3 border-t border-gray-700">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Agent Communication</h3>
            <p className="text-xs text-gray-500 mb-2">Agents can communicate through the OpenClaw gateway. Configure routing and inter-agent messaging in the AGENTS.md file on the server.</p>
            <div className="bg-gray-700/30 rounded-lg p-3">
              <p className="text-xs text-gray-400">To allow agents to talk to each other, define communication rules in <code className="text-emerald-400">AGENTS.md</code> on the OpenClaw VM.</p>
            </div>
          </div>
        </div>
        <button onClick={handleSave} disabled={!name.trim()} className="mt-4 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-600 text-white text-sm rounded-lg">{editing ? 'Save' : 'Create Agent'}</button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 pt-4 pb-3 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-white">AI Manager</h1>
          <p className="text-xs text-gray-500 mt-0.5">Create, configure, and manage how your AI agents work</p>
        </div>
        <button onClick={() => { resetForm(); setView('create'); }}
          className="px-3 py-1.5 text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/30 transition-colors">
          New Agent
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {agents.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-gray-700 rounded-xl">
            <p className="text-sm text-gray-500">No agents created yet.</p>
            <p className="text-xs text-gray-600 mt-1">Create an agent to get started with AI automation.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {agents.map(a => (
              <div key={a.id} className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex items-center gap-4 group hover:border-gray-600 transition-colors">
                <div className={`w-10 h-10 ${a.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                  <span className="text-white font-bold">{a.initial}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{a.name}</p>
                  <p className="text-xs text-gray-500 truncate">{a.description || a.targetUrl || 'No description'}</p>
                  <div className="flex gap-1 mt-1.5">
                    {a.capabilities.map(c => (
                      <span key={c} className="text-xs bg-gray-700 text-gray-400 px-1.5 py-0.5 rounded">{c}</span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => loadAgent(a)} className="p-2 text-gray-500 hover:text-white rounded-lg hover:bg-gray-700 transition-colors" title="Edit">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  </button>
                  <button onClick={() => handleDelete(a.id)} className="p-2 text-gray-500 hover:text-red-400 rounded-lg hover:bg-gray-700 transition-colors" title="Delete">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Server info */}
        <div className="mt-6 bg-gray-800/50 border border-gray-700 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">OpenClaw Server</h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-gray-500">Gateway</span>
              <p className="text-gray-300 mt-0.5">34.67.77.7:18789</p>
            </div>
            <div>
              <span className="text-gray-500">Prompts</span>
              <p className="text-gray-300 mt-0.5">AGENTS.md on VM</p>
            </div>
            <div>
              <span className="text-gray-500">Credentials</span>
              <p className="text-gray-300 mt-0.5">CREDENTIALS.md on VM</p>
            </div>
            <div>
              <span className="text-gray-500">Browser</span>
              <p className="text-gray-300 mt-0.5">Chrome (headless)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
