'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import app from '@/lib/firebase';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const auth = getAuth(app);
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace('/console');
      } else {
        setChecking(false);
      }
    });
    return unsub;
  }, [router]);

  if (checking) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="w-8 h-8 bg-emerald-500 rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-emerald-500 rounded-lg flex items-center justify-center">
            <span className="text-white text-lg font-bold">N</span>
          </div>
          <span className="text-xl font-bold">Nodnal</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors">
            Log In
          </Link>
          <Link href="/signup" className="px-4 py-2 text-sm bg-emerald-500 hover:bg-emerald-600 rounded-lg font-medium transition-colors">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-xs text-emerald-400 mb-6">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
          AI-Powered Command Console
        </div>
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-6">
          Your business,
          <br />
          <span className="text-emerald-400">one command center.</span>
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10">
          Nodnal brings your apps, data, and AI agents into one customizable workspace.
          Manage everything from a single dashboard — no switching between tools.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/signup" className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg transition-colors text-sm">
            Start Free
          </Link>
          <Link href="/login" className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 font-medium rounded-lg transition-colors text-sm">
            Log In
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              title: 'AI Agents',
              desc: 'Deploy AI agents that browse the web, scrape data, fill forms, and automate tasks across your business tools.',
              icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
            },
            {
              title: 'Custom Workspaces',
              desc: 'Build drag-and-drop dashboards with stat blocks, charts, tables, lists, and more. Style them however you want.',
              icon: 'M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4z',
            },
            {
              title: 'Records & Data',
              desc: 'Structured data management with custom record types, search filters, and AI-powered organization.',
              icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
            },
          ].map((f, i) => (
            <div key={i} className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
              <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={f.icon} />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-16">
        <div className="max-w-6xl mx-auto px-6 py-8 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="w-5 h-5 bg-emerald-500 rounded flex items-center justify-center">
              <span className="text-white text-xs font-bold">N</span>
            </div>
            Nodnal v0.1
          </div>
          <p className="text-xs text-gray-600">Built with AI agents in mind.</p>
        </div>
      </footer>
    </div>
  );
}
