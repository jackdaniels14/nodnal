export default function CalendarPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-white">Calendar</h1>
        <p className="text-gray-400 mt-1 text-sm">Meetings and bookings from all connected apps, in one place.</p>
      </div>

      <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed border-gray-700 rounded-2xl">
        <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-gray-300 font-medium mb-1">Calendar coming soon</p>
        <p className="text-gray-500 text-sm text-center max-w-sm">
          Will pull bookings and meetings from all connected apps — Emerald Detailing, Parley, and more.
        </p>
      </div>
    </div>
  );
}
