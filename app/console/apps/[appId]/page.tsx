'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getApp } from '@/lib/app-registry';
import WorkspaceCanvas from '@/components/workspace/WorkspaceCanvas';

export default function AppWorkspacePage({ params }: PageProps<'/console/apps/[appId]'>) {
  const [appId, setAppId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    params.then(p => setAppId(p.appId));
  }, [params]);

  useEffect(() => {
    if (!appId) return;
    const measure = () => {
      if (containerRef.current) setWidth(containerRef.current.clientWidth);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [appId]);

  if (!appId) return null;

  const app = getApp(appId);
  if (!app) notFound();

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/console/apps" className="hover:text-gray-300 transition-colors">Apps</Link>
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-gray-300">{app.name}</span>
      </div>

      {/* App header */}
      <div className={`${app.color} rounded-2xl p-6`}>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
            <span className="text-white text-3xl font-bold">{app.initial}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-white">{app.name}</h1>
            <p className="text-white/70 text-sm mt-1">{app.description}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {app.tags.map(tag => (
                <span key={tag} className="px-2 py-0.5 bg-white/20 text-white text-xs rounded-full">{tag}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Quick Links</h2>
        <div className="flex flex-wrap gap-2">
          {app.links.map(link => (
            <a
              key={link.label}
              href={link.href}
              target={link.external ? '_blank' : undefined}
              rel={link.external ? 'noopener noreferrer' : undefined}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white text-sm rounded-lg transition-all"
            >
              {link.external && (
                <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              )}
              {link.label}
            </a>
          ))}
        </div>
      </div>

      {/* Workspace */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">{app.name} Workspace</h2>
            <p className="text-sm text-gray-400 mt-0.5">Your custom dashboard for this app. Add blocks, link to live data, whatever you need.</p>
          </div>
        </div>
        <div ref={containerRef} className="w-full">
          {width > 0 && (
            <WorkspaceCanvas
              width={width}
              storageKey={`workspace-app-${app.id}`}
            />
          )}
        </div>
      </div>
    </div>
  );
}
