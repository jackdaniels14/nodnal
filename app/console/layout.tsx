'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { useState } from 'react';
import { WorkspaceProvider } from '@/lib/workspace-store';
import { useAuth } from '@/lib/auth';

export default function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-lg animate-pulse flex items-center justify-center">
            <span className="text-white font-bold">N</span>
          </div>
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render console if not authenticated
  if (!user) return null;

  return (
    <WorkspaceProvider>
      <div className="flex h-screen bg-gray-900 overflow-hidden">
        {/* Mobile sidebar backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/60 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar - mobile */}
        <div
          className={`fixed inset-y-0 left-0 z-30 transform lg:hidden transition-transform duration-300 ease-in-out ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <Sidebar />
        </div>

        {/* Sidebar - desktop */}
        <div className="hidden lg:flex lg:flex-shrink-0">
          <Sidebar />
        </div>

        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header onMenuClick={() => setSidebarOpen(true)} />
          <main className="flex-1 overflow-y-auto p-4 bg-gray-900">
            {children}
          </main>
        </div>
      </div>
    </WorkspaceProvider>
  );
}
