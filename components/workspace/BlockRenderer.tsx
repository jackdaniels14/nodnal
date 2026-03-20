'use client';

import { useEffect, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Block } from '@/lib/workspace-types';
import { APP_REGISTRY } from '@/lib/app-registry';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolvePath(obj: unknown, path: string): string {
  if (!path) return JSON.stringify(obj);
  const parts = path.split('.');
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return '—';
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur != null ? String(cur) : '—';
}

function FetchedValue({ url, path, label }: { url: string; path: string; label?: string }) {
  const [value, setValue] = useState('...');
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!url) return;
    fetch(url)
      .then(r => r.json())
      .then(data => setValue(resolvePath(data, path)))
      .catch(() => { setError(true); setValue('Error'); });
  }, [url, path]);
  return (
    <div className="flex flex-col gap-1">
      {label && <p className="text-xs text-gray-400">{label}</p>}
      <p className={`text-2xl font-bold truncate ${error ? 'text-red-400' : 'text-white'}`}>{value}</p>
    </div>
  );
}

const PIE_COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6'];

// ─── AI Block mini-chat ───────────────────────────────────────────────────────

function AiChat({ block }: { block: Block }) {
  const { config } = block;
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>(
    config.aiMessages ?? []
  );
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: 'user' as const, content: input.trim() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next, systemPrompt: config.aiSystemPrompt }),
      });
      const data = await res.json();
      setMessages(m => [...m, { role: 'assistant', content: data.content }]);
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'Error — check your API key.' }]);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full gap-2">
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {messages.length === 0 && (
          <p className="text-xs text-gray-500 italic">
            {config.aiSystemPrompt ? `AI: ${config.aiSystemPrompt.slice(0, 60)}...` : 'Ask anything…'}
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`text-xs rounded-lg px-2.5 py-1.5 max-w-[90%] ${
            m.role === 'user'
              ? 'bg-emerald-600/30 text-emerald-100 ml-auto'
              : 'bg-gray-700 text-gray-200'
          }`}>
            {m.content}
          </div>
        ))}
        {loading && <div className="text-xs text-gray-500 italic">Thinking…</div>}
      </div>
      <div className="flex gap-1.5">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') send(); }}
          placeholder="Type a message…"
          className="flex-1 text-xs px-2 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
        <button
          onClick={send}
          className="px-2 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── Main Renderer ────────────────────────────────────────────────────────────

export default function BlockRenderer({ block }: { block: Block }) {
  const { type, config } = block;

  switch (type) {

    // ── Stat ─────────────────────────────────────────────────────────────────
    case 'stat': {
      if (config.dataUrl) {
        return (
          <div className="flex flex-col justify-center h-full px-1">
            <FetchedValue url={config.dataUrl} path={config.dataPath ?? ''} label={config.dataLabel || config.statLabel} />
            {config.statUnit && <p className="text-xs text-gray-500 mt-1">{config.statUnit}</p>}
          </div>
        );
      }
      return (
        <div className="flex flex-col justify-center h-full px-1">
          <p className="text-3xl font-bold text-white truncate">
            {config.statValue || '—'}
            {config.statUnit && <span className="text-lg text-gray-400 ml-1">{config.statUnit}</span>}
          </p>
          {config.statLabel && <p className="text-xs text-gray-400 mt-1">{config.statLabel}</p>}
        </div>
      );
    }

    // ── Text ─────────────────────────────────────────────────────────────────
    case 'text':
      return (
        <div className="h-full overflow-auto">
          <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
            {config.textContent || 'No content yet.'}
          </p>
        </div>
      );

    // ── Link ─────────────────────────────────────────────────────────────────
    case 'link': {
      const href = config.linkUrl || '#';
      const isExternal = href.startsWith('http');
      return (
        <a href={href} target={isExternal ? '_blank' : undefined} rel={isExternal ? 'noopener noreferrer' : undefined}
          className="flex flex-col justify-between h-full group"
          onClick={e => { if (!config.linkUrl) e.preventDefault(); }}>
          <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center group-hover:bg-emerald-500/30 transition-colors">
            <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-white group-hover:text-emerald-400 transition-colors">{config.linkLabel || 'Link'}</p>
            {config.linkDescription && <p className="text-xs text-gray-500 mt-0.5 truncate">{config.linkDescription}</p>}
            {config.linkUrl && <p className="text-xs text-gray-600 mt-0.5 truncate">{config.linkUrl}</p>}
          </div>
        </a>
      );
    }

    // ── Embed ────────────────────────────────────────────────────────────────
    case 'embed':
      if (!config.embedUrl) {
        return (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-500">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            <p className="text-xs">Set a URL to embed</p>
          </div>
        );
      }
      return <iframe src={config.embedUrl} className="w-full h-full rounded border-0" sandbox="allow-scripts allow-same-origin allow-forms" title={block.title} />;

    // ── List ─────────────────────────────────────────────────────────────────
    case 'list': {
      const items = config.listItems ?? [];
      return (
        <div className="h-full overflow-auto">
          {items.length === 0
            ? <p className="text-xs text-gray-500">No items yet.</p>
            : <ul className="space-y-1.5">
                {items.map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
          }
        </div>
      );
    }

    // ── Table ────────────────────────────────────────────────────────────────
    case 'table': {
      const headers = config.tableHeaders ?? [];
      const rows = config.tableRows ?? [];
      if (headers.length === 0) {
        return <p className="text-xs text-gray-500">No table data. Edit this block to add headers and rows.</p>;
      }
      return (
        <div className="h-full overflow-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-700">
                {headers.map((h, i) => (
                  <th key={i} className="text-left py-1.5 px-2 text-gray-400 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} className="border-b border-gray-700/40 hover:bg-gray-700/20">
                  {headers.map((_, ci) => (
                    <td key={ci} className="py-1.5 px-2 text-gray-300">{row[ci] ?? ''}</td>
                  ))}
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={headers.length} className="py-3 text-center text-gray-500">No rows yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      );
    }

    // ── Chart ────────────────────────────────────────────────────────────────
    case 'chart': {
      const data = config.chartData ?? [];
      const color = config.chartColor ?? '#10b981';
      if (data.length === 0) {
        return <div className="flex items-center justify-center h-full text-xs text-gray-500">No chart data. Edit to add data.</div>;
      }
      if (config.chartType === 'pie') {
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="70%" label={({ name }) => name}>
                {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '8px', fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        );
      }
      if (config.chartType === 'line') {
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
              <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '8px', fontSize: '12px' }} />
              <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        );
      }
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} />
            <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
            <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '8px', fontSize: '12px' }} />
            <Bar dataKey="value" fill={color} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    // ── Email ────────────────────────────────────────────────────────────────
    case 'email':
      return (
        <div className="flex flex-col gap-2 h-full">
          <div className="grid grid-cols-[40px_1fr] gap-1 items-center">
            <span className="text-xs text-gray-500">To</span>
            <p className="text-xs text-gray-300 truncate">{config.emailTo || <span className="text-gray-600">—</span>}</p>
            <span className="text-xs text-gray-500">Re</span>
            <p className="text-xs text-gray-300 truncate">{config.emailSubject || <span className="text-gray-600">—</span>}</p>
          </div>
          <div className="flex-1 overflow-auto border-t border-gray-700/50 pt-2">
            <p className="text-xs text-gray-400 leading-relaxed whitespace-pre-wrap">{config.emailBody || 'No body.'}</p>
          </div>
          <button className="w-full py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-600/30 text-emerald-400 text-xs rounded-lg transition-colors">
            Open Draft
          </button>
        </div>
      );

    // ── AI Chat Block ─────────────────────────────────────────────────────────
    case 'ai':
      return <AiChat block={block} />;

    // ── App Block ─────────────────────────────────────────────────────────────
    case 'app': {
      const app = APP_REGISTRY.find(a => a.id === config.appId);
      if (!app) {
        return <div className="flex items-center justify-center h-full text-xs text-gray-500">No app selected. Edit to choose one.</div>;
      }
      return (
        <div className="flex flex-col gap-3 h-full">
          <div className={`${app.color} rounded-lg p-3 flex items-center gap-3`}>
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-bold">{app.initial}</span>
            </div>
            <p className="text-white font-semibold text-sm">{app.name}</p>
          </div>
          <div className="flex-1 overflow-auto">
            {config.appShowLinks !== false && (
              <div className="space-y-1">
                {app.links.slice(0, 4).map(link => (
                  <a key={link.label} href={link.href} target={link.external ? '_blank' : undefined}
                    rel={link.external ? 'noopener noreferrer' : undefined}
                    className="flex items-center justify-between text-xs text-gray-300 hover:text-white py-1 px-2 hover:bg-gray-700 rounded-lg transition-colors">
                    {link.label}
                    <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    default:
      return null;
  }
}
