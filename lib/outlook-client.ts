'use client';

import { PublicClientApplication, InteractionRequiredAuthError } from '@azure/msal-browser';

// ─── MSAL Config ─────────────────────────────────────────────────────────────
// Users must register an Azure AD app and set these env vars.

const CLIENT_ID = process.env.NEXT_PUBLIC_AZURE_CLIENT_ID ?? '';
const REDIRECT_URI = typeof window !== 'undefined' ? window.location.origin : '';

const msalConfig = {
  auth: {
    clientId: CLIENT_ID,
    authority: 'https://login.microsoftonline.com/common',
    redirectUri: REDIRECT_URI,
  },
  cache: {
    cacheLocation: 'localStorage' as const,
  },
};

const SCOPES = [
  'User.Read',
  'Calendars.Read',
  'Mail.Read',
];

let msalInstance: PublicClientApplication | null = null;

async function getMsal(): Promise<PublicClientApplication> {
  if (!CLIENT_ID) throw new Error('NEXT_PUBLIC_AZURE_CLIENT_ID not set. Register an Azure AD app first.');
  if (!msalInstance) {
    msalInstance = new PublicClientApplication(msalConfig);
    await msalInstance.initialize();
  }
  return msalInstance;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export async function signIn(): Promise<string> {
  const msal = await getMsal();
  const result = await msal.loginPopup({ scopes: SCOPES });
  return result.account?.username ?? '';
}

export async function signOut(): Promise<void> {
  const msal = await getMsal();
  const accounts = msal.getAllAccounts();
  if (accounts.length > 0) {
    await msal.logoutPopup({ account: accounts[0] });
  }
}

export function isSignedIn(): boolean {
  if (!msalInstance) return false;
  return msalInstance.getAllAccounts().length > 0;
}

export function getAccount(): string | null {
  if (!msalInstance) return null;
  const accounts = msalInstance.getAllAccounts();
  return accounts.length > 0 ? accounts[0].username : null;
}

async function getToken(): Promise<string> {
  const msal = await getMsal();
  const accounts = msal.getAllAccounts();
  if (accounts.length === 0) throw new Error('Not signed in');

  try {
    const result = await msal.acquireTokenSilent({ scopes: SCOPES, account: accounts[0] });
    return result.accessToken;
  } catch (e) {
    if (e instanceof InteractionRequiredAuthError) {
      const result = await msal.acquireTokenPopup({ scopes: SCOPES });
      return result.accessToken;
    }
    throw e;
  }
}

// ─── Graph API Helpers ───────────────────────────────────────────────────────

async function graphFetch(endpoint: string): Promise<unknown> {
  const token = await getToken();
  const res = await fetch(`https://graph.microsoft.com/v1.0${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Graph API error: ${res.status} ${res.statusText}`);
  return res.json();
}

// ─── Calendar ────────────────────────────────────────────────────────────────

export interface CalendarEvent {
  id: string;
  subject: string;
  start: string; // ISO
  end: string;   // ISO
  location?: string;
  isAllDay: boolean;
  bodyPreview?: string;
}

export async function getCalendarEvents(startDate: string, endDate: string): Promise<CalendarEvent[]> {
  const data = await graphFetch(
    `/me/calendarview?startdatetime=${encodeURIComponent(startDate)}&enddatetime=${encodeURIComponent(endDate)}&$select=id,subject,start,end,location,isAllDay,bodyPreview&$orderby=start/dateTime&$top=100`
  ) as { value: Array<{ id: string; subject: string; start: { dateTime: string }; end: { dateTime: string }; location?: { displayName?: string }; isAllDay: boolean; bodyPreview?: string }> };

  return data.value.map(e => ({
    id: e.id,
    subject: e.subject,
    start: e.start.dateTime + 'Z',
    end: e.end.dateTime + 'Z',
    location: e.location?.displayName,
    isAllDay: e.isAllDay,
    bodyPreview: e.bodyPreview,
  }));
}

// ─── Email ───────────────────────────────────────────────────────────────────

export interface EmailMessage {
  id: string;
  subject: string;
  from: string;
  receivedAt: string;
  bodyPreview: string;
  isRead: boolean;
}

export async function getRecentEmails(count = 20): Promise<EmailMessage[]> {
  const data = await graphFetch(
    `/me/messages?$select=id,subject,from,receivedDateTime,bodyPreview,isRead&$orderby=receivedDateTime desc&$top=${count}`
  ) as { value: Array<{ id: string; subject: string; from: { emailAddress: { name: string; address: string } }; receivedDateTime: string; bodyPreview: string; isRead: boolean }> };

  return data.value.map(e => ({
    id: e.id,
    subject: e.subject,
    from: e.from.emailAddress.name || e.from.emailAddress.address,
    receivedAt: e.receivedDateTime,
    bodyPreview: e.bodyPreview,
    isRead: e.isRead,
  }));
}
