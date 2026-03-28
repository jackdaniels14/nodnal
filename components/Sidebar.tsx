'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { useWorkspace } from '@/lib/workspace-store';
import { useAuth } from '@/lib/auth';

function UserFooter() {
  const { user, signOut } = useAuth();
  return (
    <div className="p-3 border-t border-gray-800">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
          {user?.photoURL ? (
            <img src={user.photoURL} alt="" className="w-7 h-7 rounded-full" />
          ) : (
            <span className="text-xs text-gray-300 font-medium">{(user?.displayName?.[0] || user?.email?.[0] || '?').toUpperCase()}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-white truncate">{user?.displayName || 'User'}</p>
          <p className="text-xs text-gray-500 truncate">{user?.email}</p>
        </div>
        <button onClick={signOut} className="p-1.5 text-gray-500 hover:text-red-400 transition-colors" title="Sign out">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const {
    appState, activeWorkspace, setActiveWorkspace,
    createWorkspace, renameWorkspace, deleteWorkspace,
    setActivePage, addPage, renamePage, deletePage,
  } = useWorkspace();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set([activeWorkspace.id]));
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [showNewWs, setShowNewWs] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [addingPageToWs, setAddingPageToWs] = useState<string | null>(null);
  const [newPageName, setNewPageName] = useState('');
  const [wsDropdownOpen, setWsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setWsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const handleCreateWs = () => {
    if (!newWsName.trim()) return;
    const id = createWorkspace(newWsName.trim());
    setExpandedIds(prev => new Set(prev).add(id));
    setNewWsName('');
    setShowNewWs(false);
  };

  const handleAddPage = (wsId: string) => {
    if (!newPageName.trim()) return;
    addPage(wsId, newPageName.trim());
    setNewPageName('');
    setAddingPageToWs(null);
  };

  const startRename = (id: string, name: string) => { setRenamingId(id); setRenameValue(name); };
  const finishRename = () => {
    if (!renamingId || !renameValue.trim()) { setRenamingId(null); return; }
    // Check if it's a page or workspace
    const isPage = renamingId.startsWith('page-');
    if (isPage) {
      renamePage(activeWorkspace.id, renamingId, renameValue.trim());
    } else {
      renameWorkspace(renamingId, renameValue.trim());
    }
    setRenamingId(null);
    setRenameValue('');
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 w-64">
      {/* Logo — workspace dropdown */}
      <div ref={dropdownRef} className="relative h-16 px-3 bg-gray-800 flex items-center border-b border-gray-700">
        <button
          onClick={() => setWsDropdownOpen(!wsDropdownOpen)}
          className="flex items-center gap-3 w-full px-2 py-1.5 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm font-bold">N</span>
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-sm font-bold text-white truncate">{activeWorkspace.name}</p>
            <p className="text-xs text-gray-500">Nodnal</p>
          </div>
          <svg className={`w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform ${wsDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown */}
        {wsDropdownOpen && (
          <div className="absolute left-2 right-2 top-full mt-1 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl py-1 z-50">
            <p className="px-3 py-1.5 text-xs text-gray-500 uppercase tracking-wider">Workspaces</p>
            {appState.workspaces.map(ws => (
              <button
                key={ws.id}
                onClick={() => { setActiveWorkspace(ws.id); setActivePage(ws.id, null); setWsDropdownOpen(false); setExpandedIds(prev => new Set(prev).add(ws.id)); }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                  ws.id === activeWorkspace.id ? 'text-emerald-400 bg-emerald-500/10' : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <span className="truncate">{ws.name}</span>
                {ws.id === activeWorkspace.id && (
                  <svg className="w-3.5 h-3.5 ml-auto text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
            <div className="border-t border-gray-700 mt-1 pt-1">
              <button
                onClick={() => { setShowNewWs(true); setWsDropdownOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-emerald-400 hover:bg-gray-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Workspace
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {/* New workspace input */}
        {showNewWs && (
          <div className="px-3 mb-2">
            <input
              value={newWsName}
              onChange={e => setNewWsName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreateWs(); if (e.key === 'Escape') setShowNewWs(false); }}
              autoFocus placeholder="Workspace name..."
              className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        )}

        {/* Workspace folders */}
        {appState.workspaces.map(ws => {
          const isActive = ws.id === activeWorkspace.id;
          const isExpanded = expandedIds.has(ws.id);
          const pages = ws.pages ?? [];

          return (
            <div key={ws.id}>
              {/* Workspace header */}
              <div className={`group flex items-center gap-1 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                isActive ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}>
                <button onClick={() => toggleExpand(ws.id)} className="p-0.5 flex-shrink-0">
                  <svg className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <svg className="w-4 h-4 flex-shrink-0 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                {renamingId === ws.id ? (
                  <input value={renameValue} onChange={e => setRenameValue(e.target.value)}
                    onBlur={finishRename} onKeyDown={e => { if (e.key === 'Enter') finishRename(); if (e.key === 'Escape') setRenamingId(null); }}
                    autoFocus className="flex-1 text-xs bg-gray-700 px-1.5 py-0.5 rounded text-gray-100 outline-none focus:ring-1 focus:ring-emerald-500"
                    onClick={e => e.stopPropagation()} />
                ) : (
                  <span className="flex-1 text-sm truncate" onClick={() => { setActiveWorkspace(ws.id); setActivePage(ws.id, null); if (!isExpanded) toggleExpand(ws.id); }}
                    onDoubleClick={() => startRename(ws.id, ws.name)}>{ws.name}</span>
                )}
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={e => { e.stopPropagation(); startRename(ws.id, ws.name); }} className="p-1 text-gray-500 hover:text-gray-200 rounded transition-colors" title="Rename">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  </button>
                  {appState.workspaces.length > 1 && (
                    <button onClick={e => { e.stopPropagation(); deleteWorkspace(ws.id); }} className="p-1 text-gray-500 hover:text-red-400 rounded transition-colors" title="Delete">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Pages inside folder */}
              {isExpanded && (
                <div className="ml-6 space-y-0.5">
                  {/* Dashboard (always first) */}
                  <Link href="/console" onClick={() => { setActiveWorkspace(ws.id); setActivePage(ws.id, null); }}
                    className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg transition-colors ${
                      isActive && !activeWorkspace.activePageId && pathname === '/console' ? 'text-emerald-400 bg-emerald-500/10' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
                    }`}>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                    </svg>
                    Dashboard
                  </Link>

                  {/* Custom pages */}
                  {pages.map(page => (
                    <div key={page.id} className="group/page flex items-center">
                      <button
                        onClick={() => { setActiveWorkspace(ws.id); setActivePage(ws.id, page.id); }}
                        className={`flex-1 flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg transition-colors ${
                          isActive && activeWorkspace.activePageId === page.id ? 'text-emerald-400 bg-emerald-500/10' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
                        }`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {renamingId === page.id ? (
                          <input value={renameValue} onChange={e => setRenameValue(e.target.value)}
                            onBlur={finishRename} onKeyDown={e => { if (e.key === 'Enter') finishRename(); if (e.key === 'Escape') setRenamingId(null); }}
                            autoFocus className="flex-1 text-xs bg-gray-700 px-1 py-0.5 rounded text-gray-100 outline-none"
                            onClick={e => e.stopPropagation()} />
                        ) : (
                          <span className="truncate" onDoubleClick={() => startRename(page.id, page.name)}>{page.name}</span>
                        )}
                      </button>
                      <div className="flex gap-0.5 opacity-0 group-hover/page:opacity-100 transition-opacity pr-1">
                        <button onClick={() => startRename(page.id, page.name)} className="p-0.5 text-gray-600 hover:text-gray-300 rounded" title="Rename">
                          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                        <button onClick={() => deletePage(ws.id, page.id)} className="p-0.5 text-gray-600 hover:text-red-400 rounded" title="Delete">
                          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Add page */}
                  {addingPageToWs === ws.id ? (
                    <input value={newPageName} onChange={e => setNewPageName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleAddPage(ws.id); if (e.key === 'Escape') setAddingPageToWs(null); }}
                      autoFocus placeholder="Page name..."
                      className="w-full px-3 py-1 bg-gray-700 border border-gray-600 rounded-lg text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                  ) : (
                    <button onClick={() => { setAddingPageToWs(ws.id); setNewPageName(''); }}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-600 hover:text-gray-400 transition-colors">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add page
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Fixed nav */}
        <div className="pt-4 mt-4 border-t border-gray-800 space-y-1">
          <Link href="/console/records"
            className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
              pathname.startsWith('/console/records') ? 'bg-emerald-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            }`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            Records
          </Link>
          <Link href="/console/calendar" className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${pathname === '/console/calendar' ? 'bg-emerald-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            Calendar
          </Link>
          <Link href="/console/settings" className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${pathname === '/console/settings' ? 'bg-emerald-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            Settings
          </Link>
        </div>
      </nav>

      <UserFooter />
    </div>
  );
}
