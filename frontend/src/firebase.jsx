// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { 
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  onSnapshot,
  serverTimestamp,
  query,
  where,
  orderBy,
  Timestamp
} from "firebase/firestore";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFunctions, httpsCallable } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyBJYbwpkUyHnx84sggz8yR6B4i-q0AakL8",
  authDomain: "echo-7ea46.firebaseapp.com",
  projectId: "echo-7ea46",
  storageBucket: "echo-7ea46.firebasestorage.app",
  messagingSenderId: "79053431009",
  appId: "1:79053431009:web:b812ebb895a33efba417a0",
  measurementId: "G-KYJ355BPXH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app, "gs://echo-7ea46.firebasestorage.app");
const functions = getFunctions(app);

// Set auth persistence (client-side only)
if (typeof window !== "undefined") {
  setPersistence(auth, browserLocalPersistence)
    .catch((err) => console.error("Auth persistence error:", err));
}

// Export all Firebase services and utilities
export {
  app,
  analytics,
  db,
  auth,
  storage,
  functions,
  httpsCallable,
  // Firestore utilities
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  onSnapshot,
  serverTimestamp,
  query,
  where,
  orderBy,
  Timestamp
};