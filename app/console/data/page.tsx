'use client';

import { useMemo } from 'react';
import { useRecordTypes, useRecords } from '@/lib/records/use-records';

export default function DataPage() {
  const { types: rawTypes } = useRecordTypes();
  const { records } = useRecords();

  const types = useMemo(() =>
    rawTypes.map(t => ({ id: t.id, name: t.name, count: records.filter(r => r.typeId === t.id).length })),
    [rawTypes, records]
  );
  const totalRecords = records.length;

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 pt-4 pb-3 flex-shrink-0">
        <h1 className="text-lg font-semibold text-white">Data</h1>
        <p className="text-xs text-gray-500 mt-1">Analytics, summaries, and data exports</p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-6">
        {/* Summary stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
            <p className="text-xs text-gray-500">Total Records</p>
            <p className="text-2xl font-bold text-white mt-1">{totalRecords}</p>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
            <p className="text-xs text-gray-500">Entry Types</p>
            <p className="text-2xl font-bold text-white mt-1">{types.length}</p>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
            <p className="text-xs text-gray-500">Agent-Created</p>
            <p className="text-2xl font-bold text-white mt-1">—</p>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
            <p className="text-xs text-gray-500">Manual Entries</p>
            <p className="text-2xl font-bold text-white mt-1">—</p>
          </div>
        </div>

        {/* Breakdown by type */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-3">Records by Type</h3>
          {types.length === 0 ? (
            <p className="text-xs text-gray-500">No entry types created yet.</p>
          ) : (
            <div className="space-y-2">
              {types.map(t => (
                <div key={t.id} className="flex items-center gap-3">
                  <span className="text-sm text-gray-300 flex-1">{t.name}</span>
                  <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${totalRecords > 0 ? (t.count / totalRecords) * 100 : 0}%` }} />
                  </div>
                  <span className="text-xs text-gray-400 w-8 text-right">{t.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Export */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-3">Export Data</h3>
          <div className="flex gap-2">
            <button onClick={() => {
              const data = JSON.stringify(records, null, 2);
              const blob = new Blob([data], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href = url; a.download = 'nodnal-records.json'; a.click();
            }} className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded-lg transition-colors">
              Export JSON
            </button>
            <button onClick={() => {
              const rt = rawTypes;
              const lines = records.map(r => {
                const type = rt.find(t => t.id === r.typeId);
                return [type?.name || '', ...Object.values(r.data).map(v => String(v ?? ''))].join(',');
              });
              const csv = ['Type,' + (rt[0]?.fields.map(f => f.name).join(',') || ''), ...lines].join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href = url; a.download = 'nodnal-records.csv'; a.click();
            }} className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded-lg transition-colors">
              Export CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
