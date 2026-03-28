import { initializeApp, getApps, FirebaseOptions } from "firebase/app";

function getConfig(): FirebaseOptions {
  // Try NEXT_PUBLIC_ individual vars first (works client + server, local dev)
  if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
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

  // Firebase App Hosting provides config via FIREBASE_WEBAPP_CONFIG (server only, injected at build)
  const webappConfig = process.env.FIREBASE_WEBAPP_CONFIG;
  if (webappConfig) {
    try {
      return JSON.parse(webappConfig);
    } catch { /* fall through */ }
  }

  // Hardcoded fallback for the deployed app (client-side needs this)
  return {
    apiKey: "AIzaSyAAAskBsLe1gcv9ULmgJe-E7PgMW7lEyws",
    authDomain: "nodnal-46ea1.firebaseapp.com",
    projectId: "nodnal-46ea1",
    storageBucket: "nodnal-46ea1.firebasestorage.app",
    messagingSenderId: "798903059838",
    appId: "1:798903059838:web:6bafd2c99ea1ac8e3edf2f",
    measurementId: "G-XENPK30N70",
  };
}

// Prevent re-initialization in dev (hot reload)
const app = getApps().length === 0 ? initializeApp(getConfig()) : getApps()[0];

export default app;
