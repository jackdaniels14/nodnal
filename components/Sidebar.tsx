'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useWorkspace } from '@/lib/workspace-store';

export default function Sidebar() {
  const pathname = usePathname();
  const { appState, activeWorkspace, setActiveWorkspace, createWorkspace, renameWorkspace, deleteWorkspace } = useWorkspace();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set([activeWorkspace.id]));
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [showNewInput, setShowNewInput] = useState(false);
  const [newName, setNewName] = useState('');

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const handleCreate = () => {
    if (!newName.trim()) return;
    const id = createWorkspace(newName.trim());
    setExpandedIds(prev => new Set(prev).add(id));
    setNewName('');
    setShowNewInput(false);
  };

  const startRename = (id: string, currentName: string) => {
    setRenamingId(id);
    setRenameValue(currentName);
  };

  const finishRename = () => {
    if (renamingId && renameValue.trim()) {
      renameWorkspace(renamingId, renameValue.trim());
    }
    setRenamingId(null);
    setRenameValue('');
  };

  const handleDelete = (id: string) => {
    if (appState.workspaces.length <= 1) return;
    deleteWorkspace(id);
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 w-64">
      {/* Logo */}
      <div className="h-16 px-5 bg-gray-800 flex items-center border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm font-bold">N</span>
          </div>
          <div>
            <p className="text-sm font-bold text-white">Nodnal</p>
            <p className="text-xs text-gray-500">Command Console</p>
          </div>
        </div>
      </div>

      {/* Workspaces */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="flex items-center justify-between px-3 mb-2">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Workspaces</p>
          <button
            onClick={() => setShowNewInput(true)}
            className="p-1 text-gray-500 hover:text-emerald-400 transition-colors"
            title="New Workspace"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {/* New workspace input */}
        {showNewInput && (
          <div className="px-3 mb-2">
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setShowNewInput(false); }}
              autoFocus
              placeholder="Workspace name..."
              className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        )}

        {/* Workspace list */}
        {appState.workspaces.map(ws => {
          const isActive = ws.id === activeWorkspace.id;
          const isExpanded = expandedIds.has(ws.id);

          return (
            <div key={ws.id}>
              {/* Workspace folder */}
              <div className={`group flex items-center gap-1 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                isActive ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}>
                {/* Expand chevron */}
                <button
                  onClick={() => toggleExpand(ws.id)}
                  className="p-0.5 flex-shrink-0"
                >
                  <svg className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                {/* Workspace icon */}
                <svg className="w-4 h-4 flex-shrink-0 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>

                {/* Name (editable) */}
                {renamingId === ws.id ? (
                  <input
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onBlur={finishRename}
                    onKeyDown={e => { if (e.key === 'Enter') finishRename(); if (e.key === 'Escape') setRenamingId(null); }}
                    autoFocus
                    className="flex-1 text-xs bg-gray-700 px-1.5 py-0.5 rounded text-gray-100 outline-none focus:ring-1 focus:ring-emerald-500"
                    onClick={e => e.stopPropagation()}
                  />
                ) : (
                  <span
                    className="flex-1 text-sm truncate"
                    onClick={() => { setActiveWorkspace(ws.id); toggleExpand(ws.id); }}
                    onDoubleClick={() => startRename(ws.id, ws.name)}
                  >
                    {ws.name}
                  </span>
                )}

                {/* Actions */}
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); startRename(ws.id, ws.name); }}
                    className="p-1 text-gray-500 hover:text-gray-200 rounded transition-colors"
                    title="Rename"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  {appState.workspaces.length > 1 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(ws.id); }}
                      className="p-1 text-gray-500 hover:text-red-400 rounded transition-colors"
                      title="Delete"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Dashboard link (inside folder) */}
              {isExpanded && (
                <Link
                  href="/console"
                  onClick={() => setActiveWorkspace(ws.id)}
                  className={`flex items-center gap-2 ml-6 px-3 py-1.5 text-xs rounded-lg transition-colors ${
                    isActive && pathname === '/console'
                      ? 'text-emerald-400 bg-emerald-500/10'
                      : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                  </svg>
                  Dashboard
                </Link>
              )}
            </div>
          );
        })}

        {/* Fixed nav items */}
        <div className="pt-4 mt-4 border-t border-gray-800 space-y-1">
          <Link
            href="/console/calendar"
            className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
              pathname === '/console/calendar'
                ? 'bg-emerald-600 text-white'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Calendar
          </Link>

          <Link
            href="/console/settings"
            className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
              pathname === '/console/settings'
                ? 'bg-emerald-600 text-white'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </Link>
        </div>
      </nav>

      {/* Bottom */}
      <div className="p-4 border-t border-gray-800">
        <p className="text-xs text-gray-600 text-center">Nodnal v0.1</p>
      </div>
    </div>
  );
}
