'use client';

import { useState, useEffect } from 'react';
import { onTasksChanged, AgentTask } from '@/lib/agents/agent-tasks';

export default function AgentTaskBar() {
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const unsub = onTasksChanged(setTasks);
    return () => unsub();
  }, []);

  const activeTasks = tasks.filter(t => t.status === 'running' || t.status === 'pending');
  const recentCompleted = tasks
    .filter(t => (t.status === 'completed' || t.status === 'error') && !dismissed.has(t.id))
    .slice(0, 5);

  const hasNotifications = recentCompleted.length > 0;
  const isWorking = activeTasks.length > 0;

  if (!isWorking && !hasNotifications) return null;

  return (
    <div className="relative">
      {/* Indicator button */}
      <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-gray-800 transition-colors">
        {/* Agent avatars stack */}
        <div className="flex -space-x-1.5">
          {activeTasks.slice(0, 3).map(t => (
            <div key={t.id} className={`w-5 h-5 ${t.agentColor} rounded-full flex items-center justify-center ring-2 ring-gray-900`}>
              <span className="text-white text-xs font-bold" style={{ fontSize: '8px' }}>{t.agentInitial}</span>
            </div>
          ))}
        </div>

        {isWorking && (
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
            <span className="text-xs text-gray-400">{activeTasks.length} working</span>
          </div>
        )}

        {hasNotifications && !isWorking && (
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            <span className="text-xs text-gray-400">{recentCompleted.length} done</span>
          </div>
        )}

        {hasNotifications && (
          <span className="w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold" style={{ fontSize: '8px' }}>{recentCompleted.length}</span>
          </span>
        )}
      </button>

      {/* Dropdown */}
      {expanded && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setExpanded(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Agent Activity</h3>
              {recentCompleted.length > 0 && (
                <button onClick={() => setDismissed(new Set(recentCompleted.map(t => t.id)))}
                  className="text-xs text-gray-500 hover:text-gray-300">Clear all</button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {/* Active tasks */}
              {activeTasks.map(t => (
                <div key={t.id} className="px-4 py-3 border-b border-gray-700/50 flex items-start gap-3">
                  <div className={`w-7 h-7 ${t.agentColor} rounded-full flex items-center justify-center flex-shrink-0`}>
                    <span className="text-white text-xs font-bold">{t.agentInitial}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-white">{t.agentName}</span>
                      <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                      <span className="text-xs text-amber-400">Working</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{t.instruction}</p>
                  </div>
                </div>
              ))}

              {/* Completed tasks */}
              {recentCompleted.map(t => (
                <div key={t.id} className="px-4 py-3 border-b border-gray-700/50 flex items-start gap-3">
                  <div className={`w-7 h-7 ${t.agentColor} rounded-full flex items-center justify-center flex-shrink-0`}>
                    <span className="text-white text-xs font-bold">{t.agentInitial}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-white">{t.agentName}</span>
                      {t.status === 'completed' ? (
                        <span className="text-xs text-emerald-400">Done</span>
                      ) : (
                        <span className="text-xs text-red-400">Error</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{t.instruction}</p>
                    {t.result && (
                      <p className="text-xs text-gray-300 mt-1 line-clamp-2">{t.result.slice(0, 150)}{t.result.length > 150 ? '...' : ''}</p>
                    )}
                    {t.error && (
                      <p className="text-xs text-red-400 mt-1">{t.error}</p>
                    )}
                    {t.completedAt && (
                      <p className="text-xs text-gray-600 mt-1">{new Date(t.completedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p>
                    )}
                  </div>
                  <button onClick={() => setDismissed(prev => new Set([...prev, t.id]))}
                    className="p-1 text-gray-600 hover:text-gray-400 flex-shrink-0">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}

              {activeTasks.length === 0 && recentCompleted.length === 0 && (
                <p className="text-xs text-gray-600 text-center py-6">No recent activity</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
