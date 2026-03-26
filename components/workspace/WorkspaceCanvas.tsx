'use client';

import { useState, useCallback } from 'react';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const GridLayout = require('react-grid-layout').default ?? require('react-grid-layout');

interface Layout {
  i: string; x: number; y: number; w: number; h: number;
  minW?: number; minH?: number; isDraggable?: boolean; isResizable?: boolean;
}

import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { Block, BlockConfig, GridItem, WorkspaceState, BLOCK_DEFAULTS, buildStarterLayout, toGridId, fromGridId } from '@/lib/workspace-types';
import { BlockAction } from '@/lib/agents/agent-types';
import { addLinkedBlock, removeLinkedBlock, getAgent } from '@/lib/agents/agent-registry';
import BlockRenderer from './BlockRenderer';
import BlockEditor from './BlockEditor';
import AiAssistant from './AiAssistant';

const COLS = 12;
const ROW_HEIGHT = 80;

function useLocalStorage<T>(key: string, initial: T) {
  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') return initial;
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : initial;
    } catch { return initial; }
  });
  const set = useCallback((val: T | ((prev: T) => T)) => {
    setState(prev => {
      const next = typeof val === 'function' ? (val as (p: T) => T)(prev) : val;
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    });
  }, [key]);
  return [state, set] as const;
}

export default function WorkspaceCanvas({ width, storageKey = 'nodnal-workspace' }: { width: number; storageKey?: string }) {
  const [workspace, setWorkspace] = useLocalStorage<WorkspaceState>(storageKey, { blocks: [], layout: [] });
  const [editMode, setEditMode] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<Block | undefined>(undefined);
  // Track expanded blocks (for expansion rules)
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());
  // Track moved blocks original positions (for movement rules)
  const [movedBlocks, setMovedBlocks] = useState<Map<string, { x: number; y: number }>>(new Map());

  const openAddBlock = () => { setEditingBlock(undefined); setEditorOpen(true); };
  const openEditBlock = (block: Block) => { setEditingBlock(block); setEditorOpen(true); };

  const handleSave = (data: Omit<Block, 'id'> & { id?: string }) => {
    if (data.id) {
      setWorkspace(prev => ({ ...prev, blocks: prev.blocks.map(b => b.id === data.id ? { ...b, ...data, id: b.id } : b) }));
    } else {
      const id = `block-${Date.now()}`;
      const defaults = BLOCK_DEFAULTS[data.type];
      const maxY = workspace.layout.reduce((m, l) => Math.max(m, l.y + l.h), 0);
      const newItem: GridItem = { i: id, x: 0, y: maxY, ...defaults };
      setWorkspace(prev => ({ blocks: [...prev.blocks, { ...data, id } as Block], layout: [...prev.layout, newItem] }));
    }
    setEditorOpen(false);
  };

  const deleteBlock = (id: string) => {
    setWorkspace(prev => ({ blocks: prev.blocks.filter(b => b.id !== id), layout: prev.layout.filter(l => l.i !== id) }));
    setExpandedBlocks(prev => { const n = new Set(prev); n.delete(id); return n; });
    setMovedBlocks(prev => { const n = new Map(prev); n.delete(id); return n; });
  };

  const onLayoutChange = (newLayout: Layout[]) => {
    setWorkspace(prev => ({
      ...prev,
      layout: newLayout.map(l => ({
        i: l.i, x: l.x, y: l.y, w: l.w, h: l.h,
        minW: prev.layout.find(p => p.i === l.i)?.minW,
        minH: prev.layout.find(p => p.i === l.i)?.minH,
      })),
    }));
  };

  // ── Interaction: Expansion ──────────────────────────────────────────────────
  const handleBlockClick = (block: Block, e: React.MouseEvent) => {
    if (editMode) return;
    const { expansionRule, movementRule } = block.config;

    if (expansionRule?.enabled && expansionRule.trigger === 'click') {
      e.stopPropagation();
      const isExpanded = expandedBlocks.has(block.id);
      setExpandedBlocks(prev => { const n = new Set(prev); isExpanded ? n.delete(block.id) : n.add(block.id); return n; });
      setWorkspace(prev => ({
        ...prev,
        layout: prev.layout.map(l => {
          if (l.i !== block.id) return l;
          return isExpanded
            ? { ...l, w: expansionRule.collapsedW, h: expansionRule.collapsedH }
            : { ...l, w: expansionRule.expandedW, h: expansionRule.expandedH };
        }),
      }));
    }

    if (movementRule?.enabled && movementRule.trigger === 'click') {
      e.stopPropagation();
      const hasMoved = movedBlocks.has(block.id);
      if (hasMoved && movementRule.returnOnRelease) {
        const orig = movedBlocks.get(block.id)!;
        setWorkspace(prev => ({ ...prev, layout: prev.layout.map(l => l.i === block.id ? { ...l, x: orig.x, y: orig.y } : l) }));
        setMovedBlocks(prev => { const n = new Map(prev); n.delete(block.id); return n; });
      } else if (!hasMoved) {
        const current = workspace.layout.find(l => l.i === block.id);
        const target = fromGridId(movementRule.targetGridId);
        if (current && target) {
          setMovedBlocks(prev => new Map(prev).set(block.id, { x: current.x, y: current.y }));
          setWorkspace(prev => ({ ...prev, layout: prev.layout.map(l => l.i === block.id ? { ...l, x: target.x, y: target.y } : l) }));
        }
      }
    }
  };

  // ── Hover interactions ──────────────────────────────────────────────────────
  const handleBlockMouseEnter = (block: Block) => {
    if (editMode) return;
    const { expansionRule, movementRule } = block.config;
    if (expansionRule?.enabled && expansionRule.trigger === 'hover' && !expandedBlocks.has(block.id)) {
      setExpandedBlocks(prev => new Set(prev).add(block.id));
      setWorkspace(prev => ({ ...prev, layout: prev.layout.map(l => l.i === block.id ? { ...l, w: expansionRule.expandedW, h: expansionRule.expandedH } : l) }));
    }
    if (movementRule?.enabled && movementRule.trigger === 'hover' && !movedBlocks.has(block.id)) {
      const current = workspace.layout.find(l => l.i === block.id);
      const target = fromGridId(movementRule.targetGridId);
      if (current && target) {
        setMovedBlocks(prev => new Map(prev).set(block.id, { x: current.x, y: current.y }));
        setWorkspace(prev => ({ ...prev, layout: prev.layout.map(l => l.i === block.id ? { ...l, x: target.x, y: target.y } : l) }));
      }
    }
  };

  const handleBlockMouseLeave = (block: Block) => {
    if (editMode) return;
    const { expansionRule, movementRule } = block.config;
    if (expansionRule?.enabled && expansionRule.trigger === 'hover' && expandedBlocks.has(block.id)) {
      setExpandedBlocks(prev => { const n = new Set(prev); n.delete(block.id); return n; });
      setWorkspace(prev => ({ ...prev, layout: prev.layout.map(l => l.i === block.id ? { ...l, w: expansionRule.collapsedW, h: expansionRule.collapsedH } : l) }));
    }
    if (movementRule?.enabled && movementRule.trigger === 'hover' && movementRule.returnOnRelease && movedBlocks.has(block.id)) {
      const orig = movedBlocks.get(block.id)!;
      setMovedBlocks(prev => { const n = new Map(prev); n.delete(block.id); return n; });
      setWorkspace(prev => ({ ...prev, layout: prev.layout.map(l => l.i === block.id ? { ...l, x: orig.x, y: orig.y } : l) }));
    }
  };

  const handleCanvasDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const target = e.target as HTMLElement;
    if (!target.closest('.react-grid-item')) openAddBlock();
  };

  // ── Agent Block Actions ────────────────────────────────────────────────────
  const handleBlockAction = useCallback((agentId: string, actions: BlockAction[]) => {
    const agentDef = getAgent(agentId);

    setWorkspace(prev => {
      let blocks = [...prev.blocks];
      let layout = [...prev.layout];

      // Find the agent block position for relative spawning
      const agentBlock = blocks.find(b => b.config.agentDefId === agentId);
      const agentLayout = agentBlock ? layout.find(l => l.i === agentBlock.id) : null;

      for (const action of actions) {
        switch (action.action) {
          case 'spawn': {
            const id = `block-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
            const blockType = (action.blockType ?? 'text') as Block['type'];
            const defaults = BLOCK_DEFAULTS[blockType] ?? { w: 3, h: 3, minW: 1, minH: 1 };

            // Position near the agent block, or use provided position
            const pos = action.position ?? {
              x: agentLayout ? Math.min(agentLayout.x + agentLayout.w, 12 - defaults.w) : 0,
              y: agentLayout ? agentLayout.y : (layout.reduce((m, l) => Math.max(m, l.y + l.h), 0)),
              w: defaults.w,
              h: defaults.h,
            };

            const newBlock: Block = {
              id,
              type: blockType,
              title: action.title ?? 'Agent Output',
              config: {
                ...(action.config as BlockConfig ?? {}),
                agentId, // Mark as owned by this agent
              },
            };

            blocks.push(newBlock);
            layout.push({
              i: id,
              x: pos.x, y: pos.y,
              w: pos.w ?? defaults.w, h: pos.h ?? defaults.h,
              minW: defaults.minW, minH: defaults.minH,
            });

            // Track linked block in agent session
            addLinkedBlock(agentId, id);
            break;
          }
          case 'update': {
            if (!action.blockId) break;
            // Only allow updating blocks owned by this agent
            const target = blocks.find(b => b.id === action.blockId && b.config.agentId === agentId);
            if (!target) break;
            blocks = blocks.map(b => {
              if (b.id !== action.blockId) return b;
              return {
                ...b,
                title: action.title ?? b.title,
                config: { ...b.config, ...(action.config as BlockConfig ?? {}) },
              };
            });
            break;
          }
          case 'remove': {
            if (!action.blockId) break;
            // Only allow removing blocks owned by this agent
            const toRemove = blocks.find(b => b.id === action.blockId && b.config.agentId === agentId);
            if (!toRemove) break;
            blocks = blocks.filter(b => b.id !== action.blockId);
            layout = layout.filter(l => l.i !== action.blockId);
            removeLinkedBlock(agentId, action.blockId);
            break;
          }
        }
      }

      return { blocks, layout };
    });
  }, [setWorkspace]);

  const loadStarter = () => {
    if (workspace.blocks.length > 0 && !confirm('Replace current layout with the starter dashboard?')) return;
    setWorkspace(buildStarterLayout());
  };

  const gridLayout: Layout[] = workspace.layout.map(l => ({
    i: l.i, x: l.x, y: l.y, w: l.w, h: l.h,
    minW: l.minW ?? 1, minH: l.minH ?? 1,
    isDraggable: editMode,
    isResizable: editMode,
  }));

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setEditMode(e => !e)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
            editMode
              ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
              : 'bg-gray-800 text-gray-400 border-gray-700 hover:text-gray-200 hover:border-gray-500'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={editMode ? 'M5 13l4 4L19 7' : 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z'} />
          </svg>
          {editMode ? 'Done' : 'Edit'}
        </button>

        <AiAssistant workspace={workspace} onApply={setWorkspace} />

        {!editMode && workspace.blocks.length === 0 && (
          <button onClick={loadStarter}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 text-gray-400 border border-gray-700 hover:text-gray-200 hover:border-gray-500 text-xs font-medium rounded-lg transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
            </svg>
            Starter Layout
          </button>
        )}

        {editMode && <span className="text-xs text-gray-600">drag to move · corner to resize · grid IDs shown on blocks</span>}
        {!editMode && workspace.blocks.length > 0 && <span className="text-xs text-gray-600">double-click canvas to add</span>}

        <div className="ml-auto flex items-center gap-2">
          <button onClick={openAddBlock}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 text-xs font-medium rounded-lg transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Block
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div
        className="relative rounded-xl overflow-hidden min-h-[calc(100vh-180px)] select-none"
        style={{ backgroundImage: 'radial-gradient(circle, #374151 1px, transparent 1px)', backgroundSize: '24px 24px', backgroundColor: '#111827' }}
        onDoubleClick={handleCanvasDoubleClick}
      >
        {workspace.blocks.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className="flex flex-col items-center gap-2 opacity-25">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
              </svg>
              <p className="text-sm text-gray-400 font-medium">Double-click to add a block</p>
            </div>
          </div>
        )}

        <GridLayout
          layout={gridLayout}
          cols={COLS}
          rowHeight={ROW_HEIGHT}
          width={width}
          onLayoutChange={onLayoutChange}
          isDraggable={editMode}
          isResizable={editMode}
          draggableHandle=".drag-handle"
          margin={[12, 12]}
          containerPadding={[12, 12]}
        >
          {workspace.blocks.map(block => {
            const layoutItem = workspace.layout.find(l => l.i === block.id);
            if (!layoutItem) return null;
            const gridId = toGridId(layoutItem.x, layoutItem.y);
            const hasExpansion = block.config.expansionRule?.enabled;
            const hasMovement = block.config.movementRule?.enabled;
            const isExpanded = expandedBlocks.has(block.id);
            const ownerAgent = block.config.agentId ? getAgent(block.config.agentId) : null;

            return (
              <div
                key={block.id}
                className={`bg-gray-800/90 backdrop-blur-sm border rounded-xl overflow-hidden flex flex-col transition-colors ${
                  editMode ? 'border-amber-500/40 ring-1 ring-amber-500/20' : 'border-gray-700/80 hover:border-gray-600'
                } ${hasExpansion || hasMovement ? 'cursor-pointer' : ''}`}
                style={ownerAgent && !editMode ? { borderLeftWidth: '3px', borderLeftColor: ownerAgent.color.replace('bg-', '').includes('emerald') ? '#10b981' : ownerAgent.color.replace('bg-', '').includes('violet') ? '#8b5cf6' : ownerAgent.color.replace('bg-', '').includes('blue') ? '#3b82f6' : ownerAgent.color.replace('bg-', '').includes('amber') ? '#f59e0b' : ownerAgent.color.replace('bg-', '').includes('rose') ? '#f43f5e' : ownerAgent.color.replace('bg-', '').includes('cyan') ? '#06b6d4' : ownerAgent.color.replace('bg-', '').includes('pink') ? '#ec4899' : ownerAgent.color.replace('bg-', '').includes('indigo') ? '#6366f1' : '#10b981' } : undefined}
                onClick={e => handleBlockClick(block, e)}
                onMouseEnter={() => handleBlockMouseEnter(block)}
                onMouseLeave={() => handleBlockMouseLeave(block)}
              >
                {/* Block header */}
                <div className={`flex items-center justify-between px-3 py-1.5 border-b border-gray-700/60 flex-shrink-0 ${editMode ? 'drag-handle cursor-grab active:cursor-grabbing' : ''}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    {editMode && (
                      <svg className="w-3 h-3 text-gray-600 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 6a2 2 0 100-4 2 2 0 000 4zM8 14a2 2 0 100-4 2 2 0 000 4zM8 22a2 2 0 100-4 2 2 0 000 4zM16 6a2 2 0 100-4 2 2 0 000 4zM16 14a2 2 0 100-4 2 2 0 000 4zM16 22a2 2 0 100-4 2 2 0 000 4z" />
                      </svg>
                    )}
                    <p className="text-xs font-medium text-gray-500 truncate">{block.title}</p>
                    {/* Agent ownership badge */}
                    {ownerAgent && !editMode && (
                      <span className={`w-4 h-4 ${ownerAgent.color} rounded flex items-center justify-center flex-shrink-0`} title={`Owned by ${ownerAgent.name}`}>
                        <span className="text-white text-xs font-bold" style={{ fontSize: '8px' }}>{ownerAgent.initial}</span>
                      </span>
                    )}
                    {/* Grid ID badge — always in system, shown in edit mode */}
                    {editMode && (
                      <span className="text-xs text-gray-600 font-mono flex-shrink-0">{gridId}</span>
                    )}
                    {/* Interaction indicators */}
                    {!editMode && hasExpansion && (
                      <span className={`text-xs px-1 py-0.5 rounded font-mono flex-shrink-0 ${isExpanded ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-700 text-gray-500'}`}>
                        {isExpanded ? '↙' : '↗'}
                      </span>
                    )}
                    {!editMode && hasMovement && (
                      <span className="text-xs bg-gray-700 text-gray-500 px-1 py-0.5 rounded font-mono flex-shrink-0">↕</span>
                    )}
                  </div>
                  {editMode && (
                    <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                      <button onClick={e => { e.stopPropagation(); openEditBlock(block); }} className="p-1 text-gray-600 hover:text-gray-200 rounded transition-colors">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      </button>
                      <button onClick={e => { e.stopPropagation(); deleteBlock(block.id); }} className="p-1 text-gray-600 hover:text-red-400 rounded transition-colors">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 p-3 overflow-hidden min-h-0">
                  <BlockRenderer block={block} onBlockAction={handleBlockAction} workspaceBlocks={workspace.blocks} />
                </div>
              </div>
            );
          })}
        </GridLayout>
      </div>

      {editorOpen && (
        <BlockEditor
          block={editingBlock}
          currentW={editingBlock ? workspace.layout.find(l => l.i === editingBlock.id)?.w ?? 3 : 3}
          currentH={editingBlock ? workspace.layout.find(l => l.i === editingBlock.id)?.h ?? 3 : 3}
          onSave={handleSave}
          onClose={() => setEditorOpen(false)}
        />
      )}
    </div>
  );
}
