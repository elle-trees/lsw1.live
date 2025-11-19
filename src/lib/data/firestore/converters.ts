import { QueryDocumentSnapshot, SnapshotOptions, DocumentData, FirestoreDataConverter } from "firebase/firestore";
import { Player, LeaderboardEntry, Category, Platform, Level, DownloadEntry, PointsConfig, Subcategory, GameDetailsConfig } from "@/types/database";

const genericConverter = <T extends { id: string }>() => ({
  toFirestore(data: T): DocumentData {
    const { id, ...rest } = data;
    return rest;
  },
  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): T {
    const data = snapshot.data(options);
    return {
      id: snapshot.id,
      ...data,
    } as T;
  },
});

// Helper function to remove undefined values from an object recursively
const removeUndefined = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return null;
  }
  if (Array.isArray(obj)) {
    return obj.map(removeUndefined).filter(item => item !== undefined);
  }
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const key in obj) {
      if (obj[key] !== undefined) {
        cleaned[key] = removeUndefined(obj[key]);
      }
    }
    return cleaned;
  }
  return obj;
};

export const playerConverter: FirestoreDataConverter<Player> = genericConverter<Player>();
export const leaderboardEntryConverter: FirestoreDataConverter<LeaderboardEntry> = genericConverter<LeaderboardEntry>();
export const categoryConverter: FirestoreDataConverter<Category> = genericConverter<Category>();
export const platformConverter: FirestoreDataConverter<Platform> = genericConverter<Platform>();
export const levelConverter: FirestoreDataConverter<Level> = genericConverter<Level>();
export const downloadEntryConverter: FirestoreDataConverter<DownloadEntry> = genericConverter<DownloadEntry>();
export const pointsConfigConverter: FirestoreDataConverter<PointsConfig> = genericConverter<PointsConfig>();
export const subcategoryConverter: FirestoreDataConverter<Subcategory> = genericConverter<Subcategory>();

// Custom converter for GameDetailsConfig that removes undefined values
export const gameDetailsConfigConverter: FirestoreDataConverter<GameDetailsConfig> = {
  toFirestore(data: GameDetailsConfig): DocumentData {
    const { id, ...rest } = data;
    // Remove undefined values before saving
    return removeUndefined(rest);
  },
  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): GameDetailsConfig {
    const data = snapshot.data(options);
    return {
      id: snapshot.id,
      ...data,
    } as GameDetailsConfig;
  },
};
