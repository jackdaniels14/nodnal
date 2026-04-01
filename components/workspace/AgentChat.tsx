'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Block } from '@/lib/workspace-types';
import { AgentDef, AgentMessage, AgentSession, BlockAction } from '@/lib/agents/agent-types';
import AiSummary from '../AiSummary';
import { getAgent, getSession, updateSession } from '@/lib/agents/use-agents';

interface Props {
  block: Block;
  onBlockAction?: (agentId: string, actions: BlockAction[]) => void;
  workspaceBlocks?: Block[];
}

export default function AgentChat({ block, onBlockAction, workspaceBlocks }: Props) {
  const { config } = block;
  const agentDefId = config.agentDefId;

  const [agent, setAgent] = useState<AgentDef | null>(null);
  const [session, setSession] = useState<AgentSession | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load agent def and session
  useEffect(() => {
    if (!agentDefId) return;
    (async () => {
      const def = await getAgent(agentDefId);
      if (def) {
        setAgent(def);
        const sess = await getSession(def.id);
        setSession(sess);
      }
    })();
  }, [agentDefId]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [session?.messages]);

  const send = useCallback(async () => {
    if (!input.trim() || loading || !agent || !session) return;

    const userMsg: AgentMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...session.messages, userMsg];
    const updated = await updateSession(agent.id, { messages: updatedMessages, status: 'running' });
    setSession(updated);
    setInput('');
    setLoading(true);

    try {
      // Build workspace context — only blocks owned by this agent or unowned
      const contextBlocks = (workspaceBlocks ?? [])
        .filter(b => b.id !== block.id && (b.config.agentId === agent.id || !b.config.agentId))
        .map(b => ({ id: b.id, type: b.type, title: b.title, agentOwned: b.config.agentId === agent.id }));

      const res = await fetch('/api/agents/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: agent.id,
          agentName: agent.name,
          agentDescription: agent.description,
          agentSystemPrompt: agent.systemPrompt,
          agentTargetUrl: agent.targetUrl,
          agentCapabilities: agent.capabilities,
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
          linkedBlockIds: session.linkedBlockIds,
          workspaceContext: contextBlocks,
        }),
      });

      const data = await res.json();

      const assistantMsg: AgentMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: data.content,
        timestamp: new Date().toISOString(),
        blockActions: data.blockActions,
      };

      const finalMessages = [...updatedMessages, assistantMsg];
      const finalSession = await updateSession(agent.id, { messages: finalMessages, status: 'idle' });
      setSession(finalSession);

      // If the agent wants to spawn/update blocks, notify parent
      if (data.blockActions?.length && onBlockAction) {
        onBlockAction(agent.id, data.blockActions);
      }
    } catch {
      const errorMsg: AgentMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: 'Error communicating with agent. Check your API key.',
        timestamp: new Date().toISOString(),
      };
      const finalSession = await updateSession(agent.id, {
        messages: [...updatedMessages, errorMsg],
        status: 'error',
      });
      setSession(finalSession);
    }

    setLoading(false);
  }, [input, loading, agent, session, onBlockAction]);

  // No agent configured
  if (!agentDefId || !agent) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-500">
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <p className="text-xs">No agent assigned. Edit this block to select one.</p>
      </div>
    );
  }

  const messages = session?.messages ?? [];
  const statusColor = session?.status === 'running' ? 'bg-amber-500' : session?.status === 'error' ? 'bg-red-500' : 'bg-emerald-500';

  return (
    <div className="flex flex-col h-full gap-2">
      {/* Agent header */}
      <div className="flex items-center gap-2 pb-2 border-b border-gray-700/50">
        <div className={`w-6 h-6 ${agent.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
          <span className="text-white text-xs font-bold">{agent.initial}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-white truncate">{agent.name}</p>
          {agent.targetUrl && (
            <p className="text-xs text-gray-500 truncate">{agent.targetUrl}</p>
          )}
        </div>
        <div className={`w-2 h-2 rounded-full ${statusColor} flex-shrink-0`} title={session?.status ?? 'idle'} />
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-2 pr-1">
        {messages.length === 0 && (
          <div className="text-xs text-gray-500 italic">
            {agent.description
              ? <AiSummary text={agent.description} maxLength={80} className="text-xs" />
              : <p>Chat with {agent.name}...</p>
            }
          </div>
        )}
        {messages.map(m => (
          <div key={m.id} className={`group/msg relative text-xs rounded-lg px-2.5 py-1.5 max-w-[90%] select-text ${
            m.role === 'user'
              ? 'bg-emerald-600/30 text-emerald-100 ml-auto'
              : m.role === 'system'
              ? 'bg-gray-600/30 text-gray-400 italic'
              : 'bg-gray-700 text-gray-200'
          }`}>
            <span className="whitespace-pre-wrap select-text cursor-text">{m.content}</span>
            {m.role === 'assistant' && m.content && (
              <button
                onClick={() => navigator.clipboard.writeText(m.content)}
                className="absolute top-1 right-1 p-1 rounded bg-gray-600/50 hover:bg-gray-500/50 text-gray-400 hover:text-white opacity-0 group-hover/msg:opacity-100 transition-opacity"
                title="Copy"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            )}
            {m.blockActions && m.blockActions.length > 0 && (
              <div className="mt-1.5 pt-1.5 border-t border-gray-600/50">
                <p className="text-xs text-gray-400">
                  {m.blockActions.length} block {m.blockActions.length === 1 ? 'action' : 'actions'} applied
                </p>
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="text-xs text-gray-500 italic flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${agent.color} animate-pulse`} />
            Thinking...
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex gap-1.5">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') send(); }}
          placeholder={`Ask ${agent.name}...`}
          className="flex-1 text-xs px-2 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
        <button
          onClick={send}
          disabled={loading}
          className="px-2 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-600 text-white rounded-lg transition-colors"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>
    </div>
  );
}
