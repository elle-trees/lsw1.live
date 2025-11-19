import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { GameDetails, GameLink } from "@/types/database";
import { gameDetailsConverter } from "./converters";

const GAME_DETAILS_COLLECTION = "gameDetails";
const MAIN_DOC_ID = "main";

export const getGameDetailsFirestore = async (): Promise<GameDetails | null> => {
  if (!db) return null;
  try {
    const docRef = doc(db, GAME_DETAILS_COLLECTION, MAIN_DOC_ID).withConverter(gameDetailsConverter);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
    
    // Initialize default if not exists
    const defaultDetails: GameDetails = {
      id: MAIN_DOC_ID,
      title: "LEGO Star Wars: The Video Game",
      description: "The official site for the LEGO Star Wars: The Video Game speedrunning community. Track your progress and try to earn a stud on the leaderboards!",
      coverImage: "/cover.png", // Default or placeholder
      buttons: [
        { id: "submit", label: "Submit Run", url: "/submit", order: 0 },
        { id: "studs", label: "Studs", url: "/points", order: 1 },
        { id: "downloads", label: "Downloads", url: "/downloads", order: 2 },
        { id: "stats", label: "Stats", url: "/stats", order: 3 },
      ]
    };
    
    await setDoc(docRef, defaultDetails);
    return defaultDetails;

  } catch (error) {
    console.error("Error getting game details:", error);
    return null;
  }
};

export const updateGameDetailsFirestore = async (data: Partial<GameDetails>): Promise<boolean> => {
  if (!db) return false;
  try {
    const docRef = doc(db, GAME_DETAILS_COLLECTION, MAIN_DOC_ID).withConverter(gameDetailsConverter);
    await setDoc(docRef, data as GameDetails, { merge: true });
    return true;
  } catch (error) {
    console.error("Error updating game details:", error);
    return false;
  }
};

