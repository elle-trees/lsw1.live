import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

/**
 * Firebase configuration loaded from environment variables
 * All values must be set in .env file or deployment environment
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  const errorMsg = "Missing required Firebase configuration. Please check your environment variables.";
  throw new Error(errorMsg);
}

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

app = initializeApp(firebaseConfig);
auth = getAuth(app);
db = getFirestore(app);

export { auth, db };
export default app;