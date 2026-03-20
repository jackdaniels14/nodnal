import PageWorkspace from '@/components/workspace/PageWorkspace';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-gray-400 mt-1">Configure your Nodnal command console.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* General */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <h2 className="text-base font-semibold text-white mb-4">General</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Console Name</label>
                <input
                  type="text"
                  defaultValue="Nodnal"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Default Landing</label>
                <select className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent">
                  <option value="/console">Dashboard</option>
                  <option value="/console/apps">App Launcher</option>
                </select>
              </div>
            </div>
          </div>

          {/* Registered Apps */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <h2 className="text-base font-semibold text-white mb-4">Registered Apps</h2>
            <div className="space-y-3">
              {[
                { name: 'Emerald Detailing', url: 'localhost:3001', color: 'bg-emerald-500' },
                { name: 'Parley', url: 'localhost:3002', color: 'bg-violet-500' },
              ].map((app) => (
                <div key={app.name} className="flex items-center gap-3 p-3 bg-gray-700/50 rounded-lg">
                  <div className={`w-8 h-8 ${app.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                    <span className="text-white text-sm font-bold">{app.name[0]}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{app.name}</p>
                    <p className="text-xs text-gray-400">{app.url}</p>
                  </div>
                  <button className="text-gray-500 hover:text-gray-300 transition-colors p-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar info */}
        <div className="space-y-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <h2 className="text-base font-semibold text-white mb-3">About Nodnal</h2>
            <div className="space-y-2 text-sm text-gray-400">
              <div className="flex justify-between">
                <span>Version</span>
                <span className="text-gray-200">0.1.0</span>
              </div>
              <div className="flex justify-between">
                <span>Stack</span>
                <span className="text-gray-200">Next.js 15</span>
              </div>
              <div className="flex justify-between">
                <span>Apps</span>
                <span className="text-gray-200">2</span>
              </div>
            </div>
          </div>

          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
            <p className="text-sm text-emerald-400 font-medium">Console Online</p>
            <p className="text-xs text-gray-400 mt-1">All systems are running normally.</p>
          </div>
        </div>
      </div>

      <PageWorkspace storageKey="workspace-settings" />
    </div>
  );
}
