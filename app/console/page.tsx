'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import WorkspaceCanvas from '@/components/workspace/WorkspaceCanvas';
import { useWorkspace } from '@/lib/workspace-store';
import { WorkspaceState } from '@/lib/workspace-types';

export default function DashboardPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const { activeWorkspace, updateWorkspaceState } = useWorkspace();

  useEffect(() => {
    const measure = () => {
      if (containerRef.current) setWidth(containerRef.current.clientWidth);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Sync workspace state changes back to the store
  const handleStateChange = useCallback((state: WorkspaceState) => {
    updateWorkspaceState(activeWorkspace.id, state);
  }, [activeWorkspace.id, updateWorkspaceState]);

  return (
    <div ref={containerRef} className="w-full h-full">
      {width > 0 && (
        <WorkspaceCanvas
          key={activeWorkspace.id}
          width={width}
          storageKey={`workspace-${activeWorkspace.id}`}
          initialState={activeWorkspace.state}
          onStateChange={handleStateChange}
        />
      )}
    </div>
  );
}
