"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { auth } from "@/lib/firebase";
import { getPlayerByUid, createPlayer, startRealtimeAutoclaiming, stopRealtimeAutoclaiming } from "@/lib/db";
import { CustomUser } from "@/types/database";
import type { User } from "firebase/auth";

interface AuthContextType {
  currentUser: CustomUser | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ currentUser: null, loading: true });

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<CustomUser | null>(null);
  const [loading, setLoading] = useState(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const refreshPlayerData = async (user: User) => {
    try {
      const playerData = await getPlayerByUid(user.uid);
      if (playerData) {
        const isAdmin = Boolean(playerData.isAdmin);
        setCurrentUser(prev => {
          if (prev && prev.uid === user.uid && prev.isAdmin === isAdmin) {
            return prev;
          }
          return {
            ...user,
            isAdmin: isAdmin,
            displayName: playerData.displayName || user.displayName || "",
            email: playerData.email || user.email || "",
          };
        });
      }
    } catch (error) {
      // Silent fail - continue with existing user data
    }
  };

  useEffect(() => {
    if (!auth || typeof auth.onAuthStateChanged !== 'function') {
      setLoading(false);
      return;
    }

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
      
      // Stop real-time autoclaiming when user logs out
      if (!user) {
        stopRealtimeAutoclaiming();
      }

      if (user) {
        const customUser: CustomUser = {
          ...user,
          isAdmin: false,
          displayName: user.displayName,
          email: user.email,
        };
        setCurrentUser(customUser);
        setLoading(false);
        
        // Fetch player data asynchronously without blocking
        (async () => {
          try {
            const playerData = await getPlayerByUid(user.uid);
            if (playerData) {
              const isAdmin = Boolean(playerData.isAdmin);
              
              setCurrentUser(prev => {
                if (!prev || prev.uid !== user.uid) return prev;
                return {
                  ...user,
                  isAdmin: isAdmin,
                  displayName: playerData.displayName || user.displayName || "",
                  email: playerData.email || user.email || "",
                };
              });
            } else {
              // Player document doesn't exist - create it in Firestore
              // Use Firebase Auth data as fallback, but prefer Firestore as source of truth
              const today = new Date().toISOString().split('T')[0];
              const finalDisplayName = user.displayName || user.email?.split('@')[0] || "Player";
              
              // Create player document in Firestore - all user data stored securely here
              const newPlayer = {
                uid: user.uid,
                displayName: finalDisplayName,
                email: user.email || "",
                joinDate: today,
                totalRuns: 0,
                bestRank: null,
                favoriteCategory: null,
                favoritePlatform: null,
                nameColor: "#cba6f7",
                isAdmin: false,
                // srcUsername will be set by user in settings if needed
              };
              createPlayer(newPlayer).catch(() => {});
            }
          } catch (error) {
            // Silent fail - user is already logged in
          }
          
          // Start refresh interval after initial data fetch
          // Only refresh every 5 minutes - player data doesn't change frequently
          if (refreshIntervalRef.current) {
            clearInterval(refreshIntervalRef.current);
          }
          refreshIntervalRef.current = setInterval(() => {
            refreshPlayerData(user);
          }, 300000); // 5 minutes instead of 3 seconds
          
          // Start real-time autoclaiming listeners
          // This will automatically claim runs when:
          // 1. New imported runs are created (matching srcPlayerName to srcUsername)
          // 2. Players update their srcUsername (claims matching unclaimed runs)
          startRealtimeAutoclaiming();
        })();
      } else {
        setCurrentUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      // Stop real-time autoclaiming when component unmounts
      stopRealtimeAutoclaiming();
    };
  }, []);

  const value = {
    currentUser,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};