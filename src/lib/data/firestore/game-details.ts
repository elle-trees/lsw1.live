import { db } from "@/lib/firebase";
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  limit as firestoreLimit
} from "firebase/firestore";
import { GameDetailsConfig } from "@/types/database";
import { gameDetailsConfigConverter } from "./converters";

export const getGameDetailsConfigFirestore = async (): Promise<GameDetailsConfig | null> => {
  if (!db) return null;
  try {
    // There should be only one config document, but we query the collection
    const q = query(collection(db, "gameDetailsConfig").withConverter(gameDetailsConfigConverter), firestoreLimit(1));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      return snapshot.docs[0].data();
    }
    
    // Return default config if none exists
    return {
      id: "default",
      title: "LEGO Star Wars: The Video Game",
      subtitle: "2005",
      categories: ["LEGO Series", "Star Wars Series"],
      platforms: [
        { id: "gcn", label: "GCN", order: 1 },
        { id: "ps2", label: "PS2", order: 2 },
        { id: "xbox", label: "Xbox", order: 3 },
        { id: "pc", label: "PC", order: 4 },
      ],
      discordUrl: "https://discord.gg/6A5MNqaK49",
      headerLinks: [
        { id: "leaderboards", label: "Leaderboards", route: "/leaderboards", icon: "Trophy", color: "#a6e3a1", order: 1 },
        { id: "points", label: "Studs", route: "/points", icon: "LegoStud", color: "#fab387", order: 2 },
        { id: "submit", label: "Submit Run", route: "/submit", icon: "Upload", color: "#eba0ac", order: 3 },
        { id: "live", label: "Live", route: "/live", icon: "Radio", color: "#f38ba8", order: 4 },
        { id: "downloads", label: "Downloads", route: "/downloads", icon: "Download", color: "#cba6f7", order: 5 },
        { id: "stats", label: "Stats", route: "/stats", icon: "BarChart3", color: "#89b4fa", order: 6 },
        { id: "admin", label: "Admin", route: "/admin", icon: "ShieldAlert", color: "#f2cdcd", order: 7, adminOnly: true },
      ],
      navItems: [],
      visibleOnPages: ["/", "/leaderboards"],
      enabled: true,
    };
  } catch (error) {
    console.error("Error fetching game details config:", error);
    return null;
  }
};

export const updateGameDetailsConfigFirestore = async (config: GameDetailsConfig): Promise<boolean> => {
  if (!db) return false;
  try {
    // Check if config exists
    const q = query(collection(db, "gameDetailsConfig").withConverter(gameDetailsConfigConverter), firestoreLimit(1));
    const snapshot = await getDocs(q);
    
    let docRef;
    if (!snapshot.empty) {
      docRef = snapshot.docs[0].ref;
    } else {
      docRef = doc(collection(db, "gameDetailsConfig")).withConverter(gameDetailsConfigConverter);
    }
    
    // Ensure we don't save the ID as part of the data if using setDoc with merge or similar
    // The converter handles stripping ID on toFirestore
    await setDoc(docRef, config);
    return true;
  } catch (error) {
    console.error("Error updating game details config:", error);
    return false;
  }
};

