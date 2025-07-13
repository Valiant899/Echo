
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
  where
} from "firebase/firestore";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBJYbwpkUyHnx84sggz8yR6B4i-q0AakL8",
  authDomain: "echo-7ea46.firebaseapp.com",
  projectId: "echo-7ea46",
  storageBucket: "echo-7ea46.appspot.com", // Ensure this matches your Firebase Console
  messagingSenderId: "79053431009",
  appId: "1:79053431009:web:b812ebb895a33efba417a0",
  measurementId: "G-KYJ355BPXH"
};
// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services with enhanced error handling
let analytics;
let db;
let auth;
let storage;

try {
  analytics = typeof window !== "undefined" ? getAnalytics(app) : null;
  db = getFirestore(app);
  auth = getAuth(app);
  storage = getStorage(app);
  
  // Configure auth persistence
  if (typeof window !== "undefined") {
    setPersistence(auth, browserLocalPersistence)
      .then(() => console.debug("Auth persistence enabled"))
      .catch((err) => console.error("Auth persistence error:", err));
  }
} catch (error) {
  console.error("Firebase initialization error:", error);
  throw new Error("Failed to initialize Firebase services");
}

// Debug exports (development only)
if (import.meta.env.MODE === 'development') {
  console.debug("Firebase services initialized:", { 
    app: !!app, 
    auth: !!auth, 
    db: !!db,
    storage: !!storage,
    firestoreFunctions: {
      collection: typeof collection === 'function',
      doc: typeof doc === 'function',
      getDocs: typeof getDocs === 'function',
      query: typeof query === 'function',
      where: typeof where === 'function',
      updateDoc: typeof updateDoc === 'function',
      deleteDoc: typeof deleteDoc === 'function'
    }
  });
}

// Export all services and functions
export { 
  app, 
  analytics, 
  db, 
  auth,
  storage,
  // Firestore functions
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
  where
};