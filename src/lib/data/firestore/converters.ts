import { QueryDocumentSnapshot, SnapshotOptions, DocumentData, FirestoreDataConverter } from "firebase/firestore";
import { Player, LeaderboardEntry, Category, Platform, Level, DownloadEntry, PointsConfig, Subcategory } from "@/types/database";

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

export const playerConverter: FirestoreDataConverter<Player> = genericConverter<Player>();
export const leaderboardEntryConverter: FirestoreDataConverter<LeaderboardEntry> = genericConverter<LeaderboardEntry>();
export const categoryConverter: FirestoreDataConverter<Category> = genericConverter<Category>();
export const platformConverter: FirestoreDataConverter<Platform> = genericConverter<Platform>();
export const levelConverter: FirestoreDataConverter<Level> = genericConverter<Level>();
export const downloadEntryConverter: FirestoreDataConverter<DownloadEntry> = genericConverter<DownloadEntry>();
export const pointsConfigConverter: FirestoreDataConverter<PointsConfig> = genericConverter<PointsConfig>();
export const subcategoryConverter: FirestoreDataConverter<Subcategory> = genericConverter<Subcategory>();
