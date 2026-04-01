'use client';

import { useState, useCallback, useRef } from 'react';
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
import { useAgents, getSession, updateSession } from '@/lib/agents/use-agents';
import BlockRenderer from './BlockRenderer';
import BlockEditor from './BlockEditor';
import AiAssistant from './AiAssistant';

const COLS = 12;
const ROW_HEIGHT = 80;

// ─── Color mapping for agent ownership borders ──────────────────────────────
const AGENT_COLOR_MAP: Record<string, string> = {
  'bg-emerald-500': '#10b981',
  'bg-violet-500': '#8b5cf6',
  'bg-blue-500': '#3b82f6',
  'bg-amber-500': '#f59e0b',
  'bg-rose-500': '#f43f5e',
  'bg-cyan-500': '#06b6d4',
  'bg-pink-500': '#ec4899',
  'bg-indigo-500': '#6366f1',
};

function getAgentBorderColor(colorClass: string): string {
  return AGENT_COLOR_MAP[colorClass] ?? '#10b981';
}

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

interface CanvasProps {
  width: number;
  storageKey?: string;
  initialState?: WorkspaceState;
  onStateChange?: (state: WorkspaceState) => void;
}

export default function WorkspaceCanvas({ width, storageKey = 'nodnal-workspace', initialState, onStateChange }: CanvasProps) {
  const { agents: allAgents } = useAgents();
  const agentMap = Object.fromEntries(allAgents.map(a => [a.id, a]));
  const [workspace, setWorkspaceRaw] = useLocalStorage<WorkspaceState>(storageKey, initialState ?? { blocks: [], layout: [] });

  // Wrap setWorkspace to also notify parent of state changes
  const setWorkspace = useCallback((val: WorkspaceState | ((prev: WorkspaceState) => WorkspaceState)) => {
    setWorkspaceRaw(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      if (onStateChange) onStateChange(next);
      return next;
    });
  }, [setWorkspaceRaw, onStateChange]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<Block | undefined>(undefined);
  // Track expanded blocks (for expansion rules)
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());
  // Track moved blocks original positions (for movement rules)
  const [movedBlocks, setMovedBlocks] = useState<Map<string, { x: number; y: number }>>(new Map());
  // Touch long-press state
  const [touchDragBlockId, setTouchDragBlockId] = useState<string | null>(null);
  const touchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // z-order: last item in array = on top
  const zOrder = workspace.zOrder ?? [];
  // Check if any block has overlap enabled
  const hasAnyOverlap = workspace.blocks.some(b => b.config.allowOverlap);
  // Global unlock toggle — temporarily unlocks all locked blocks
  const [globalUnlock, setGlobalUnlock] = useState(false);

  const bringToFront = useCallback((blockId: string) => {
    setWorkspace(prev => ({
      ...prev,
      zOrder: [...(prev.zOrder ?? []).filter(id => id !== blockId), blockId],
    }));
  }, [setWorkspace]);

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
    const block = workspace.blocks.find(b => b.id === id);
    if (!confirm(`Delete "${block?.title || 'this block'}"? This cannot be undone.`)) return;
    setWorkspace(prev => ({
      ...prev,
      blocks: prev.blocks.filter(b => b.id !== id),
      layout: prev.layout.filter(l => l.i !== id),
      zOrder: (prev.zOrder ?? []).filter(z => z !== id),
    }));
    setExpandedBlocks(prev => { const n = new Set(prev); n.delete(id); return n; });
    setMovedBlocks(prev => { const n = new Map(prev); n.delete(id); return n; });
  };

  const toggleBlockLock = (id: string) => {
    setWorkspace(prev => ({
      ...prev,
      blocks: prev.blocks.map(b => b.id === id ? { ...b, config: { ...b.config, positionLocked: !b.config.positionLocked } } : b),
    }));
  };

  const handleBlockUpdate = useCallback((blockId: string, updates: Partial<BlockConfig>) => {
    setWorkspace(prev => ({
      ...prev,
      blocks: prev.blocks.map(b => b.id === blockId ? { ...b, config: { ...b.config, ...updates } } : b),
    }));
  }, [setWorkspace]);

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
    bringToFront(block.id);
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

  // ── Touch long-press ──────────────────────────────────────────────────────
  const handleTouchStart = (blockId: string) => {
    touchTimerRef.current = setTimeout(() => {
      setTouchDragBlockId(blockId);
      bringToFront(blockId);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  };

  const handleTouchClearAll = () => {
    setTouchDragBlockId(null);
    handleTouchEnd();
  };

  const handleCanvasDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const target = e.target as HTMLElement;
    if (!target.closest('.react-grid-item')) openAddBlock();
  };

  // ── Agent Block Actions ────────────────────────────────────────────────────
  const handleBlockAction = useCallback(async (agentId: string, actions: BlockAction[]) => {
    const spawnedBlockIds: string[] = [];
    const removedBlockIds: string[] = [];

    setWorkspace(prev => {
      let blocks = [...prev.blocks];
      let layout = [...prev.layout];
      const agentBlock = blocks.find(b => b.config.agentDefId === agentId);
      const agentLayout = agentBlock ? layout.find(l => l.i === agentBlock.id) : null;

      for (const action of actions) {
        switch (action.action) {
          case 'spawn': {
            const id = `block-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
            const blockType = (action.blockType ?? 'text') as Block['type'];
            const defaults = BLOCK_DEFAULTS[blockType] ?? { w: 3, h: 3, minW: 1, minH: 1 };
            const pos = action.position ?? {
              x: agentLayout ? Math.min(agentLayout.x + agentLayout.w, 12 - defaults.w) : 0,
              y: agentLayout ? agentLayout.y : (layout.reduce((m, l) => Math.max(m, l.y + l.h), 0)),
              w: defaults.w,
              h: defaults.h,
            };
            blocks.push({
              id, type: blockType,
              title: action.title ?? 'Agent Output',
              config: { ...(action.config as BlockConfig ?? {}), agentId },
            });
            layout.push({ i: id, x: pos.x, y: pos.y, w: pos.w ?? defaults.w, h: pos.h ?? defaults.h, minW: defaults.minW, minH: defaults.minH });
            spawnedBlockIds.push(id);
            break;
          }
          case 'update': {
            if (!action.blockId) break;
            const target = blocks.find(b => b.id === action.blockId && b.config.agentId === agentId);
            if (!target) break;
            blocks = blocks.map(b => b.id !== action.blockId ? b : { ...b, title: action.title ?? b.title, config: { ...b.config, ...(action.config as BlockConfig ?? {}) } });
            break;
          }
          case 'remove': {
            if (!action.blockId) break;
            const toRemove = blocks.find(b => b.id === action.blockId && b.config.agentId === agentId);
            if (!toRemove) break;
            blocks = blocks.filter(b => b.id !== action.blockId);
            layout = layout.filter(l => l.i !== action.blockId);
            removedBlockIds.push(action.blockId);
            break;
          }
        }
      }
      return { ...prev, blocks, layout };
    });

    // Update linked blocks in Firestore
    for (const blockId of spawnedBlockIds) {
      const s = await getSession(agentId);
      await updateSession(agentId, { linkedBlockIds: [...(s?.linkedBlockIds ?? []), blockId] });
    }
    for (const blockId of removedBlockIds) {
      const s = await getSession(agentId);
      await updateSession(agentId, { linkedBlockIds: (s?.linkedBlockIds ?? []).filter((id: string) => id !== blockId) });
    }
  }, [setWorkspace]);

  const loadStarter = () => {
    if (workspace.blocks.length > 0 && !confirm('Replace current layout with the starter dashboard?')) return;
    setWorkspace(buildStarterLayout());
  };

  const gridLayout: Layout[] = workspace.layout.map(l => {
    const block = workspace.blocks.find(b => b.id === l.i);
    const isLocked = block?.config.positionLocked && !globalUnlock;
    return {
      i: l.i, x: l.x, y: l.y, w: l.w, h: l.h,
      minW: 1, minH: 1,
      isDraggable: !isLocked,
      isResizable: !isLocked,
    };
  });

  return (
    <div className="flex flex-col gap-3" onTouchEnd={handleTouchClearAll}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <AiAssistant workspace={workspace} onApply={setWorkspace} />

        {/* Unlock all toggle */}
        <button
          onClick={() => setGlobalUnlock(u => !u)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
            globalUnlock
              ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
              : 'bg-gray-800 text-gray-400 border-gray-700 hover:text-gray-200 hover:border-gray-500'
          }`}
          title={globalUnlock ? 'Re-lock all blocks' : 'Unlock all blocks for moving'}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {globalUnlock ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            )}
          </svg>
          {globalUnlock ? 'Unlocked' : 'Locked'}
        </button>

        {workspace.blocks.length === 0 && (
          <button onClick={loadStarter}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 text-gray-400 border border-gray-700 hover:text-gray-200 hover:border-gray-500 text-xs font-medium rounded-lg transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
            </svg>
            Starter Layout
          </button>
        )}

        <span className="text-xs text-gray-600">drag header to move · corners & edges to resize · double-click canvas to add</span>

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
          isDraggable={true}
          isResizable={true}
          resizeHandles={['se', 'sw', 'ne', 'nw', 'e', 'w', 'n', 's']}
          preventCollision={!hasAnyOverlap}
          margin={[12, 12]}
          containerPadding={[12, 12]}
        >
          {workspace.blocks.map(block => {
            const layoutItem = workspace.layout.find(l => l.i === block.id);
            if (!layoutItem) return null;
            const hasExpansion = block.config.expansionRule?.enabled;
            const hasMovement = block.config.movementRule?.enabled;
            const isExpanded = expandedBlocks.has(block.id);
            const ownerAgent = block.config.agentId ? agentMap[block.config.agentId] ?? null : null;
            const blockZIndex = zOrder.indexOf(block.id) + 1;
            const isTouchDragging = touchDragBlockId === block.id;
            const blockStyle = block.config.style;

            return (
              <div
                key={block.id}
                className={`backdrop-blur-sm border rounded-xl overflow-hidden flex flex-col transition-colors ${
                  !blockStyle?.borderColor ? 'border-gray-700/80 hover:border-gray-600' : ''
                } ${!blockStyle?.bgColor ? 'bg-gray-800/90' : ''} ${hasExpansion || hasMovement ? 'cursor-pointer' : ''} ${isTouchDragging ? 'block-wiggle ring-2 ring-emerald-500/50' : ''}`}
                style={{
                  zIndex: blockZIndex || 'auto',
                  ...(blockStyle?.bgColor ? { backgroundColor: blockStyle.bgColor } : {}),
                  ...(blockStyle?.borderColor ? { borderColor: blockStyle.borderColor } : {}),
                  ...(blockStyle?.textColor ? { color: blockStyle.textColor } : {}),
                  ...(blockStyle?.opacity != null ? { opacity: blockStyle.opacity } : {}),
                  ...(ownerAgent ? { borderLeftWidth: '3px', borderLeftColor: getAgentBorderColor(ownerAgent.color) } : {}),
                }}
                onClick={e => handleBlockClick(block, e)}
                onMouseEnter={() => handleBlockMouseEnter(block)}
                onMouseLeave={() => handleBlockMouseLeave(block)}
                onTouchStart={() => handleTouchStart(block.id)}
                onTouchEnd={handleTouchEnd}
              >
                {/* Block header */}
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-700/60 flex-shrink-0"
                  style={blockStyle?.headerColor ? { backgroundColor: blockStyle.headerColor } : undefined}>
                  <div className="flex items-center gap-2 min-w-0">
                    <svg className="w-3 h-3 text-gray-600 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 6a2 2 0 100-4 2 2 0 000 4zM8 14a2 2 0 100-4 2 2 0 000 4zM8 22a2 2 0 100-4 2 2 0 000 4zM16 6a2 2 0 100-4 2 2 0 000 4zM16 14a2 2 0 100-4 2 2 0 000 4zM16 22a2 2 0 100-4 2 2 0 000 4z" />
                    </svg>
                    <p className="text-xs font-medium text-gray-500 truncate">{block.title}</p>
                    {/* Agent ownership badge */}
                    {ownerAgent && (
                      <span className={`w-4 h-4 ${ownerAgent.color} rounded flex items-center justify-center flex-shrink-0`} title={`Owned by ${ownerAgent.name}`}>
                        <span className="text-white text-xs font-bold" style={{ fontSize: '8px' }}>{ownerAgent.initial}</span>
                      </span>
                    )}
                    {/* Interaction indicators */}
                    {hasExpansion && (
                      <span className={`text-xs px-1 py-0.5 rounded font-mono flex-shrink-0 ${isExpanded ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-700 text-gray-500'}`}>
                        {isExpanded ? '↙' : '↗'}
                      </span>
                    )}
                    {hasMovement && (
                      <span className="text-xs bg-gray-700 text-gray-500 px-1 py-0.5 rounded font-mono flex-shrink-0">↕</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                    <button onClick={e => { e.stopPropagation(); toggleBlockLock(block.id); }} className={`p-1 rounded transition-colors ${block.config.positionLocked ? 'text-amber-400' : 'text-gray-600 hover:text-gray-200'}`} title={block.config.positionLocked ? 'Unlock position' : 'Lock position'}>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {block.config.positionLocked ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                        )}
                      </svg>
                    </button>
                    <button onClick={e => { e.stopPropagation(); openEditBlock(block); }} className="p-1 text-gray-600 hover:text-gray-200 rounded transition-colors" title="Edit">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                    <button onClick={e => { e.stopPropagation(); deleteBlock(block.id); }} className="p-1 text-gray-600 hover:text-red-400 rounded transition-colors" title="Delete">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>

                {/* Content — stop drag propagation so block content is interactive */}
                <div
                  className="flex-1 p-3 overflow-hidden min-h-0"
                  onMouseDown={e => e.stopPropagation()}
                  onTouchStart={e => e.stopPropagation()}
                >
                  <BlockRenderer block={block} onBlockAction={handleBlockAction} onBlockUpdate={handleBlockUpdate} workspaceBlocks={workspace.blocks} />
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
