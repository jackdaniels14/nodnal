import PageWorkspace from '@/components/workspace/PageWorkspace';

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Profile</h1>
        <p className="text-gray-400 mt-1">Your Nodnal account details.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-gray-800 rounded-xl border border-gray-700 p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center">
              <span className="text-white text-2xl font-bold">N</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Admin</h2>
              <p className="text-sm text-gray-400">Nodnal Owner</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Display Name</label>
              <input
                type="text"
                defaultValue="Admin"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
              <input
                type="email"
                placeholder="your@email.com"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <button className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-lg transition-colors">
              Save Changes
            </button>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h2 className="text-base font-semibold text-white mb-4">Access</h2>
          <div className="space-y-3 text-sm">
            {[
              { label: 'Nodnal Hub', access: 'Owner' },
              { label: 'Emerald Detailing', access: 'Admin' },
              { label: 'Parley', access: 'Admin' },
            ].map((row) => (
              <div key={row.label} className="flex justify-between items-center">
                <span className="text-gray-400">{row.label}</span>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">{row.access}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <PageWorkspace storageKey="workspace-profile" />
    </div>
  );
}
