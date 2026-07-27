import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, isSupported, onMessage, type Messaging, type MessagePayload } from 'firebase/messaging';
import { api } from './api';

type FirebaseNotificationPayload = {
  notification?: {
    title?: string;
    body?: string;
  };
  data?: Record<string, string>;
};

let firebaseApp: FirebaseApp | null = null;
let messagingInstance: Messaging | null = null;
let activeToken: string | null = null;
let foregroundUnsubscribe: (() => void) | null = null;

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};

const firebaseVapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;

const hasFirebaseConfig = () =>
  Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.messagingSenderId &&
    firebaseConfig.appId &&
    firebaseVapidKey,
  );

const getFirebaseApp = () => {
  if (!firebaseApp) {
    firebaseApp = initializeApp(firebaseConfig);
  }
  return firebaseApp;
};

const buildServiceWorkerUrl = () => {
  const params = new URLSearchParams();
  Object.entries(firebaseConfig).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  return `/firebase-messaging-sw.js?${params.toString()}`;
};

export const setupFirebaseNotifications = async () => {
  if (!hasFirebaseConfig()) return null;
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return null;

  const supported = await isSupported().catch(() => false);
  if (!supported) return null;

  let permission = Notification.permission;
  if (permission === 'default') {
    permission = await Notification.requestPermission();
  }
  if (permission !== 'granted') return null;

  const serviceWorkerRegistration = await navigator.serviceWorker.register(buildServiceWorkerUrl());
  const app = getFirebaseApp();
  messagingInstance = getMessaging(app);

  const token = await getToken(messagingInstance, {
    vapidKey: firebaseVapidKey,
    serviceWorkerRegistration,
  });

  if (!token) return null;

  activeToken = token;
  await api.post('/notifications/fcm-token', { token, deviceType: 'WEB' });

  if (foregroundUnsubscribe) {
    foregroundUnsubscribe();
  }

  foregroundUnsubscribe = onMessage(messagingInstance, (payload: MessagePayload & FirebaseNotificationPayload) => {
    const title = payload.notification?.title || 'APMS notification';
    const body = payload.notification?.body || '';
    window.dispatchEvent(new CustomEvent('apms-fcm-message', {
      detail: { title, body, data: payload.data ?? {} },
    }));
  });

  return token;
};

export const unregisterFirebaseNotifications = async () => {
  if (!activeToken) return;
  const token = activeToken;
  activeToken = null;
  if (foregroundUnsubscribe) {
    foregroundUnsubscribe();
    foregroundUnsubscribe = null;
  }
  await api.delete('/notifications/fcm-token', {
    params: { token },
  }).catch(() => undefined);
};
