import { initializeApp, getApps, FirebaseOptions } from "firebase/app";

function getConfig(): FirebaseOptions {
  // Firebase App Hosting provides config via FIREBASE_WEBAPP_CONFIG
  const webappConfig = process.env.FIREBASE_WEBAPP_CONFIG || process.env.NEXT_PUBLIC_FIREBASE_WEBAPP_CONFIG;
  if (webappConfig) {
    try {
      return JSON.parse(webappConfig);
    } catch { /* fall through to manual config */ }
  }

  // Fallback to individual env vars (local dev)
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  };
}

// Prevent re-initialization in dev (hot reload)
const app = getApps().length === 0 ? initializeApp(getConfig()) : getApps()[0];

export default app;
