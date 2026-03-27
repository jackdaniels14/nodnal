'use client';

import { useState, useEffect, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { getCalendarEvents, isSignedIn, signIn, CalendarEvent } from '@/lib/outlook-client';

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      setConnected(isSignedIn());
    } catch {
      // MSAL not configured
    }
  }, []);

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    try {
      await signIn();
      setConnected(true);
      await loadEvents();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to connect');
    }
    setLoading(false);
  };

  const loadEvents = useCallback(async () => {
    if (!connected && !isSignedIn()) return;
    setLoading(true);
    try {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const end = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString();
      const data = await getCalendarEvents(start, end);
      setEvents(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load events');
    }
    setLoading(false);
  }, [connected]);

  useEffect(() => {
    if (connected) loadEvents();
  }, [connected, loadEvents]);

  const calendarEvents = events.map(e => ({
    id: e.id,
    title: e.subject,
    start: e.start,
    end: e.end,
    allDay: e.isAllDay,
    extendedProps: { location: e.location, bodyPreview: e.bodyPreview },
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-white">Calendar</h1>
        <div className="flex items-center gap-3">
          {loading && <span className="text-xs text-gray-500 animate-pulse">Loading...</span>}
          {connected ? (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full" />
              <span className="text-xs text-gray-400">Outlook connected</span>
              <button onClick={loadEvents} className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">Refresh</button>
            </div>
          ) : (
            <button
              onClick={handleConnect}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 text-white text-xs font-medium rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M0 0h11.377v11.372H0zm12.623 0H24v11.372H12.623zM0 12.623h11.377V24H0zm12.623 0H24V24H12.623z" />
              </svg>
              Connect Outlook
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 nodnal-calendar">
        <style>{`
          .nodnal-calendar .fc {
            --fc-border-color: #374151;
            --fc-button-bg-color: #1f2937;
            --fc-button-border-color: #374151;
            --fc-button-text-color: #d1d5db;
            --fc-button-hover-bg-color: #374151;
            --fc-button-hover-border-color: #4b5563;
            --fc-button-active-bg-color: #10b981;
            --fc-button-active-border-color: #10b981;
            --fc-today-bg-color: rgba(16, 185, 129, 0.1);
            --fc-page-bg-color: transparent;
            --fc-neutral-bg-color: #1f2937;
            --fc-list-event-hover-bg-color: #374151;
            --fc-event-bg-color: #10b981;
            --fc-event-border-color: #059669;
            --fc-event-text-color: #ffffff;
            color: #d1d5db;
          }
          .nodnal-calendar .fc .fc-col-header-cell { background: #1f2937; padding: 8px 0; }
          .nodnal-calendar .fc .fc-daygrid-day-number,
          .nodnal-calendar .fc .fc-col-header-cell-cushion { color: #9ca3af; text-decoration: none; }
          .nodnal-calendar .fc .fc-day-today .fc-daygrid-day-number { color: #10b981; font-weight: bold; }
          .nodnal-calendar .fc .fc-toolbar-title { font-size: 1rem; color: #f9fafb; }
          .nodnal-calendar .fc .fc-scrollgrid { border-color: #374151; }
          .nodnal-calendar .fc .fc-timegrid-slot { height: 40px; }
          .nodnal-calendar .fc .fc-timegrid-slot-label { color: #6b7280; }
        `}</style>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay',
          }}
          events={calendarEvents}
          height="auto"
          eventDisplay="block"
          dayMaxEvents={3}
        />
      </div>

      {!connected && events.length === 0 && !error && (
        <div className="text-center py-8">
          <p className="text-sm text-gray-400">Connect your Outlook account to sync calendar events.</p>
          <p className="text-xs text-gray-600 mt-1">Set NEXT_PUBLIC_AZURE_CLIENT_ID in .env.local after registering an Azure AD app.</p>
        </div>
      )}
    </div>
  );
}
