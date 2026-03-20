import Link from 'next/link';
import PageWorkspace from '@/components/workspace/PageWorkspace';

const apps = [
  {
    id: 'emerald-detailing',
    name: 'Emerald Detailing',
    description: 'Full-stack car detailing platform. Booking system, admin console, CRM, POS, payroll, affiliates, and more.',
    publicHref: 'http://localhost:3001',
    adminHref: 'http://localhost:3001/admin',
    color: 'bg-emerald-500',
    initial: 'E',
    tags: ['Next.js', 'Firebase', 'TypeScript'],
    status: 'active',
  },
  {
    id: 'parley',
    name: 'Parley',
    description: 'Social debate platform. Debates, posts, reactions, and real-time updates powered by Firestore.',
    publicHref: 'http://localhost:3002',
    adminHref: 'http://localhost:3002/admin',
    color: 'bg-violet-500',
    initial: 'P',
    tags: ['React', 'Firebase', 'Zustand'],
    status: 'active',
  },
];

export default function AppsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">App Launcher</h1>
          <p className="text-gray-400 mt-1">Click an app to open its workspace, or use the buttons to launch directly.</p>
        </div>
        <button className="flex items-center px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add App
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {apps.map((app) => (
          <div
            key={app.id}
            className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden hover:border-gray-500 transition-colors"
          >
            {/* Clickable header → app workspace */}
            <Link href={`/console/apps/${app.id}`} className="block group">
              <div className={`${app.color} px-6 py-5 flex items-center gap-4`}>
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <span className="text-white text-xl font-bold">{app.initial}</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-semibold text-lg group-hover:underline">{app.name}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="w-1.5 h-1.5 bg-white/70 rounded-full" />
                    <span className="text-white/70 text-xs capitalize">{app.status}</span>
                  </div>
                </div>
                <svg className="w-4 h-4 text-white/50 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>

            <div className="px-6 py-5">
              <p className="text-sm text-gray-400 mb-4">{app.description}</p>

              <div className="flex flex-wrap gap-2 mb-5">
                {app.tags.map((tag) => (
                  <span key={tag} className="px-2 py-0.5 bg-gray-700 text-gray-300 text-xs rounded-full">
                    {tag}
                  </span>
                ))}
              </div>

              <div className="flex gap-2">
                <Link
                  href={`/console/apps/${app.id}`}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm font-medium rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                  </svg>
                  Workspace
                </Link>
                <a
                  href={app.publicHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm font-medium rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Site
                </a>
                <a
                  href={app.adminHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Admin
                </a>
              </div>
            </div>
          </div>
        ))}

        {/* Add new app placeholder */}
        <div className="bg-gray-800/50 rounded-xl border border-dashed border-gray-600 flex flex-col items-center justify-center p-8 hover:border-emerald-500/50 transition-colors cursor-pointer group">
          <div className="w-12 h-12 bg-gray-700 group-hover:bg-emerald-500/20 rounded-xl flex items-center justify-center transition-colors mb-3">
            <svg className="w-6 h-6 text-gray-400 group-hover:text-emerald-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-400 group-hover:text-gray-300 transition-colors">Add New App</p>
          <p className="text-xs text-gray-600 mt-1">Register an app to Nodnal</p>
        </div>
      </div>

      <PageWorkspace storageKey="workspace-apps" />
    </div>
  );
}
