import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getFirebaseConfig } from "./env";

/**
 * Firebase configuration loaded from validated environment variables
 * All values are validated at module load time via env.ts
 */
const firebaseConfig = getFirebaseConfig();

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

app = initializeApp(firebaseConfig);
auth = getAuth(app);
db = getFirestore(app);

export { auth, db };
export default app;