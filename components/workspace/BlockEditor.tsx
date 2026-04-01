'use client';

import { useState, useEffect } from 'react';
import { Block, BlockType, BlockConfig, ExpansionRule, MovementRule, fromGridId, toGridId } from '@/lib/workspace-types';
import { APP_REGISTRY } from '@/lib/app-registry';
import { useAgents } from '@/lib/agents/use-agents';

const BLOCK_TYPES: { type: BlockType; label: string; desc: string; icon: string }[] = [
  { type: 'stat',  label: 'Stat',   desc: 'Single number or value',        icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { type: 'text',  label: 'Text',   desc: 'Notes or description',           icon: 'M4 6h16M4 12h16M4 18h7' },
  { type: 'link',  label: 'Link',   desc: 'Clickable link tile',            icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1' },
  { type: 'embed', label: 'Embed',  desc: 'Embed any URL',                  icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4' },
  { type: 'list',  label: 'List',   desc: 'Bullet list',                    icon: 'M4 6h16M4 10h16M4 14h16M4 18h16' },
  { type: 'table', label: 'Table',  desc: 'Data table with rows & columns', icon: 'M3 10h18M3 14h18M10 3v18M6 3h12a3 3 0 013 3v12a3 3 0 01-3 3H6a3 3 0 01-3-3V6a3 3 0 013-3z' },
  { type: 'chart', label: 'Chart',  desc: 'Bar, line, or pie chart',        icon: 'M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z' },
  { type: 'email', label: 'Email',  desc: 'Email draft or template',        icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
  { type: 'ai',    label: 'AI Chat',desc: 'Embedded AI assistant',          icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
  { type: 'app',   label: 'App',    desc: 'App launcher with quick links',  icon: 'M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z' },
  { type: 'agent', label: 'Agent',  desc: 'AI agent with tools & actions',  icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
  { type: 'agent-manager', label: 'Agent Manager', desc: 'Create & manage your agents', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
  { type: 'group', label: 'Group', desc: 'Container for organizing blocks', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
];

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-300 mb-1">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-600 mt-1">{hint}</p>}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = 'text' }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
  );
}

function Textarea({ value, onChange, placeholder, rows = 4 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500">
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function NumberInput({ value, onChange, min, max }: { value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <input type="number" value={value} min={min} max={max}
      onChange={e => onChange(Number(e.target.value))}
      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
  );
}

// ─── Content Panels ───────────────────────────────────────────────────────────

function ContentPanel({ type, config, set }: { type: BlockType; config: BlockConfig; set: (k: keyof BlockConfig, v: unknown) => void }) {
  const [listInput, setListInput] = useState('');
  const [tableColInput, setTableColInput] = useState('');
  const [chartRowInput, setChartRowInput] = useState({ name: '', value: '' });
  const { agents: allAgentDefs } = useAgents();

  switch (type) {
    case 'stat':
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Value"><Input value={config.statValue ?? ''} onChange={v => set('statValue', v)} placeholder="42" /></Field>
            <Field label="Unit"><Input value={config.statUnit ?? ''} onChange={v => set('statUnit', v)} placeholder="users" /></Field>
          </div>
          <Field label="Label"><Input value={config.statLabel ?? ''} onChange={v => set('statLabel', v)} placeholder="This month" /></Field>
          <div className="pt-2 border-t border-gray-700">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Live Data (optional — overrides value)</p>
            <Field label="API URL" hint="JSON endpoint to fetch from"><Input value={config.dataUrl ?? ''} onChange={v => set('dataUrl', v)} placeholder="https://api.example.com/stats" /></Field>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <Field label="JSON Path" hint="e.g. data.count"><Input value={config.dataPath ?? ''} onChange={v => set('dataPath', v)} placeholder="data.count" /></Field>
              <Field label="Label"><Input value={config.dataLabel ?? ''} onChange={v => set('dataLabel', v)} placeholder="Total" /></Field>
            </div>
          </div>
        </div>
      );

    case 'text':
      return <Field label="Content"><Textarea value={config.textContent ?? ''} onChange={v => set('textContent', v)} placeholder="Write anything…" rows={6} /></Field>;

    case 'link':
      return (
        <div className="space-y-3">
          <Field label="URL"><Input value={config.linkUrl ?? ''} onChange={v => set('linkUrl', v)} placeholder="https://…" /></Field>
          <Field label="Label"><Input value={config.linkLabel ?? ''} onChange={v => set('linkLabel', v)} placeholder="Open App" /></Field>
          <Field label="Description"><Input value={config.linkDescription ?? ''} onChange={v => set('linkDescription', v)} placeholder="Short description" /></Field>
        </div>
      );

    case 'embed':
      return <Field label="URL to Embed" hint="Some sites block embedding. Works best with your own apps."><Input value={config.embedUrl ?? ''} onChange={v => set('embedUrl', v)} placeholder="https://…" /></Field>;

    case 'list': {
      const items = config.listItems ?? [];
      return (
        <div className="space-y-2">
          <Field label="Items">
            <div className="space-y-1.5 mb-2">
              {items.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="flex-1 text-xs text-gray-300 bg-gray-700 px-2.5 py-1.5 rounded-lg">{item}</span>
                  <button onClick={() => set('listItems', items.filter((_, j) => j !== i))} className="p-1 text-gray-500 hover:text-red-400 transition-colors">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={listInput} onChange={e => setListInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && listInput.trim()) { set('listItems', [...items, listInput.trim()]); setListInput(''); } }}
                placeholder="Add item, press Enter"
                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              <button onClick={() => { if (listInput.trim()) { set('listItems', [...items, listInput.trim()]); setListInput(''); } }}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs transition-colors">Add</button>
            </div>
          </Field>
        </div>
      );
    }

    case 'table': {
      const headers = config.tableHeaders ?? [];
      const rows = config.tableRows ?? [];
      return (
        <div className="space-y-3">
          <Field label="Columns">
            <div className="flex flex-wrap gap-1.5 mb-2">
              {headers.map((h, i) => (
                <div key={i} className="flex items-center gap-1 bg-gray-700 rounded-lg px-2 py-1">
                  <span className="text-xs text-gray-200">{h}</span>
                  <button onClick={() => { const nh = headers.filter((_, j) => j !== i); set('tableHeaders', nh); set('tableRows', rows.map(r => r.filter((_, j) => j !== i))); }} className="text-gray-500 hover:text-red-400 transition-colors">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={tableColInput} onChange={e => setTableColInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && tableColInput.trim()) { set('tableHeaders', [...headers, tableColInput.trim()]); setTableColInput(''); } }}
                placeholder="Column name, press Enter"
                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              <button onClick={() => { if (tableColInput.trim()) { set('tableHeaders', [...headers, tableColInput.trim()]); setTableColInput(''); } }}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs transition-colors">Add</button>
            </div>
          </Field>
          {headers.length > 0 && (
            <Field label="Rows">
              <div className="overflow-x-auto">
                <table className="w-full text-xs mb-2">
                  <thead><tr className="border-b border-gray-700">{headers.map((h, i) => <th key={i} className="text-left py-1 px-2 text-gray-400">{h}</th>)}<th className="w-6" /></tr></thead>
                  <tbody>
                    {rows.map((row, ri) => (
                      <tr key={ri} className="border-b border-gray-700/40">
                        {headers.map((_, ci) => (
                          <td key={ci} className="py-1 px-1">
                            <input value={row[ci] ?? ''} onChange={e => { const nr = rows.map((r, rj) => rj === ri ? r.map((c, cj) => cj === ci ? e.target.value : c) : r); set('tableRows', nr); }}
                              className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-xs text-gray-100 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                          </td>
                        ))}
                        <td className="py-1 px-1">
                          <button onClick={() => set('tableRows', rows.filter((_, j) => j !== ri))} className="p-1 text-gray-500 hover:text-red-400 transition-colors">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button onClick={() => set('tableRows', [...rows, Array(headers.length).fill('')])}
                  className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">+ Add Row</button>
              </div>
            </Field>
          )}
        </div>
      );
    }

    case 'chart': {
      const data = config.chartData ?? [];
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Chart Type">
              <Select value={config.chartType ?? 'bar'} onChange={v => set('chartType', v)}
                options={[{ value: 'bar', label: 'Bar' }, { value: 'line', label: 'Line' }, { value: 'pie', label: 'Pie' }]} />
            </Field>
            <Field label="Color">
              <div className="flex gap-2 items-center">
                <input type="color" value={config.chartColor ?? '#10b981'} onChange={e => set('chartColor', e.target.value)}
                  className="w-10 h-9 rounded cursor-pointer bg-gray-700 border border-gray-600" />
                <Input value={config.chartColor ?? '#10b981'} onChange={v => set('chartColor', v)} />
              </div>
            </Field>
          </div>
          <Field label="Data Points">
            <div className="space-y-1.5 mb-2">
              {data.map((d, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="flex-1 text-xs text-gray-300 bg-gray-700 px-2 py-1 rounded">{d.name}: {d.value}</span>
                  <button onClick={() => set('chartData', data.filter((_, j) => j !== i))} className="p-1 text-gray-500 hover:text-red-400 transition-colors">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={chartRowInput.name} onChange={e => setChartRowInput(p => ({ ...p, name: e.target.value }))}
                placeholder="Label" className="flex-1 px-2 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              <input type="number" value={chartRowInput.value} onChange={e => setChartRowInput(p => ({ ...p, value: e.target.value }))}
                placeholder="Value" className="w-20 px-2 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              <button onClick={() => { if (chartRowInput.name.trim()) { set('chartData', [...data, { name: chartRowInput.name.trim(), value: Number(chartRowInput.value) }]); setChartRowInput({ name: '', value: '' }); } }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs transition-colors">Add</button>
            </div>
          </Field>
        </div>
      );
    }

    case 'email':
      return (
        <div className="space-y-3">
          <Field label="To"><Input value={config.emailTo ?? ''} onChange={v => set('emailTo', v)} placeholder="email@example.com" /></Field>
          <Field label="Subject"><Input value={config.emailSubject ?? ''} onChange={v => set('emailSubject', v)} placeholder="Subject line" /></Field>
          <Field label="Body"><Textarea value={config.emailBody ?? ''} onChange={v => set('emailBody', v)} placeholder="Email body…" rows={5} /></Field>
        </div>
      );

    case 'ai':
      return (
        <div className="space-y-3">
          <Field label="System Prompt" hint="Defines the AI's personality and focus.">
            <Textarea value={config.aiSystemPrompt ?? ''} onChange={v => set('aiSystemPrompt', v)} placeholder="You are a helpful assistant…" rows={4} />
          </Field>
          <p className="text-xs text-gray-500">Set ANTHROPIC_API_KEY in your .env.local to enable the AI chat.</p>
        </div>
      );

    case 'app':
      return (
        <div className="space-y-3">
          <Field label="App">
            <Select value={config.appId ?? ''} onChange={v => set('appId', v)}
              options={[{ value: '', label: 'Choose an app…' }, ...APP_REGISTRY.map(a => ({ value: a.id, label: a.name }))]} />
          </Field>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="show-links" checked={config.appShowLinks !== false}
              onChange={e => set('appShowLinks', e.target.checked)}
              className="rounded border-gray-600 bg-gray-700 text-emerald-500 focus:ring-emerald-500" />
            <label htmlFor="show-links" className="text-xs text-gray-300">Show quick links</label>
          </div>
        </div>
      );

    case 'group': {
      // For now we need workspace blocks passed via a prop or from context
      // We'll use a simple text input for block IDs
      const childIds = config.groupChildIds ?? [];
      const collapsedIds = config.groupCollapsedChildIds ?? [];
      return (
        <div className="space-y-3">
          <div className="bg-gray-700/30 rounded-lg p-3">
            <p className="text-xs text-gray-400 mb-2">Add block IDs to include in this group. You can find block IDs in the block header when hovering.</p>
          </div>
          <Field label="Child Block IDs (comma separated)">
            <Input
              value={childIds.join(', ')}
              onChange={v => set('groupChildIds', v.split(',').map(s => s.trim()).filter(Boolean))}
              placeholder="block-123, block-456"
            />
          </Field>
          <Field label="Show when collapsed (comma separated IDs)" hint="Leave empty to show none when collapsed">
            <Input
              value={collapsedIds.join(', ')}
              onChange={v => set('groupCollapsedChildIds', v.split(',').map(s => s.trim()).filter(Boolean))}
              placeholder="block-123"
            />
          </Field>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="group-expanded" checked={config.groupExpanded !== false}
              onChange={e => set('groupExpanded', e.target.checked)}
              className="rounded border-gray-600 bg-gray-700 text-emerald-500 focus:ring-emerald-500" />
            <label htmlFor="group-expanded" className="text-xs text-gray-300">Start expanded</label>
          </div>
        </div>
      );
    }

    case 'agent-manager':
      return (
        <div className="bg-gray-700/30 rounded-lg p-3">
          <p className="text-xs text-gray-400">The Agent Manager block lets you create and manage agents directly on your canvas. No additional configuration needed.</p>
        </div>
      );

    case 'agent': {
      const agents = allAgentDefs;
      return (
        <div className="space-y-3">
          <Field label="Agent">
            <Select value={config.agentDefId ?? ''} onChange={v => set('agentDefId', v)}
              options={[{ value: '', label: 'Choose an agent…' }, ...agents.map(a => ({ value: a.id, label: a.name }))]} />
          </Field>
          {agents.length === 0 && (
            <div className="bg-gray-700/30 rounded-lg p-3">
              <p className="text-xs text-gray-400">No agents created yet. Create one first, then assign it to this block.</p>
            </div>
          )}
          {config.agentDefId && (() => {
            const selected = agents.find(a => a.id === config.agentDefId);
            if (!selected) return null;
            return (
              <div className="bg-gray-700/30 rounded-lg p-3 space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 ${selected.color} rounded-lg flex items-center justify-center`}>
                    <span className="text-white text-xs font-bold">{selected.initial}</span>
                  </div>
                  <p className="text-xs font-medium text-white">{selected.name}</p>
                </div>
                <p className="text-xs text-gray-400">{selected.description}</p>
                {selected.targetUrl && <p className="text-xs text-gray-500">Target: {selected.targetUrl}</p>}
                <div className="flex flex-wrap gap-1 pt-1">
                  {selected.capabilities.map(cap => (
                    <span key={cap} className="text-xs bg-gray-600 text-gray-300 px-1.5 py-0.5 rounded">{cap}</span>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      );
    }

    default:
      return null;
  }
}

// ─── Interactions Panel ───────────────────────────────────────────────────────

import VisualPlacementEditor from './VisualPlacementEditor';

function InteractionsPanel({
  config, set, currentW, currentH,
}: {
  config: BlockConfig;
  set: (k: keyof BlockConfig, v: unknown) => void;
  currentW: number;
  currentH: number;
}) {
  const exp = config.expansionRule;
  const mov = config.movementRule;

  const setExp = (patch: Partial<ExpansionRule>) =>
    set('expansionRule', { enabled: false, trigger: 'click', collapsedW: currentW, collapsedH: currentH, expandedW: currentW * 2, expandedH: currentH * 2, hard: false, ...exp, ...patch });

  const setMov = (patch: Partial<MovementRule>) =>
    set('movementRule', { enabled: false, trigger: 'click', targetGridId: 'a1', returnOnRelease: true, ...mov, ...patch });

  return (
    <div className="space-y-5">
      {/* Overlap */}
      <div className="bg-gray-700/30 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-white">Allow Overlap</p>
            <p className="text-xs text-gray-500 mt-0.5">Block can overlap other blocks on the canvas</p>
          </div>
          <button onClick={() => set('allowOverlap', !config.allowOverlap)}
            className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors ${config.allowOverlap ? 'bg-emerald-500' : 'bg-gray-600'}`}>
            <span className={`inline-block h-4 w-4 mt-0.5 rounded-full bg-white shadow transition-transform ${config.allowOverlap ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </button>
        </div>
      </div>

      {/* Expansion */}
      <div className="bg-gray-700/30 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-white">Expansion Rule</p>
            <p className="text-xs text-gray-500 mt-0.5">Block toggles between two sizes on trigger</p>
          </div>
          <button onClick={() => setExp({ enabled: !exp?.enabled })}
            className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors ${exp?.enabled ? 'bg-emerald-500' : 'bg-gray-600'}`}>
            <span className={`inline-block h-4 w-4 mt-0.5 rounded-full bg-white shadow transition-transform ${exp?.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </button>
        </div>
        {exp?.enabled && (
          <div className="space-y-4 pt-2 border-t border-gray-700">
            <Field label="Trigger">
              <Select value={exp.trigger} onChange={v => setExp({ trigger: v as 'click' | 'hover' })}
                options={[{ value: 'click', label: 'Click' }, { value: 'hover', label: 'Hover' }]} />
            </Field>
            <VisualPlacementEditor
              label="Collapsed (Start)"
              hint="Drag to set starting position and size"
              value={{ x: 0, y: 0, w: exp.collapsedW, h: exp.collapsedH }}
              onChange={r => setExp({ collapsedW: r.w, collapsedH: r.h })}
            />
            <VisualPlacementEditor
              label="Expanded (End)"
              hint="Drag to set expanded position and size"
              value={{ x: 0, y: 0, w: exp.expandedW, h: exp.expandedH }}
              onChange={r => setExp({ expandedW: r.w, expandedH: r.h })}
            />
            <div className="flex items-center gap-2">
              <input type="checkbox" id="hard-expand" checked={!!exp.hard} onChange={e => setExp({ hard: e.target.checked })}
                className="rounded border-gray-600 bg-gray-700 text-emerald-500 focus:ring-emerald-500" />
              <label htmlFor="hard-expand" className="text-xs text-gray-300">Snap exactly to size</label>
            </div>
          </div>
        )}
      </div>

      {/* Movement */}
      <div className="bg-gray-700/30 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-white">Movement Rule</p>
            <p className="text-xs text-gray-500 mt-0.5">Block moves to a grid position on trigger</p>
          </div>
          <button onClick={() => setMov({ enabled: !mov?.enabled })}
            className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors ${mov?.enabled ? 'bg-emerald-500' : 'bg-gray-600'}`}>
            <span className={`inline-block h-4 w-4 mt-0.5 rounded-full bg-white shadow transition-transform ${mov?.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </button>
        </div>
        {mov?.enabled && (
          <div className="space-y-4 pt-2 border-t border-gray-700">
            <Field label="Trigger">
              <Select value={mov.trigger} onChange={v => setMov({ trigger: v as 'click' | 'hover' })}
                options={[{ value: 'click', label: 'Click' }, { value: 'hover', label: 'Hover' }]} />
            </Field>
            <VisualPlacementEditor
              label="Target Position"
              hint="Click or drag to set where the block moves to"
              value={{
                x: (() => { const p = fromGridId(mov.targetGridId); return p?.x ?? 0; })(),
                y: (() => { const p = fromGridId(mov.targetGridId); return p?.y ?? 0; })(),
                w: currentW,
                h: currentH,
              }}
              onChange={r => setMov({ targetGridId: toGridId(r.x, r.y) })}
            />
            <div className="flex items-center gap-2">
              <input type="checkbox" id="return-on-release" checked={!!mov.returnOnRelease} onChange={e => setMov({ returnOnRelease: e.target.checked })}
                className="rounded border-gray-600 bg-gray-700 text-emerald-500 focus:ring-emerald-500" />
              <label htmlFor="return-on-release" className="text-xs text-gray-300">Return to original on release</label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Style Panel ─────────────────────────────────────────────────────────────

const STYLE_PRESETS = [
  { name: 'Default', bg: '', border: '', text: '', header: '' },
  { name: 'Emerald', bg: '#064e3b', border: '#10b981', text: '#d1fae5', header: '#065f46' },
  { name: 'Blue', bg: '#1e3a5f', border: '#3b82f6', text: '#dbeafe', header: '#1e40af' },
  { name: 'Purple', bg: '#3b0764', border: '#8b5cf6', text: '#ede9fe', header: '#4c1d95' },
  { name: 'Amber', bg: '#451a03', border: '#f59e0b', text: '#fef3c7', header: '#78350f' },
  { name: 'Rose', bg: '#4c0519', border: '#f43f5e', text: '#ffe4e6', header: '#881337' },
  { name: 'Dark', bg: '#0a0a0a', border: '#404040', text: '#d4d4d4', header: '#171717' },
  { name: 'Light', bg: '#f3f4f6', border: '#d1d5db', text: '#1f2937', header: '#e5e7eb' },
];

function StylePanel({ config, set }: { config: BlockConfig; set: (k: keyof BlockConfig, v: unknown) => void }) {
  const style = config.style ?? {};

  const setStyle = (patch: Partial<NonNullable<BlockConfig['style']>>) => {
    set('style', { ...style, ...patch });
  };

  const applyPreset = (preset: typeof STYLE_PRESETS[0]) => {
    if (!preset.bg) {
      set('style', undefined);
    } else {
      set('style', { bgColor: preset.bg, borderColor: preset.border, textColor: preset.text, headerColor: preset.header, opacity: style.opacity });
    }
  };

  return (
    <div className="space-y-4">
      {/* Presets */}
      <div>
        <p className="text-xs font-medium text-gray-300 mb-2">Presets</p>
        <div className="grid grid-cols-4 gap-1.5">
          {STYLE_PRESETS.map(preset => (
            <button
              key={preset.name}
              onClick={() => applyPreset(preset)}
              className="flex flex-col items-center gap-1 p-2 rounded-lg border border-gray-600 hover:border-gray-400 transition-colors"
            >
              <div className="w-6 h-6 rounded" style={{ backgroundColor: preset.bg || '#1f2937', border: `2px solid ${preset.border || '#374151'}` }} />
              <span className="text-xs text-gray-400">{preset.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Custom colors */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Background</label>
            <div className="flex gap-2 items-center">
              <input type="color" value={style.bgColor || '#1f2937'} onChange={e => setStyle({ bgColor: e.target.value })}
                className="w-8 h-8 rounded cursor-pointer bg-gray-700 border border-gray-600" />
              <input value={style.bgColor || ''} onChange={e => setStyle({ bgColor: e.target.value })} placeholder="#1f2937"
                className="flex-1 px-2 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-xs text-gray-100 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Border</label>
            <div className="flex gap-2 items-center">
              <input type="color" value={style.borderColor || '#374151'} onChange={e => setStyle({ borderColor: e.target.value })}
                className="w-8 h-8 rounded cursor-pointer bg-gray-700 border border-gray-600" />
              <input value={style.borderColor || ''} onChange={e => setStyle({ borderColor: e.target.value })} placeholder="#374151"
                className="flex-1 px-2 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-xs text-gray-100 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Text</label>
            <div className="flex gap-2 items-center">
              <input type="color" value={style.textColor || '#d1d5db'} onChange={e => setStyle({ textColor: e.target.value })}
                className="w-8 h-8 rounded cursor-pointer bg-gray-700 border border-gray-600" />
              <input value={style.textColor || ''} onChange={e => setStyle({ textColor: e.target.value })} placeholder="#d1d5db"
                className="flex-1 px-2 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-xs text-gray-100 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Header</label>
            <div className="flex gap-2 items-center">
              <input type="color" value={style.headerColor || '#1f2937'} onChange={e => setStyle({ headerColor: e.target.value })}
                className="w-8 h-8 rounded cursor-pointer bg-gray-700 border border-gray-600" />
              <input value={style.headerColor || ''} onChange={e => setStyle({ headerColor: e.target.value })} placeholder="#1f2937"
                className="flex-1 px-2 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-xs text-gray-100 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
            </div>
          </div>
        </div>

        {/* Opacity */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Opacity: {Math.round((style.opacity ?? 1) * 100)}%</label>
          <input type="range" min={0.1} max={1} step={0.05} value={style.opacity ?? 1}
            onChange={e => setStyle({ opacity: parseFloat(e.target.value) })}
            className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
        </div>

        {/* Reset */}
        <button onClick={() => set('style', undefined)}
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
          Reset to default
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  block?: Block;
  currentW?: number;
  currentH?: number;
  onSave: (block: Omit<Block, 'id'> & { id?: string }) => void;
  onClose: () => void;
}

type EditorStep = 'type' | 'edit';
type EditorTab = 'content' | 'style' | 'interactions';

export default function BlockEditor({ block, currentW = 3, currentH = 3, onSave, onClose }: Props) {
  const isNew = !block;
  const [step, setStep] = useState<EditorStep>(isNew ? 'type' : 'edit');
  const [type, setType] = useState<BlockType>(block?.type ?? 'stat');
  const [title, setTitle] = useState(block?.title ?? '');
  const [config, setConfig] = useState<BlockConfig>(block?.config ?? {});
  const [tab, setTab] = useState<EditorTab>('content');

  useEffect(() => {
    if (block) { setType(block.type); setTitle(block.title); setConfig(block.config); }
  }, [block]);

  const set = (key: keyof BlockConfig, value: unknown) =>
    setConfig(prev => ({ ...prev, [key]: value }));

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({ id: block?.id, type, title: title.trim(), config });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-lg mx-4 shadow-2xl flex flex-col" style={{ maxHeight: '85vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700 flex-shrink-0">
          <h2 className="text-sm font-semibold text-white">
            {step === 'type' ? 'Choose Block Type' : isNew ? `New ${BLOCK_TYPES.find(b => b.type === type)?.label}` : `Edit — ${block?.title}`}
          </h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Tabs (only shown in edit step) */}
        {step === 'edit' && (
          <div className="flex border-b border-gray-700 px-5 flex-shrink-0">
            {(['content', 'interactions'] as EditorTab[]).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-2.5 text-xs font-medium capitalize border-b-2 transition-colors ${tab === t ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`}>
                {t}
              </button>
            ))}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {step === 'type' && (
            <div className="grid grid-cols-2 gap-2.5">
              {BLOCK_TYPES.map(bt => (
                <button key={bt.type} onClick={() => { setType(bt.type); setStep('edit'); }}
                  className="flex flex-col gap-2 p-3.5 bg-gray-700/50 hover:bg-gray-700 border border-gray-600 hover:border-emerald-500/50 rounded-xl text-left transition-all group">
                  <div className="w-8 h-8 bg-gray-600 group-hover:bg-emerald-500/20 rounded-lg flex items-center justify-center transition-colors">
                    <svg className="w-4 h-4 text-gray-300 group-hover:text-emerald-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={bt.icon} />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">{bt.label}</p>
                    <p className="text-xs text-gray-500">{bt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {step === 'edit' && (
            <div className="space-y-4">
              <Field label="Title">
                <Input value={title} onChange={setTitle} placeholder="Block title" />
              </Field>
              {tab === 'content' && <ContentPanel type={type} config={config} set={set} />}
              {tab === 'style' && <StylePanel config={config} set={set} />}
              {tab === 'interactions' && <InteractionsPanel config={config} set={set} currentW={currentW} currentH={currentH} />}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-700 flex-shrink-0">
          {step === 'edit' && isNew
            ? <button onClick={() => setStep('type')} className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                Back
              </button>
            : <div />
          }
          {step === 'edit' && (
            <button onClick={handleSave} disabled={!title.trim()}
              className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors">
              {isNew ? 'Add Block' : 'Save Changes'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
