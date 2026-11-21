import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Public web-app identifiers (safe to ship to the browser). Admin credentials live only in the backend.
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);

// Placeholders keep builds/SSR working when env vars are missing; the UI shows a setup notice instead.
const app = getApps().length
  ? getApp()
  : initializeApp({
      apiKey: config.apiKey || 'not-configured',
      authDomain: config.authDomain || 'not-configured.firebaseapp.com',
      projectId: config.projectId || 'not-configured',
      appId: config.appId || 'not-configured',
    });

/** Only Firebase Authentication is used on the client. All data access goes through the Express API. */
export const auth = getAuth(app);
