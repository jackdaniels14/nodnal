'use client';

import { useEffect, useRef, useState } from 'react';
import WorkspaceCanvas from '@/components/workspace/WorkspaceCanvas';

export default function WorkspacePage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const measure = () => {
      if (containerRef.current) setWidth(containerRef.current.clientWidth);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full">
      {width > 0 && <WorkspaceCanvas width={width} storageKey="workspace-main" />}
    </div>
  );
}
