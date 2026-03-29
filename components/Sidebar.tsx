'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';

const NAV_ITEMS = [
  {
    name: 'Dashboard',
    href: '/console',
    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
    exact: true,
  },
  {
    name: 'Entries',
    href: '/console/entries',
    icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
  },
  {
    name: 'Activities',
    href: '/console/activities',
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
  },
  {
    name: 'Data',
    href: '/console/data',
    icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  },
  {
    name: 'AI Agents',
    href: '/console/agents',
    icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  },
  {
    name: 'AI Manager',
    href: '/console/ai-manager',
    icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  },
];

const BOTTOM_ITEMS = [
  {
    name: 'Calendar',
    href: '/console/calendar',
    icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  },
  {
    name: 'Settings',
    href: '/console/settings',
    icon: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4',
  },
];

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

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 w-60">
      {/* Logo */}
      <div className="h-14 px-4 flex items-center border-b border-gray-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">N</span>
          </div>
          <span className="text-sm font-bold text-white">Nodnal</span>
        </div>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(item => (
          <Link key={item.name} href={item.href}
            className={`flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
              isActive(item.href, item.exact)
                ? 'bg-emerald-500/15 text-emerald-400'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}>
            <svg className="w-4.5 h-4.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={item.icon} />
            </svg>
            {item.name}
          </Link>
        ))}

        <div className="pt-3 mt-3 border-t border-gray-800 space-y-0.5">
          {BOTTOM_ITEMS.map(item => (
            <Link key={item.name} href={item.href}
              className={`flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                isActive(item.href)
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}>
              <svg className="w-4.5 h-4.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={item.icon} />
              </svg>
              {item.name}
            </Link>
          ))}
        </div>
      </nav>

      <UserFooter />
    </div>
  );
}
