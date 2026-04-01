'use client';

import { useState } from 'react';
import { AgentDef, AgentCapability } from '@/lib/agents/agent-types';
import { useAgents, generateAgentId } from '@/lib/agents/use-agents';

const COLORS = [
  'bg-emerald-500', 'bg-violet-500', 'bg-blue-500', 'bg-amber-500',
  'bg-rose-500', 'bg-cyan-500', 'bg-pink-500', 'bg-indigo-500',
];

const CAPABILITIES: { value: AgentCapability; label: string; desc: string }[] = [
  { value: 'browser', label: 'Browser', desc: 'Navigate & interact with websites' },
  { value: 'api', label: 'API', desc: 'Call REST/GraphQL endpoints' },
  { value: 'read', label: 'Read', desc: 'Read data from target' },
  { value: 'write', label: 'Write', desc: 'Modify data on target' },
];

type View = 'list' | 'create' | 'edit';

export default function AgentManager() {
  const { agents, save: saveAgent, remove: deleteAgent } = useAgents();
  const [view, setView] = useState<View>('list');
  const [editingAgent, setEditingAgent] = useState<AgentDef | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [capabilities, setCapabilities] = useState<AgentCapability[]>([]);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [initial, setInitial] = useState('');


  const resetForm = () => {
    setName('');
    setDescription('');
    setTargetUrl('');
    setCapabilities([]);
    setSystemPrompt('');
    setColor(COLORS[0]);
    setInitial('');
    setEditingAgent(null);
  };

  const loadAgentToForm = (agent: AgentDef) => {
    setName(agent.name);
    setDescription(agent.description);
    setTargetUrl(agent.targetUrl ?? '');
    setCapabilities([...agent.capabilities]);
    setSystemPrompt(agent.systemPrompt);
    setColor(agent.color);
    setInitial(agent.initial);
    setEditingAgent(agent);
    setView('edit');
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    const agent: AgentDef = {
      id: editingAgent?.id ?? generateAgentId(),
      name: name.trim(),
      description: description.trim(),
      color,
      initial: (initial || name[0] || 'A').toUpperCase(),
      targetUrl: targetUrl.trim() || undefined,
      capabilities,
      systemPrompt: systemPrompt.trim() || `You are ${name.trim()}, a helpful AI agent.`,
      createdAt: editingAgent?.createdAt ?? new Date().toISOString(),
    };
    await saveAgent(agent);
    resetForm();
    setView('list');
  };

  const handleDelete = async (id: string) => {
    await deleteAgent(id);
  };

  const toggleCapability = (cap: AgentCapability) => {
    setCapabilities(prev =>
      prev.includes(cap) ? prev.filter(c => c !== cap) : [...prev, cap]
    );
  };

  // ── List View ──────────────────────────────────────────────────────────────
  if (view === 'list') {
    return (
      <div className="flex flex-col h-full gap-2">
        <div className="flex items-center justify-between pb-2 border-b border-gray-700/50">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Agents</p>
          <button
            onClick={() => { resetForm(); setView('create'); }}
            className="flex items-center gap-1 px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded-lg transition-colors"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1.5">
          {agents.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-500">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <p className="text-xs">No agents yet. Create your first one.</p>
            </div>
          )}
          {agents.map(agent => (
            <div key={agent.id} className="flex items-center gap-2.5 p-2 bg-gray-700/30 hover:bg-gray-700/50 rounded-lg group transition-colors">
              <div className={`w-8 h-8 ${agent.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                <span className="text-white text-sm font-bold">{agent.initial}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white truncate">{agent.name}</p>
                <p className="text-xs text-gray-500 truncate">{agent.description || agent.targetUrl || 'No description'}</p>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => loadAgentToForm(agent)}
                  className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-600 rounded-lg transition-colors"
                  title="Edit"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(agent.id)}
                  className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-600 rounded-lg transition-colors"
                  title="Delete"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Create / Edit View ─────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full gap-2">
      <div className="flex items-center gap-2 pb-2 border-b border-gray-700/50">
        <button
          onClick={() => { resetForm(); setView('list'); }}
          className="p-1 text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <p className="text-xs font-medium text-white">
          {view === 'create' ? 'New Agent' : `Edit — ${editingAgent?.name}`}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {/* Name + Initial + Color */}
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-xs text-gray-400 mb-1">Name</label>
            <input
              value={name}
              onChange={e => { setName(e.target.value); if (!initial) setInitial(e.target.value[0] ?? ''); }}
              placeholder="Ouzo ERP Agent"
              className="w-full px-2.5 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div className="w-14">
            <label className="block text-xs text-gray-400 mb-1">Initial</label>
            <input
              value={initial}
              onChange={e => setInitial(e.target.value.slice(0, 1))}
              maxLength={1}
              className="w-full px-2.5 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-xs text-gray-100 text-center focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Color picker */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Color</label>
          <div className="flex gap-1.5 flex-wrap">
            {COLORS.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-6 h-6 rounded-lg ${c} transition-all ${color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-800 scale-110' : 'opacity-60 hover:opacity-100'}`}
              />
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Description</label>
          <input
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Manages invoices and customers in Ouzo ERP"
            className="w-full px-2.5 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Target URL */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Target URL</label>
          <input
            value={targetUrl}
            onChange={e => setTargetUrl(e.target.value)}
            placeholder="https://app.ouzoerp.com"
            className="w-full px-2.5 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Capabilities */}
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Capabilities</label>
          <div className="grid grid-cols-2 gap-1.5">
            {CAPABILITIES.map(cap => (
              <button
                key={cap.value}
                onClick={() => toggleCapability(cap.value)}
                className={`flex flex-col p-2 rounded-lg border text-left transition-all ${
                  capabilities.includes(cap.value)
                    ? 'border-emerald-500/50 bg-emerald-500/10'
                    : 'border-gray-600 bg-gray-700/30 hover:border-gray-500'
                }`}
              >
                <span className={`text-xs font-medium ${capabilities.includes(cap.value) ? 'text-emerald-400' : 'text-gray-300'}`}>
                  {cap.label}
                </span>
                <span className="text-xs text-gray-500">{cap.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* System Prompt */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">System Prompt</label>
          <textarea
            value={systemPrompt}
            onChange={e => setSystemPrompt(e.target.value)}
            placeholder="You are an AI agent that helps manage Ouzo ERP..."
            rows={3}
            className="w-full px-2.5 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
          />
        </div>
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={!name.trim()}
        className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors"
      >
        {view === 'create' ? 'Create Agent' : 'Save Changes'}
      </button>
    </div>
  );
}
