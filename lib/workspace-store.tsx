'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { WorkspaceState } from './workspace-types';

// ─── Data Model ──────────────────────────────────────────────────────────────

export interface Workspace {
  id: string;
  name: string;
  createdAt: number;
  state: WorkspaceState;
}

export interface AppState {
  workspaces: Workspace[];
  activeWorkspaceId: string;
}

const STORAGE_KEY = 'nodnal-app-state';

function generateId(): string {
  return `ws-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function defaultAppState(): AppState {
  const defaultId = generateId();
  return {
    workspaces: [
      {
        id: defaultId,
        name: 'Main Workspace',
        createdAt: Date.now(),
        state: { blocks: [], layout: [] },
      },
    ],
    activeWorkspaceId: defaultId,
  };
}

// ─── Migration ───────────────────────────────────────────────────────────────
// Convert old localStorage keys to new format on first load.

function migrateOldData(): AppState | null {
  if (typeof window === 'undefined') return null;

  const existing = localStorage.getItem(STORAGE_KEY);
  if (existing) return null; // already migrated

  const dashboardRaw = localStorage.getItem('workspace-dashboard');
  const mainRaw = localStorage.getItem('workspace-main');

  if (!dashboardRaw && !mainRaw) return null;

  const workspaces: Workspace[] = [];

  if (dashboardRaw) {
    try {
      const state = JSON.parse(dashboardRaw) as WorkspaceState;
      if (state.blocks?.length > 0) {
        workspaces.push({
          id: generateId(),
          name: 'Dashboard',
          createdAt: Date.now() - 1000,
          state,
        });
      }
    } catch { /* skip */ }
  }

  if (mainRaw) {
    try {
      const state = JSON.parse(mainRaw) as WorkspaceState;
      if (state.blocks?.length > 0) {
        workspaces.push({
          id: generateId(),
          name: 'Workspace',
          createdAt: Date.now(),
          state,
        });
      }
    } catch { /* skip */ }
  }

  if (workspaces.length === 0) return null;

  return {
    workspaces,
    activeWorkspaceId: workspaces[0].id,
  };
}

// ─── Context ─────────────────────────────────────────────────────────────────

interface WorkspaceContextValue {
  appState: AppState;
  activeWorkspace: Workspace;
  setActiveWorkspace: (id: string) => void;
  createWorkspace: (name: string) => string;
  renameWorkspace: (id: string, name: string) => void;
  deleteWorkspace: (id: string) => void;
  updateWorkspaceState: (id: string, state: WorkspaceState) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return ctx;
}

// ─── Provider ────────────────────────────────────────────────────────────────

function loadAppState(): AppState {
  if (typeof window === 'undefined') return defaultAppState();

  // Try migration first
  const migrated = migrateOldData();
  if (migrated) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    return migrated;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* fall through */ }

  return defaultAppState();
}

function saveAppState(state: AppState) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [appState, setAppState] = useState<AppState>(loadAppState);

  // Persist on change
  useEffect(() => {
    saveAppState(appState);
  }, [appState]);

  const activeWorkspace = appState.workspaces.find(w => w.id === appState.activeWorkspaceId)
    ?? appState.workspaces[0];

  const setActiveWorkspace = useCallback((id: string) => {
    setAppState(prev => ({ ...prev, activeWorkspaceId: id }));
  }, []);

  const createWorkspace = useCallback((name: string): string => {
    const id = generateId();
    const ws: Workspace = {
      id,
      name,
      createdAt: Date.now(),
      state: { blocks: [], layout: [] },
    };
    setAppState(prev => ({
      workspaces: [...prev.workspaces, ws],
      activeWorkspaceId: id,
    }));
    return id;
  }, []);

  const renameWorkspace = useCallback((id: string, name: string) => {
    setAppState(prev => ({
      ...prev,
      workspaces: prev.workspaces.map(w => w.id === id ? { ...w, name } : w),
    }));
  }, []);

  const deleteWorkspace = useCallback((id: string) => {
    setAppState(prev => {
      const remaining = prev.workspaces.filter(w => w.id !== id);
      if (remaining.length === 0) return prev; // can't delete last workspace
      return {
        workspaces: remaining,
        activeWorkspaceId: prev.activeWorkspaceId === id ? remaining[0].id : prev.activeWorkspaceId,
      };
    });
  }, []);

  const updateWorkspaceState = useCallback((id: string, state: WorkspaceState) => {
    setAppState(prev => ({
      ...prev,
      workspaces: prev.workspaces.map(w => w.id === id ? { ...w, state } : w),
    }));
  }, []);

  return (
    <WorkspaceContext.Provider value={{
      appState,
      activeWorkspace,
      setActiveWorkspace,
      createWorkspace,
      renameWorkspace,
      deleteWorkspace,
      updateWorkspaceState,
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
}
