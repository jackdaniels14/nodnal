'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { WorkspaceState } from './workspace-types';

// ─── Data Model ──────────────────────────────────────────────────────────────

export interface WorkspacePage {
  id: string;
  name: string;
  state: WorkspaceState;
}

export interface Workspace {
  id: string;
  name: string;
  createdAt: number;
  state: WorkspaceState; // dashboard (default page)
  pages: WorkspacePage[]; // additional custom pages
  activePageId?: string; // null/undefined = dashboard
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
        pages: [],
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
          pages: [],
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
          pages: [],
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
  activePage: WorkspacePage | null; // null = dashboard
  setActiveWorkspace: (id: string) => void;
  setActivePage: (workspaceId: string, pageId: string | null) => void;
  createWorkspace: (name: string) => string;
  renameWorkspace: (id: string, name: string) => void;
  deleteWorkspace: (id: string) => void;
  updateWorkspaceState: (id: string, state: WorkspaceState) => void;
  addPage: (workspaceId: string, name: string) => string;
  renamePage: (workspaceId: string, pageId: string, name: string) => void;
  deletePage: (workspaceId: string, pageId: string) => void;
  updatePageState: (workspaceId: string, pageId: string, state: WorkspaceState) => void;
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
      pages: [],
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

  const setActivePage = useCallback((workspaceId: string, pageId: string | null) => {
    setAppState(prev => ({
      ...prev,
      workspaces: prev.workspaces.map(w => w.id === workspaceId ? { ...w, activePageId: pageId ?? undefined } : w),
    }));
  }, []);

  const addPage = useCallback((workspaceId: string, name: string): string => {
    const pageId = `page-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const page: WorkspacePage = { id: pageId, name, state: { blocks: [], layout: [] } };
    setAppState(prev => ({
      ...prev,
      workspaces: prev.workspaces.map(w => w.id === workspaceId
        ? { ...w, pages: [...(w.pages ?? []), page], activePageId: pageId }
        : w
      ),
    }));
    return pageId;
  }, []);

  const renamePage = useCallback((workspaceId: string, pageId: string, name: string) => {
    setAppState(prev => ({
      ...prev,
      workspaces: prev.workspaces.map(w => w.id === workspaceId
        ? { ...w, pages: (w.pages ?? []).map(p => p.id === pageId ? { ...p, name } : p) }
        : w
      ),
    }));
  }, []);

  const deletePage = useCallback((workspaceId: string, pageId: string) => {
    setAppState(prev => ({
      ...prev,
      workspaces: prev.workspaces.map(w => {
        if (w.id !== workspaceId) return w;
        const remaining = (w.pages ?? []).filter(p => p.id !== pageId);
        return { ...w, pages: remaining, activePageId: w.activePageId === pageId ? undefined : w.activePageId };
      }),
    }));
  }, []);

  const updatePageState = useCallback((workspaceId: string, pageId: string, state: WorkspaceState) => {
    setAppState(prev => ({
      ...prev,
      workspaces: prev.workspaces.map(w => w.id === workspaceId
        ? { ...w, pages: (w.pages ?? []).map(p => p.id === pageId ? { ...p, state } : p) }
        : w
      ),
    }));
  }, []);

  const activePage = activeWorkspace.activePageId
    ? (activeWorkspace.pages ?? []).find(p => p.id === activeWorkspace.activePageId) ?? null
    : null;

  return (
    <WorkspaceContext.Provider value={{
      appState,
      activeWorkspace,
      activePage,
      setActiveWorkspace,
      setActivePage,
      createWorkspace,
      renameWorkspace,
      deleteWorkspace,
      updateWorkspaceState,
      addPage,
      renamePage,
      deletePage,
      updatePageState,
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
}
