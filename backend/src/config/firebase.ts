import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'node:fs';
import path from 'node:path';
import { env } from './env';

function createApp(): App {
  if (getApps().length) return getApps()[0]!;

  let serviceAccount: Record<string, unknown>;
  if (env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON);
  } else {
    const file = path.resolve(process.cwd(), env.GOOGLE_APPLICATION_CREDENTIALS!);
    if (!fs.existsSync(file)) {
      throw new Error(`Service account file not found at ${file}. See README -> Firebase setup.`);
    }
    serviceAccount = JSON.parse(fs.readFileSync(file, 'utf8'));
  }

  return initializeApp({
    credential: cert(serviceAccount as Parameters<typeof cert>[0]),
    projectId: env.FIREBASE_PROJECT_ID,
  });
}

const app = createApp();

export const adminAuth = getAuth(app);
export const db = getFirestore(app);
db.settings({ ignoreUndefinedProperties: true });

export const COLLECTIONS = {
  users: 'users',
  reports: 'reports',
  authorities: 'authorities',
  assignments: 'assignments',
  comments: 'comments',
  timeline: 'report_timeline',
  verifications: 'resolution_verifications',
  supports: 'supports',
  notifications: 'notifications',
} as const;
