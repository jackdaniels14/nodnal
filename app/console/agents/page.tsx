'use client';

import { useState, useEffect, useRef } from 'react';
import { AgentDef } from '@/lib/agents/agent-types';
import { useAgents } from '@/lib/agents/use-agents';

export default function AgentsPage() {
  const { agents } = useAgents();
  const [selectedAgent, setSelectedAgent] = useState<AgentDef | null>(null);
  const [messages, setMessages] = useState<{ role: string; content: string; ts: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: 'user', content: input.trim(), ts: new Date().toISOString() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/agents/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: selectedAgent?.id || 'default',
          agentName: selectedAgent?.name || 'Default',
          agentDescription: selectedAgent?.description || 'General-purpose assistant',
          agentSystemPrompt: selectedAgent?.systemPrompt || '',
          agentTargetUrl: selectedAgent?.targetUrl,
          agentCapabilities: selectedAgent?.capabilities || [],
          messages: updated.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.content, ts: new Date().toISOString() }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error communicating with agent.', ts: new Date().toISOString() }]);
    }
    setLoading(false);
  };

  return (
    <div className="h-full flex">
      {/* Agent list */}
      <div className="w-56 border-r border-gray-800 flex flex-col flex-shrink-0">
        <div className="px-4 pt-4 pb-2">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Agents</h2>
        </div>
        <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
          {/* Default agent */}
          <button onClick={() => { setSelectedAgent(null); setMessages([]); }}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${!selectedAgent ? 'bg-emerald-500/15 text-emerald-400' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
            <div className="w-6 h-6 bg-gray-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">D</span>
            </div>
            <div>
              <p className="text-xs font-medium">Default</p>
              <p className="text-xs text-gray-600">General assistant</p>
            </div>
          </button>
          {agents.map(a => (
            <button key={a.id} onClick={() => { setSelectedAgent(a); setMessages([]); }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${selectedAgent?.id === a.id ? 'bg-emerald-500/15 text-emerald-400' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
              <div className={`w-6 h-6 ${a.color} rounded-lg flex items-center justify-center`}>
                <span className="text-white text-xs font-bold">{a.initial}</span>
              </div>
              <div>
                <p className="text-xs font-medium">{a.name}</p>
                <p className="text-xs text-gray-600 truncate w-28">{a.description || a.targetUrl || 'No description'}</p>
              </div>
            </button>
          ))}
        </div>
        <div className="p-2 border-t border-gray-800">
          <p className="text-xs text-gray-600 text-center">Manage agents in AI Manager</p>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2 flex-shrink-0">
          {selectedAgent ? (
            <>
              <div className={`w-7 h-7 ${selectedAgent.color} rounded-lg flex items-center justify-center`}>
                <span className="text-white text-xs font-bold">{selectedAgent.initial}</span>
              </div>
              <div>
                <p className="text-sm font-medium text-white">{selectedAgent.name}</p>
                <p className="text-xs text-gray-500">{selectedAgent.description || 'Agent'}</p>
              </div>
            </>
          ) : (
            <>
              <div className="w-7 h-7 bg-gray-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-xs font-bold">D</span>
              </div>
              <div>
                <p className="text-sm font-medium text-white">Default Agent</p>
                <p className="text-xs text-gray-500">General-purpose assistant</p>
              </div>
            </>
          )}
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <p className="text-sm text-gray-600 text-center pt-12">Send a message to start chatting with {selectedAgent?.name || 'the agent'}.</p>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`max-w-[80%] ${m.role === 'user' ? 'ml-auto' : ''}`}>
              <div className={`rounded-xl px-4 py-2.5 text-sm select-text ${
                m.role === 'user' ? 'bg-emerald-500/20 text-emerald-100' : 'bg-gray-800 text-gray-200 border border-gray-700'
              }`}>
                <p className="whitespace-pre-wrap">{m.content}</p>
              </div>
              <p className="text-xs text-gray-600 mt-1 px-1">{new Date(m.ts).toLocaleTimeString()}</p>
            </div>
          ))}
          {loading && <div className="text-sm text-gray-500 italic flex items-center gap-2"><span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> Thinking...</div>}
        </div>

        <div className="p-4 border-t border-gray-800 flex-shrink-0">
          <div className="flex gap-2">
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') send(); }}
              placeholder={`Message ${selectedAgent?.name || 'agent'}...`}
              className="flex-1 px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
            <button onClick={send} disabled={loading}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-700 text-white rounded-xl transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
