
import { getLeaderboardEntriesFirestore } from "./src/lib/data/firestore/leaderboards";
import { db } from "./src/lib/firebase";
import { collection, getDocs, limit, query } from "firebase/firestore";

async function test() {
  console.log("Starting test...");
  try {
    // Test raw fetch
    console.log("Testing raw fetch...");
    const q = query(collection(db, "leaderboardEntries"), limit(5));
    const snap = await getDocs(q);
    console.log(`Raw fetch found ${snap.size} docs.`);
    snap.docs.forEach(d => console.log("Doc:", d.id, d.data()));

    // Test function
    console.log("Testing getLeaderboardEntriesFirestore...");
    const entries = await getLeaderboardEntriesFirestore();
    console.log(`getLeaderboardEntriesFirestore found ${entries.length} entries.`);
    if (entries.length > 0) {
        console.log("First entry:", entries[0]);
    } else {
        console.log("No entries found via function.");
    }
  } catch (e) {
    console.error("Error:", e);
  }
  process.exit(0);
}

test();
