'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import AgentTaskBar from '@/components/AgentTaskBar';
import { useAuth } from '@/lib/auth';

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="w-10 h-10 bg-emerald-500 rounded-lg animate-pulse flex items-center justify-center">
          <span className="text-white font-bold">N</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-[100dvh] bg-gray-900 overflow-hidden">
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <div className={`fixed inset-y-0 left-0 z-30 transform lg:hidden transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar />
      </div>
      <div className="hidden lg:flex lg:flex-shrink-0">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="h-12 px-4 flex items-center justify-between border-b border-gray-800 bg-gray-900 flex-shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 text-gray-400 hover:text-white mr-3">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex-1" />
          <AgentTaskBar />
        </div>
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
