import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: 'AIzaSyDx1qGAu862CxjtbYuj6JAiLX9flvukDw4', // IMPORTANT: Ensure this is YOUR actual Firebase API key
  authDomain: 'lolaventasonline.firebaseapp.com',
  projectId: 'lolaventasonline',
  storageBucket: 'lolaventasonline.firebasestorage.app',
  messagingSenderId: '323355322280',
  appId: '1:323355322280:web:b9a78336de7da6af519f9d',
};

let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
  console.log('Firebase initialized successfully.');
} else {
  // If an app already exists (e.g., during hot-reloads in development), retrieve it.
  app = getApps()[0];
}

export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);