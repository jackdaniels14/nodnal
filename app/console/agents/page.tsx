'use client';

import { useState, useRef, useEffect } from 'react';
import { AgentDef } from '@/lib/agents/agent-types';
import { useAgents, useAgentSession, useAgentMemory } from '@/lib/agents/use-agents';

type View = 'status' | 'chat';

export default function AgentsPage() {
  const { agents } = useAgents();
  const [selectedAgent, setSelectedAgent] = useState<AgentDef | null>(null);
  const [view, setView] = useState<View>('status');
  const [messages, setMessages] = useState<{ role: string; content: string; ts: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { session } = useAgentSession(selectedAgent?.id ?? null);
  const { memories } = useAgentMemory(selectedAgent?.id ?? null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const openChat = (agent: AgentDef) => {
    setSelectedAgent(agent);
    setMessages([]);
    setView('chat');
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const send = async () => {
    if (!input.trim() || loading || !selectedAgent) return;
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
          agentId: selectedAgent.id,
          agentName: selectedAgent.name,
          agentDescription: selectedAgent.description,
          agentSystemPrompt: selectedAgent.systemPrompt,
          agentTargetUrl: selectedAgent.targetUrl,
          agentCapabilities: selectedAgent.capabilities,
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

  // ── Status View ─────────────────────────────────────────────────────────────
  if (view === 'status') {
    return (
      <div className="h-full flex flex-col">
        <div className="px-6 pt-4 pb-3 flex-shrink-0">
          <h1 className="text-lg font-semibold text-white">AI Agents</h1>
          <p className="text-xs text-gray-500 mt-0.5">Your team at a glance</p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {agents.map(agent => (
              <button key={agent.id} onClick={() => openChat(agent)}
                className="bg-gray-800 border border-gray-700 rounded-xl p-5 text-left hover:border-gray-600 transition-all group">
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 ${agent.color} rounded-xl flex items-center justify-center`}>
                    <span className="text-white text-lg font-bold">{agent.initial}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{agent.name}</p>
                    <p className="text-xs text-gray-500">{agent.description?.split('—')[0]?.trim()}</p>
                  </div>
                  <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full" title="Online" />
                </div>

                {/* Role description */}
                <p className="text-xs text-gray-400 mb-4 line-clamp-2">
                  {agent.description?.split('—')[1]?.trim() || agent.description}
                </p>

                {/* Capabilities */}
                <div className="flex gap-1.5 mb-4">
                  {agent.capabilities?.map(cap => (
                    <span key={cap} className="text-xs px-2 py-0.5 rounded bg-gray-700/50 text-gray-400">{cap}</span>
                  ))}
                </div>

                {/* Quick stats */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-700/50">
                  <span className="text-xs text-gray-600">Tap to message</span>
                  <svg className="w-4 h-4 text-gray-600 group-hover:text-emerald-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
              </button>
            ))}
          </div>

          {agents.length === 0 && (
            <div className="text-center py-16 border border-dashed border-gray-700 rounded-xl">
              <p className="text-sm text-gray-500">No agents configured yet.</p>
              <p className="text-xs text-gray-600 mt-1">Create agents in the AI Manager.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Chat View (iMessage style) ──────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col">
      {/* Header bar */}
      <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-3 flex-shrink-0">
        <button onClick={() => setView('status')} className="p-1 text-gray-400 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        {selectedAgent && (
          <>
            <div className={`w-8 h-8 ${selectedAgent.color} rounded-full flex items-center justify-center`}>
              <span className="text-white text-sm font-bold">{selectedAgent.initial}</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">{selectedAgent.name}</p>
              <p className="text-xs text-gray-500">{selectedAgent.description?.split('—')[0]?.trim()}</p>
            </div>
            <div className="w-2 h-2 bg-emerald-500 rounded-full" />
          </>
        )}
      </div>

      {/* Messages — iMessage style */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && selectedAgent && (
          <div className="text-center pt-8 pb-4">
            <div className={`w-16 h-16 ${selectedAgent.color} rounded-full flex items-center justify-center mx-auto mb-3`}>
              <span className="text-white text-2xl font-bold">{selectedAgent.initial}</span>
            </div>
            <p className="text-sm font-medium text-white">{selectedAgent.name}</p>
            <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">{selectedAgent.description}</p>

            {/* Memory count */}
            {memories.length > 0 && (
              <p className="text-xs text-gray-600 mt-3">{memories.length} memories stored</p>
            )}

            {/* Quick prompts */}
            <div className="flex flex-wrap justify-center gap-2 mt-4 max-w-md mx-auto">
              {selectedAgent.name === 'Tara' && (
                <>
                  <QuickPrompt text="What needs my attention today?" onSend={(t) => { setInput(t); }} />
                  <QuickPrompt text="Give me a task summary" onSend={(t) => { setInput(t); }} />
                </>
              )}
              {selectedAgent.name === 'Parker' && (
                <>
                  <QuickPrompt text="Any new prospects to look at?" onSend={(t) => { setInput(t); }} />
                  <QuickPrompt text="Build me a prospect list for Seattle" onSend={(t) => { setInput(t); }} />
                </>
              )}
              {selectedAgent.name === 'Quinn' && (
                <>
                  <QuickPrompt text="How's our data quality?" onSend={(t) => { setInput(t); }} />
                  <QuickPrompt text="Any accounts need updating?" onSend={(t) => { setInput(t); }} />
                </>
              )}
              {selectedAgent.name === 'Cassidy' && (
                <>
                  <QuickPrompt text="What management companies should I know about?" onSend={(t) => { setInput(t); }} />
                  <QuickPrompt text="Any batch opportunities?" onSend={(t) => { setInput(t); }} />
                </>
              )}
            </div>
          </div>
        )}

        <div className="space-y-2">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] ${m.role === 'user' ? '' : 'flex gap-2'}`}>
                {m.role !== 'user' && selectedAgent && (
                  <div className={`w-6 h-6 ${selectedAgent.color} rounded-full flex items-center justify-center flex-shrink-0 mt-1`}>
                    <span className="text-white text-xs font-bold">{selectedAgent.initial}</span>
                  </div>
                )}
                <div>
                  <div className={`rounded-2xl px-3.5 py-2 text-sm select-text ${
                    m.role === 'user'
                      ? 'bg-emerald-500 text-white rounded-br-md'
                      : 'bg-gray-800 text-gray-200 rounded-bl-md'
                  }`}>
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  </div>
                  <p className={`text-xs text-gray-600 mt-0.5 px-1 ${m.role === 'user' ? 'text-right' : ''}`}>
                    {new Date(m.ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-2">
              {selectedAgent && (
                <div className={`w-6 h-6 ${selectedAgent.color} rounded-full flex items-center justify-center flex-shrink-0`}>
                  <span className="text-white text-xs font-bold">{selectedAgent.initial}</span>
                </div>
              )}
              <div className="bg-gray-800 rounded-2xl rounded-bl-md px-4 py-2.5">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input — iMessage style */}
      <div className="px-4 py-3 border-t border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-2 bg-gray-800 rounded-full px-1 border border-gray-700">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={`Message ${selectedAgent?.name || 'agent'}...`}
            className="flex-1 px-3 py-2.5 bg-transparent text-sm text-gray-100 placeholder-gray-500 focus:outline-none"
          />
          <button onClick={send} disabled={loading || !input.trim()}
            className={`p-2 rounded-full transition-colors ${input.trim() ? 'bg-emerald-500 text-white' : 'text-gray-600'}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Quick Prompt Button ─────────────────────────────────────────────────────

function QuickPrompt({ text, onSend }: { text: string; onSend: (text: string) => void }) {
  return (
    <button onClick={() => onSend(text)}
      className="px-3 py-1.5 text-xs bg-gray-800 border border-gray-700 rounded-full text-gray-400 hover:text-emerald-400 hover:border-emerald-500/30 transition-colors">
      {text}
    </button>
  );
}
