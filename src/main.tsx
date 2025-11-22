import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";
import { setPlayerAdminStatus } from "./lib/db";
import { auth } from "./lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

const ADMIN_UID = import.meta.env.VITE_ADMIN_UID;

// Automatically set admin status for the configured admin UID
onAuthStateChanged(auth, async (user) => {
  if (user && ADMIN_UID && user.uid === ADMIN_UID) {
    try {
      await setPlayerAdminStatus(ADMIN_UID, true);
    } catch (_error) {
      // Silent fail - admin status will be set on next auth check
    }
  }
});

createRoot(document.getElementById("root")!).render(<App />);
