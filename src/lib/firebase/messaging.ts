import { app } from './firebase';

// Helper to safely get the Messaging instance client-side
const getFirebaseMessaging = async () => {
  if (typeof window === 'undefined') return null;

  const { isSupported, getMessaging } = await import('firebase/messaging');
  const supported = await isSupported();
  if (!supported) return null;

  return getMessaging(app);
};

/**
 * Checks if the browser environment supports push notifications.
 */
export const isNotificationSupported = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return false;
  if (!('Notification' in window)) return false;
  if (!('serviceWorker' in navigator)) return false;

  try {
    const { isSupported } = await import('firebase/messaging');
    return await isSupported();
  } catch (err) {
    return false;
  }
};

/**
 * Requests browser notification permission.
 * Resolves with permission state: 'default' | 'granted' | 'denied'.
 */
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (typeof window === 'undefined') return 'default';

  const supported = await isNotificationSupported();
  if (!supported) {
    throw new Error('Push notifications are not supported in this browser.');
  }

  const permission = await Notification.requestPermission();
  return permission;
};

/**
 * Generates and returns the FCM registration token.
 * Returns null if the browser is unsupported or permission is not granted.
 */
export const getFCMToken = async (): Promise<string | null> => {
  if (typeof window === 'undefined') return null;

  const supported = await isNotificationSupported();
  if (!supported) {
    throw new Error('Push notifications are not supported in this browser.');
  }

  if (Notification.permission !== 'granted') {
    throw new Error('Notification permission is not granted.');
  }

  const messaging = await getFirebaseMessaging();
  if (!messaging) {
    throw new Error('Failed to initialize Firebase Messaging.');
  }

  const { getToken } = await import('firebase/messaging');
  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

  const token = await getToken(messaging, {
    vapidKey: vapidKey || undefined,
  });

  return token;
};

/**
 * Registers the Firebase Cloud Messaging service worker.
 */
export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (typeof window === 'undefined') return null;
  if (!('serviceWorker' in navigator)) return null;

  try {
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    console.log('FCM Service Worker registered successfully:', registration);
    return registration;
  } catch (err) {
    console.error('FCM Service Worker registration failed:', err);
    return null;
  }
};
