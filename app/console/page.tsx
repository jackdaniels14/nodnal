'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import WorkspaceCanvas from '@/components/workspace/WorkspaceCanvas';
import { useWorkspace } from '@/lib/workspace-store';
import { WorkspaceState } from '@/lib/workspace-types';

export default function DashboardPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const { activeWorkspace, activePage, updateWorkspaceState, updatePageState } = useWorkspace();

  useEffect(() => {
    const measure = () => {
      if (containerRef.current) setWidth(containerRef.current.clientWidth);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Determine which state to show — dashboard or custom page
  const currentState = activePage?.state ?? activeWorkspace.state;
  const storageKey = activePage
    ? `workspace-${activeWorkspace.id}-page-${activePage.id}`
    : `workspace-${activeWorkspace.id}`;

  const handleStateChange = useCallback((state: WorkspaceState) => {
    if (activePage) {
      updatePageState(activeWorkspace.id, activePage.id, state);
    } else {
      updateWorkspaceState(activeWorkspace.id, state);
    }
  }, [activeWorkspace.id, activePage, updateWorkspaceState, updatePageState]);

  // Key changes when switching pages to force remount
  const canvasKey = activePage ? `${activeWorkspace.id}-${activePage.id}` : activeWorkspace.id;

  return (
    <div ref={containerRef} className="w-full h-full">
      {width > 0 && (
        <WorkspaceCanvas
          key={canvasKey}
          width={width}
          storageKey={storageKey}
          initialState={currentState}
          onStateChange={handleStateChange}
        />
      )}
    </div>
  );
}
