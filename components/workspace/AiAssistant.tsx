'use client';

import { useState, useRef, useEffect } from 'react';
import { WorkspaceState, Block, GridItem, BLOCK_DEFAULTS } from '@/lib/workspace-types';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AiCommand {
  action: 'add' | 'delete' | 'move' | 'resize' | 'edit' | 'clear';
  block?: Omit<Block, 'id'>;
  blockId?: string;
  position?: { x: number; y: number; w?: number; h?: number };
  config?: Partial<Block['config']>;
}

function applyCommands(workspace: WorkspaceState, commands: AiCommand[]): WorkspaceState {
  let { blocks, layout } = { blocks: [...workspace.blocks], layout: [...workspace.layout] };

  for (const cmd of commands) {
    if (cmd.action === 'clear') {
      blocks = []; layout = [];
    } else if (cmd.action === 'add' && cmd.block) {
      const id = `ai-block-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const defaults = BLOCK_DEFAULTS[cmd.block.type];
      const pos = cmd.position ?? { x: 0, y: layout.reduce((m, l) => Math.max(m, l.y + l.h), 0) };
      blocks.push({ ...cmd.block, id });
      layout.push({ i: id, x: pos.x, y: pos.y, w: pos.w ?? defaults.w, h: pos.h ?? defaults.h, minW: defaults.minW, minH: defaults.minH });
    } else if (cmd.action === 'delete' && cmd.blockId) {
      blocks = blocks.filter(b => b.id !== cmd.blockId);
      layout = layout.filter(l => l.i !== cmd.blockId);
    } else if (cmd.action === 'move' && cmd.blockId && cmd.position) {
      layout = layout.map(l => l.i === cmd.blockId ? { ...l, x: cmd.position!.x, y: cmd.position!.y } : l);
    } else if (cmd.action === 'resize' && cmd.blockId && cmd.position) {
      layout = layout.map(l => l.i === cmd.blockId ? { ...l, w: cmd.position!.w ?? l.w, h: cmd.position!.h ?? l.h } : l);
    } else if (cmd.action === 'edit' && cmd.blockId && cmd.config) {
      blocks = blocks.map(b => b.id === cmd.blockId ? { ...b, config: { ...b.config, ...cmd.config } } : b);
    }
  }

  return { blocks, layout };
}

interface Props {
  workspace: WorkspaceState;
  onApply: (next: WorkspaceState) => void;
}

export default function AiAssistant({ workspace, onApply }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: 'user', content: input.trim() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai-workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next, workspace }),
      });
      const data = await res.json();
      const reply = data.content as string;
      setMessages(m => [...m, { role: 'assistant', content: reply }]);

      // Parse and apply commands
      const match = reply.match(/<commands>([\s\S]*?)<\/commands>/);
      if (match) {
        try {
          const commands: AiCommand[] = JSON.parse(match[1]);
          onApply(applyCommands(workspace, commands));
        } catch {
          // ignore parse errors
        }
      }
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'Error reaching the AI. Make sure ANTHROPIC_API_KEY is set in .env.local.' }]);
    }
    setLoading(false);
  };

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
          open
            ? 'bg-violet-500/20 text-violet-400 border-violet-500/40'
            : 'bg-gray-800 text-gray-400 border-gray-700 hover:text-gray-200 hover:border-gray-500'
        }`}
        title="AI Layout Assistant"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        AI
      </button>

      {/* Slide-out panel */}
      {open && (
        <div className="fixed right-0 top-0 h-full w-80 bg-gray-800 border-l border-gray-700 z-40 flex flex-col shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-violet-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">AI Assistant</p>
                <p className="text-xs text-gray-500">Edit layouts with natural language</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="p-1 text-gray-400 hover:text-white transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {/* Examples */}
          {messages.length === 0 && (
            <div className="px-4 py-3 border-b border-gray-700/50">
              <p className="text-xs text-gray-500 mb-2">Try saying:</p>
              {[
                'Add a stat block showing "42 users" in the top left',
                'Add a bar chart with sales data',
                'Delete all blocks and start fresh',
                'Add a table with Name, Status, Date columns',
                'Move block to position d3',
              ].map(ex => (
                <button key={ex} onClick={() => setInput(ex)}
                  className="block w-full text-left text-xs text-gray-400 hover:text-emerald-400 py-1 transition-colors truncate">
                  "{ex}"
                </button>
              ))}
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`text-xs rounded-xl px-3 py-2 leading-relaxed ${
                m.role === 'user'
                  ? 'bg-gray-700 text-gray-200 ml-4'
                  : 'bg-violet-500/10 border border-violet-500/20 text-gray-300 mr-4'
              }`}>
                {/* Strip commands tags from display */}
                {m.content.replace(/<commands>[\s\S]*?<\/commands>/g, '').trim() || '✓ Commands applied.'}
                {m.content.includes('<commands>') && (
                  <p className="text-violet-400 mt-1 text-xs">✓ Layout updated</p>
                )}
              </div>
            ))}
            {loading && (
              <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl px-3 py-2 mr-4">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t border-gray-700">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Describe what you want…"
                className="flex-1 text-xs px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <button onClick={send} disabled={loading || !input.trim()}
                className="px-3 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
