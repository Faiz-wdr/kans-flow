import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

/**
 * Safely initializes and returns the Firebase Admin Messaging instance.
 * Ensures compatibility with hot-reload in development.
 */
export function getFirebaseAdminMessaging() {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    console.warn('[Firebase Admin] Missing required server-side credentials. Push messaging is disabled.');
    return null;
  }

  try {
    if (getApps().length === 0) {
      let formattedKey = privateKey.trim();
      if (formattedKey.startsWith('nMII')) {
        formattedKey = formattedKey.substring(1);
      }
      if (!formattedKey.includes('BEGIN PRIVATE KEY')) {
        formattedKey = `-----BEGIN PRIVATE KEY-----\n${formattedKey}\n-----END PRIVATE KEY-----`;
      }
      formattedKey = formattedKey.replace(/\\n/g, '\n');

      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: formattedKey,
        }),
      });
      console.log('[Firebase Admin] Initialized SDK instance successfully.');
    }
    return getMessaging();
  } catch (err) {
    console.error('[Firebase Admin] Initialization failed:', err);
    return null;
  }
}
