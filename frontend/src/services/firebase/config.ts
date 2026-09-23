import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyC9uH1fwtsX35gqutQh9p2AJHIPXCQPJNk',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'rti-black-hole.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'rti-black-hole',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'rti-black-hole.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '822716409825',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:822716409825:web:22d7faa3586fddc56f54a0',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-ZPP7HR1G1Z',
};

export const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);
