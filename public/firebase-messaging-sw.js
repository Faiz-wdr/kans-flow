/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Initialize Firebase App inside Service Worker
firebase.initializeApp({
  apiKey: "AIzaSyB659l_INBEZCuNiKuVrQUsjIPt-GbKMPo",
  authDomain: "kans-flow.firebaseapp.com",
  projectId: "kans-flow",
  storageBucket: "kans-flow.firebasestorage.app",
  messagingSenderId: "132979649243",
  appId: "1:132979649243:web:09d9a84f846ecdca937afe",
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  const notificationTitle = payload.notification?.title || 'New Notification';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: payload.notification?.icon || '/favicon.ico',
    data: payload.data || {},
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click events (open or focus window with deep linking)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const actionUrl = event.notification.data?.actionUrl || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Look for an existing open window, navigate to the deep link, and focus it
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url && 'focus' in client) {
          if ('navigate' in client) {
            client.navigate(actionUrl);
          }
          return client.focus();
        }
      }
      // If no window is open, open a new one pointing to the deep link
      if (clients.openWindow) {
        return clients.openWindow(actionUrl);
      }
    })
  );
});
