// ─── Agent Types ─────────────────────────────────────────────────────────────

export type AgentCapability = 'browser' | 'api' | 'read' | 'write';

export type AgentStatus = 'idle' | 'running' | 'error';

// ─── Agent Definition ────────────────────────────────────────────────────────
// Stored config — describes what the agent is and how it connects.

export interface AgentDef {
  id: string;
  name: string;
  description: string;
  color: string;           // accent color for linked blocks (tailwind class)
  initial: string;         // single letter shown in avatar
  targetUrl?: string;      // e.g. "https://app.ouzoerp.com"
  capabilities: AgentCapability[];
  systemPrompt: string;    // instructions for Claude when acting as this agent
  createdAt: string;       // ISO date
}

// ─── Agent Credentials ───────────────────────────────────────────────────────
// Kept separate from the definition — never sent to the client in full.

export interface AgentCredentials {
  agentId: string;
  username?: string;
  password?: string;
  apiKey?: string;
  cookies?: string;
}

// ─── Agent Session ───────────────────────────────────────────────────────────
// Runtime state for an active agent. Each agent gets its own isolated session.

export interface AgentSession {
  agentId: string;
  status: AgentStatus;
  messages: AgentMessage[];
  linkedBlockIds: string[];  // block IDs this agent owns/created
  lastActiveAt: string;      // ISO date
}

// ─── Agent Messages ──────────────────────────────────────────────────────────

export interface AgentMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;         // ISO date
  blockActions?: BlockAction[];  // actions the agent wants to take on blocks
}

// ─── Block Actions ───────────────────────────────────────────────────────────
// Commands an agent can issue to create/update its linked blocks.

export type BlockActionType = 'spawn' | 'update' | 'remove';

export interface BlockAction {
  action: BlockActionType;
  blockId?: string;          // required for update/remove
  blockType?: string;        // required for spawn (stat, table, chart, etc.)
  title?: string;
  config?: Record<string, unknown>;
  position?: { x: number; y: number; w: number; h: number };
}

// ─── Block Ownership ────────────────────────────────────────────────────────
// These fields are added to BlockConfig to link blocks to agents.

export interface AgentBlockFields {
  agentId?: string;          // which agent owns this block (exclusive)
  linkedTo?: string[];       // block IDs this block feeds context to
  dataSource?: {
    agentId: string;
    query: string;           // what to ask the agent for
    refreshInterval?: number; // ms — 0 or undefined = manual only
  };
}
