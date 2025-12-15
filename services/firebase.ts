import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDx1qGAu862CxjtbYuj6JAiLX9flvukDw4",
  authDomain: "lolaventasonline.firebaseapp.com",
  projectId: "lolaventasonline",
  storageBucket: "lolaventasonline.firebasestorage.app",
  messagingSenderId: "323355322280",
  appId: "1:323355322280:web:b9a78336de7da6af519f9d"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);