import { Suspense, lazy, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import { GameDetails } from "@/components/GameDetails";
import { AuthProvider } from "@/components/AuthProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PageTransition } from "@/components/ui/page-transition";
import { initializeRoutePrefetches } from "@/lib/prefetch";

const Index = lazy(() => import("./pages/Index"));
const Leaderboards = lazy(() => import("./pages/Leaderboards"));
const PointsLeaderboard = lazy(() => import("./pages/PointsLeaderboard"));
const SubmitRun = lazy(() => import("./pages/SubmitRun"));
const PlayerDetails = lazy(() => import("./pages/PlayerDetails"));
const RunDetails = lazy(() => import("./pages/RunDetails"));
const UserSettings = lazy(() => import("./pages/UserSettings"));
const Admin = lazy(() => import("./pages/Admin"));
const Live = lazy(() => import("./pages/Live"));
const Downloads = lazy(() => import("./pages/Downloads"));
const Stats = lazy(() => import("./pages/Stats"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (replaces cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

const App = () => {
  // Initialize prefetch system on mount
  useEffect(() => {
    initializeRoutePrefetches();
  }, []);

  // Initialize real-time points system
  useEffect(() => {
    (async () => {
      // Initialize points config subscription for real-time updates
      const { initializePointsConfigSubscription } = await import("@/lib/utils");
      initializePointsConfigSubscription();

      // Start the points recalculation service (listens for config changes)
      const { 
        startPointsRecalculationService,
        startRankUpdateService 
      } = await import("@/lib/data/firestore/points-realtime");
      startPointsRecalculationService();
      startRankUpdateService();
    })();

    // Cleanup on unmount
    return () => {
      (async () => {
        const { 
          stopPointsRecalculationService,
          stopRankUpdateService 
        } = await import("@/lib/data/firestore/points-realtime");
        stopPointsRecalculationService();
        stopRankUpdateService();
      })();
    };
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <div className="flex flex-col min-h-screen bg-[#1e1e2e]">
                <GameDetails />
                <main className="flex-grow bg-[#1e1e2e]">
                  <Suspense fallback={null}>
                    <Routes>
                      <Route element={<PageTransition />}>
                        <Route path="/" element={<Index />} />
                        <Route path="/leaderboards" element={<Leaderboards />} />
                        <Route path="/points" element={<PointsLeaderboard />} />
                        <Route path="/submit" element={<SubmitRun />} />
                        <Route path="/player/:playerId" element={<PlayerDetails />} />
                        <Route path="/run/:runId" element={<RunDetails />} />
                        <Route path="/settings" element={<UserSettings />} />
                        <Route path="/admin" element={<Admin />} />
                        <Route path="/live" element={<Live />} />
                        <Route path="/downloads" element={<Downloads />} />
                        <Route path="/stats" element={<Stats />} />
                        <Route path="*" element={<NotFound />} />
                      </Route>
                    </Routes>
                  </Suspense>
                </main>
              </div>
            </BrowserRouter>
            <Analytics />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;