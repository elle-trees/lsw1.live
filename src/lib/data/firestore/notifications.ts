import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
  onSnapshot,
  Unsubscribe,
  QuerySnapshot
} from "firebase/firestore";
import { Notification } from "@/types/notifications";

const NOTIFICATIONS_COLLECTION = "notifications";

export const createNotificationFirestore = async (
  notification: Omit<Notification, "id" | "createdAt" | "read">
): Promise<string | null> => {
  if (!db) return null;
  try {
    const newDocRef = doc(collection(db, NOTIFICATIONS_COLLECTION));
    const newNotification: Notification = {
      id: newDocRef.id,
      ...notification,
      read: false,
      createdAt: new Date().toISOString(),
    };
    await setDoc(newDocRef, newNotification);
    return newDocRef.id;
  } catch (error) {
    console.error("Error creating notification:", error);
    return null;
  }
};

export const getUserNotificationsFirestore = async (userId: string, limitCount: number = 20): Promise<Notification[]> => {
  if (!db) return [];
  try {
    const q = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => doc.data() as Notification);
  } catch (error) {
    console.error("Error fetching user notifications:", error);
    return [];
  }
};

export const getUnreadUserNotificationsFirestore = async (userId: string): Promise<Notification[]> => {
  if (!db) return [];
  try {
    // Query without orderBy to avoid requiring a composite index
    // We'll sort client-side instead
    const q = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where("userId", "==", userId),
      where("read", "==", false)
    );
    const snapshot = await getDocs(q);
    const notifications = snapshot.docs.map((doc) => doc.data() as Notification);
    // Sort by createdAt descending client-side
    return notifications.sort((a, b) => {
      const aTime = new Date(a.createdAt || 0).getTime();
      const bTime = new Date(b.createdAt || 0).getTime();
      return bTime - aTime;
    });
  } catch (error: any) {
    // Only log if it's not an index error to avoid spam
    if (error?.code !== 'failed-precondition' && !error?.message?.includes('index')) {
      console.error("Error fetching unread user notifications:", error);
    }
    return [];
  }
};

export const markNotificationAsReadFirestore = async (notificationId: string): Promise<boolean> => {
  if (!db) return false;
  try {
    const docRef = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
    await updateDoc(docRef, { read: true });
    return true;
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return false;
  }
};

export const markAllNotificationsAsReadFirestore = async (userId: string): Promise<boolean> => {
  if (!db) return false;
  try {
    // We need to get all unread notifications first
    const q = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where("userId", "==", userId),
      where("read", "==", false)
    );
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return true;

    const batch = writeBatch(db);
    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, { read: true });
    });
    await batch.commit();
    return true;
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return false;
  }
};

export const deleteNotificationFirestore = async (notificationId: string): Promise<boolean> => {
  if (!db) return false;
  try {
    await deleteDoc(doc(db, NOTIFICATIONS_COLLECTION, notificationId));
    return true;
  } catch (error) {
    console.error("Error deleting notification:", error);
    return false;
  }
};

/**
 * Subscribe to real-time updates for user notifications
 * @param userId - The user ID to get notifications for
 * @param callback - Callback function that receives the notifications array
 * @param limitCount - Maximum number of notifications to return (default: 20)
 * @returns Unsubscribe function to stop listening
 */
export const subscribeToUserNotificationsFirestore = (
  userId: string,
  callback: (notifications: Notification[]) => void,
  limitCount: number = 20
): Unsubscribe | null => {
  if (!db) return null;
  try {
    const q = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );
    
    return onSnapshot(q, (snapshot: QuerySnapshot) => {
      const notifications = snapshot.docs.map((doc) => doc.data() as Notification);
      callback(notifications);
    }, (error) => {
      console.error("Error in notifications subscription:", error);
      callback([]);
    });
  } catch (error) {
    console.error("Error setting up notifications subscription:", error);
    return null;
  }
};

/**
 * Subscribe to real-time updates for unread user notifications
 * @param userId - The user ID to get unread notifications for
 * @param callback - Callback function that receives the notifications array
 * @returns Unsubscribe function to stop listening
 */
export const subscribeToUnreadUserNotificationsFirestore = (
  userId: string,
  callback: (notifications: Notification[]) => void
): Unsubscribe | null => {
  if (!db) return null;
  try {
    const q = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where("userId", "==", userId),
      where("read", "==", false)
    );
    
    return onSnapshot(q, (snapshot: QuerySnapshot) => {
      const notifications = snapshot.docs.map((doc) => doc.data() as Notification);
      // Sort by createdAt descending client-side
      const sorted = notifications.sort((a, b) => {
        const aTime = new Date(a.createdAt || 0).getTime();
        const bTime = new Date(b.createdAt || 0).getTime();
        return bTime - aTime;
      });
      callback(sorted);
    }, (error: any) => {
      // Only log if it's not an index error to avoid spam
      if (error?.code !== 'failed-precondition' && !error?.message?.includes('index')) {
        console.error("Error in unread notifications subscription:", error);
      }
      callback([]);
    });
  } catch (error: any) {
    // Only log if it's not an index error
    if (error?.code !== 'failed-precondition' && !error?.message?.includes('index')) {
      console.error("Error setting up unread notifications subscription:", error);
    }
    return null;
  }
};

