// ─── Grid ID System ──────────────────────────────────────────────────────────
// Each grid cell has an ID: column letter (a-l) + row number (1+)
// e.g. x=0,y=0 → "a1"   x=3,y=5 → "d6"   x=11,y=2 → "l3"

export function toGridId(x: number, y: number): string {
  const col = String.fromCharCode(97 + Math.max(0, Math.min(11, x)));
  return `${col}${y + 1}`;
}

export function fromGridId(id: string): { x: number; y: number } | null {
  const match = id.toLowerCase().match(/^([a-l])(\d+)$/);
  if (!match) return null;
  return {
    x: match[1].charCodeAt(0) - 97,
    y: parseInt(match[2]) - 1,
  };
}

// ─── Block Types ─────────────────────────────────────────────────────────────

export type BlockType =
  | 'stat'
  | 'text'
  | 'link'
  | 'embed'
  | 'list'
  | 'table'
  | 'chart'
  | 'email'
  | 'ai'
  | 'app'
  | 'agent'
  | 'agent-manager'
  | 'group';

// ─── Interaction Rules ────────────────────────────────────────────────────────

export interface ExpansionRule {
  enabled: boolean;
  trigger: 'click' | 'hover';
  collapsedW: number;
  collapsedH: number;
  expandedW: number;
  expandedH: number;
  hard: boolean; // if true: snap exactly to sizes; if false: treat as min sizes
}

export interface MovementRule {
  enabled: boolean;
  trigger: 'click' | 'hover';
  targetGridId: string;   // e.g. "d5" — where the block moves to
  returnOnRelease: boolean;
}

// ─── Block Config ─────────────────────────────────────────────────────────────

export interface BlockConfig {
  // --- stat ---
  statValue?: string;
  statLabel?: string;
  statUnit?: string;

  // --- text ---
  textContent?: string;
  textLocked?: boolean;

  // --- link ---
  linkUrl?: string;
  linkLabel?: string;
  linkDescription?: string;

  // --- embed ---
  embedUrl?: string;

  // --- list ---
  listItems?: string[];

  // --- table ---
  tableHeaders?: string[];
  tableRows?: string[][];

  // --- chart ---
  chartType?: 'bar' | 'line' | 'pie';
  chartData?: { name: string; value: number }[];
  chartColor?: string;
  chartLabel?: string;

  // --- email ---
  emailTo?: string;
  emailSubject?: string;
  emailBody?: string;

  // --- ai block (embedded chat) ---
  aiSystemPrompt?: string;
  aiMessages?: { role: 'user' | 'assistant'; content: string }[];

  // --- app block ---
  appId?: string;
  appShowLinks?: boolean;

  // --- live data (any block, overrides manual value) ---
  dataUrl?: string;
  dataPath?: string;
  dataLabel?: string;

  // --- group block ---
  groupChildIds?: string[];           // block IDs contained in this group
  groupCollapsedChildIds?: string[];  // which children show when collapsed
  groupExpanded?: boolean;            // expanded or collapsed

  // --- agent block ---
  agentDefId?: string;       // which AgentDef this block runs

  // --- agent ownership (any block) ---
  agentId?: string;          // which agent owns/created this block (exclusive)
  linkedTo?: string[];       // block IDs this block feeds context to
  dataSource?: {
    agentId: string;
    query: string;
    refreshInterval?: number;
  };

  // --- interaction rules ---
  expansionRule?: ExpansionRule;
  movementRule?: MovementRule;
  allowOverlap?: boolean;
  positionLocked?: boolean;
}

// ─── Block ────────────────────────────────────────────────────────────────────

export interface Block {
  id: string;
  type: BlockType;
  title: string;
  config: BlockConfig;
}

// ─── Grid / Layout ────────────────────────────────────────────────────────────

export interface GridItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
}

export interface WorkspaceState {
  blocks: Block[];
  layout: GridItem[];
  zOrder?: string[];
  allowOverlap?: boolean;
}

// ─── Default sizes ────────────────────────────────────────────────────────────

export const BLOCK_DEFAULTS: Record<BlockType, { w: number; h: number; minW: number; minH: number }> = {
  stat:  { w: 2, h: 2, minW: 1, minH: 2 },
  text:  { w: 3, h: 3, minW: 2, minH: 2 },
  link:  { w: 2, h: 2, minW: 2, minH: 2 },
  embed: { w: 4, h: 4, minW: 3, minH: 3 },
  list:  { w: 2, h: 3, minW: 2, minH: 2 },
  table: { w: 5, h: 4, minW: 3, minH: 2 },
  chart: { w: 4, h: 4, minW: 3, minH: 3 },
  email: { w: 4, h: 5, minW: 3, minH: 4 },
  ai:    { w: 3, h: 5, minW: 2, minH: 3 },
  app:   { w: 3, h: 3, minW: 2, minH: 2 },
  agent: { w: 4, h: 5, minW: 3, minH: 4 },
  'agent-manager': { w: 5, h: 6, minW: 4, minH: 5 },
  group: { w: 6, h: 5, minW: 2, minH: 2 },
};

// ─── Starter Dashboard ────────────────────────────────────────────────────────

export function buildStarterLayout(): WorkspaceState {
  const blocks: Block[] = [
    {
      id: 'starter-welcome',
      type: 'text',
      title: 'Welcome',
      config: { textContent: 'Welcome to your Nodnal dashboard. Double-click anywhere to add blocks, or use the toolbar above.' },
    },
    {
      id: 'starter-stat1',
      type: 'stat',
      title: 'Active Apps',
      config: { statValue: '2', statLabel: 'connected apps' },
    },
    {
      id: 'starter-stat2',
      type: 'stat',
      title: 'Status',
      config: { statValue: 'Live', statLabel: 'system status' },
    },
    {
      id: 'starter-link1',
      type: 'link',
      title: 'Emerald Detailing',
      config: { linkUrl: 'http://localhost:3001/admin', linkLabel: 'Emerald Admin', linkDescription: 'Open the admin console' },
    },
    {
      id: 'starter-link2',
      type: 'link',
      title: 'Parley',
      config: { linkUrl: 'http://localhost:3002', linkLabel: 'Parley', linkDescription: 'Open Parley' },
    },
    {
      id: 'starter-list',
      type: 'list',
      title: 'Quick Notes',
      config: { listItems: ['Add your own blocks by double-clicking', 'Drag blocks to rearrange', 'Click Edit to resize'] },
    },
  ];

  const layout: GridItem[] = [
    { i: 'starter-welcome', x: 0, y: 0, w: 8, h: 2, minW: 3, minH: 2 },
    { i: 'starter-stat1',   x: 8, y: 0, w: 2, h: 2, minW: 1, minH: 2 },
    { i: 'starter-stat2',   x: 10, y: 0, w: 2, h: 2, minW: 1, minH: 2 },
    { i: 'starter-link1',   x: 0, y: 2, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'starter-link2',   x: 3, y: 2, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'starter-list',    x: 6, y: 2, w: 4, h: 3, minW: 2, minH: 2 },
  ];

  return { blocks, layout };
}
