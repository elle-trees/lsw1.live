import { useState, useEffect, useRef } from "react";
import { FadeIn } from "@/components/ui/fade-in";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, ExternalLink } from "lucide-react";
import { getAllVerifiedRuns, subscribeToRecentRuns } from "@/lib/db";
import { LeaderboardEntry } from "@/types/database";
import type { Unsubscribe } from "firebase/firestore";
import { RecentRuns } from "@/components/RecentRuns";
import TwitchEmbed from "@/components/TwitchEmbed";
import { parseTimeToSeconds, cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { buttonVariants } from "@/components/ui/button";
import { AnimatedCard } from "@/components/ui/animated-card";
import { fadeSlideUpVariants, scaleVariants, buttonVariants as motionButtonVariants, transitions } from "@/lib/animations";
import { pageCache } from "@/lib/pageCache";
import { PrefetchLink } from "@/components/PrefetchLink";

const MotionLink = motion(PrefetchLink);

const CACHE_KEY_RECENT_RUNS = "index-recent-runs";
const CACHE_KEY_STATS = "index-stats";

// Format seconds into months, days, hours, minutes, seconds in compact format
const formatTimeWithDays = (totalSeconds: number): string => {
  const months = Math.floor(totalSeconds / (30 * 86400)); // Approximate 30 days per month
  const days = Math.floor((totalSeconds % (30 * 86400)) / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  const parts: string[] = [];
  
  if (months > 0) {
    parts.push(`${months}M`);
  }
  if (days > 0) {
    parts.push(`${days}D`);
  }
  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (minutes > 0) {
    parts.push(`${minutes}m`);
  }
  if (seconds > 0 || parts.length === 0) {
    parts.push(`${seconds}s`);
  }
  
  return parts.join(' ');
};

const Index = () => {
  // Check cache first for instant display
  const cachedRecentRuns = pageCache.get<LeaderboardEntry[]>(CACHE_KEY_RECENT_RUNS);
  const cachedStats = pageCache.get<{ totalVerifiedRuns: number; totalTime: string }>(CACHE_KEY_STATS);
  
  const [recentRunsData, setRecentRunsData] = useState<LeaderboardEntry[]>(cachedRecentRuns || []);
  const [loading, setLoading] = useState(!cachedRecentRuns);
  const [totalVerifiedRuns, setTotalVerifiedRuns] = useState<number>(cachedStats?.totalVerifiedRuns || 0);
  const [totalTime, setTotalTime] = useState<string>(cachedStats?.totalTime || "00:00:00");
  const [statsLoading, setStatsLoading] = useState(!cachedStats);
  const [isLive, setIsLive] = useState<boolean | null>(null);
  const lastRefreshTimeRef = useRef<number>(Date.now());
  const channel = 'lsw1live';

  // Set up real-time listener for recent runs
  useEffect(() => {
    // Use cached data immediately if available
    if (cachedRecentRuns && cachedRecentRuns.length > 0) {
      setRecentRunsData(cachedRecentRuns);
      setLoading(false);
    }

    // Subscribe to real-time updates
    const unsubscribe = subscribeToRecentRuns((runs) => {
      setRecentRunsData(runs);
      setLoading(false);
      // Update cache for instant navigation
      pageCache.set(CACHE_KEY_RECENT_RUNS, runs, 1000 * 60 * 2); // 2 minutes
    }, 20);

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      setStatsLoading(true);
      try {
        // Use optimized aggregation queries for better performance
        const { getVerifiedRunsStatsFirestore } = await import("@/lib/data/firestore/stats");
        const { count, totalTime: totalSeconds } = await getVerifiedRunsStatsFirestore();
        
        setTotalVerifiedRuns(count);
        const formattedTime = formatTimeWithDays(totalSeconds);
        setTotalTime(formattedTime);
        
        // Cache stats for instant navigation
        pageCache.set(CACHE_KEY_STATS, {
          totalVerifiedRuns: count,
          totalTime: formattedTime,
        }, 1000 * 60 * 10); // 10 minutes
      } catch (_error) {
        // Fallback to old method if aggregation queries fail
        try {
          const verifiedRuns = await getAllVerifiedRuns();
          const totalRuns = verifiedRuns.length;
          setTotalVerifiedRuns(totalRuns);
          
          const totalSeconds = verifiedRuns.reduce((sum, run) => {
            return sum + parseTimeToSeconds(run.time);
          }, 0);
          const formattedTime = formatTimeWithDays(totalSeconds);
          setTotalTime(formattedTime);
          
          pageCache.set(CACHE_KEY_STATS, {
            totalVerifiedRuns: totalRuns,
            totalTime: formattedTime,
          }, 1000 * 60 * 10);
        } catch (fallbackError) {
          // Silent fail
        }
      } finally {
        setStatsLoading(false);
      }
    };

    // Only fetch if not in cache
    if (!cachedStats) {
      fetchStats();
    }
  }, [cachedStats]);

  useEffect(() => {
    // Check if stream is live
    const checkStreamStatus = async () => {
      try {
        // Use proxy API endpoint which returns "live" or "offline"
        const response = await fetch(`/api/twitch/status?username=${encodeURIComponent(channel)}`);
        
        if (!response.ok) {
          setIsLive(false);
          return;
        }
        
        const data = await response.text();
        const trimmedData = data.trim().toLowerCase();
        
        // The status endpoint should return "live" or "offline"
        if (trimmedData === 'live') {
          setIsLive(true);
        } else if (trimmedData === 'offline') {
          setIsLive(false);
        } else {
          // If response is unexpected, default to offline for safety
          setIsLive(false);
        }
      } catch (_error) {
        // Default to offline on error
        setIsLive(false);
      }
    };

    // Check immediately
    checkStreamStatus();

    // Check every 30 seconds
    const interval = setInterval(checkStreamStatus, 30000);

    return () => clearInterval(interval);
  }, [channel]);

  return (
    <div className="min-h-screen text-ctp-text overflow-x-hidden relative">
      <FadeIn className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1920px] mx-auto w-full">
          {/* Top Row - Stats Cards and Title */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8 mb-6 lg:mb-8">
            {/* Left Side - Verified Runs Card */}
            <div className="lg:col-span-3 lg:order-1 min-w-0">
              <AnimatedCard 
                className="glass shadow-colored-green border-ctp-surface1/50 w-full group overflow-hidden relative rounded-none"
                delay={0.1}
              >
                <CardHeader className="pb-2 pt-4 px-4 relative z-10">
                  <CardTitle className="flex items-center gap-2 text-card-foreground text-base sm:text-lg lg:text-xl whitespace-nowrap">
                    <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-ctp-green flex-shrink-0" />
                    <span className="truncate font-semibold">Verified Runs</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-2 relative z-10">
                  {statsLoading ? (
                    <Skeleton className="h-10 w-28 mb-1 bg-ctp-surface0/50" />
                  ) : (
                    <div className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-ctp-green transition-all duration-300 break-words min-w-0">
                      {totalVerifiedRuns.toLocaleString()}
                    </div>
                  )}
                  <p className="text-xs sm:text-sm lg:text-base text-muted-foreground mt-1.5 whitespace-nowrap">
                    Total verified speedruns
                  </p>
                  <div className="mt-2">
                    <Badge variant="outline" className="border-green-600/50 bg-green-600/10 text-green-400 text-xs px-2 py-0.5 flex items-center gap-1.5 w-fit">
                      <CheckCircle className="h-3 w-3" />
                      <span>Linked with Speedrun.com</span>
                      <a
                        href="https://www.speedrun.com/lsw1"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Badge>
                  </div>
                </CardContent>
              </AnimatedCard>
            </div>

            {/* Center Content - Title, Subtext, Buttons */}
            <motion.div 
              className="lg:col-span-6 text-center lg:order-2 min-w-0"
              variants={fadeSlideUpVariants}
              initial="hidden"
              animate="visible"
              transition={{ ...transitions.spring, delay: 0.2 }}
            >
              <motion.h1 
                className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 whitespace-nowrap truncate"
                variants={scaleVariants}
                initial="hidden"
                animate="visible"
                transition={{ ...transitions.spring, delay: 0.3 }}
              >
                <span className="text-[#74c7ec]">
                  lsw1.dev
                </span>
              </motion.h1>
              <motion.p 
                className="text-lg sm:text-xl md:text-2xl lg:text-3xl mb-10 text-ctp-subtext1 max-w-3xl mx-auto px-2 leading-relaxed"
                variants={fadeSlideUpVariants}
                initial="hidden"
                animate="visible"
                transition={{ ...transitions.spring, delay: 0.4 }}
              >
                The official site for the LEGO Star Wars: The Video Game speedrunning community. Track your progress and try to earn a stud on the leaderboards!
              </motion.p>
              <motion.div 
                className="flex flex-col sm:flex-row justify-center gap-4 lg:gap-6 px-2"
                variants={fadeSlideUpVariants}
                initial="hidden"
                animate="visible"
                transition={{ ...transitions.spring, delay: 0.5 }}
              >
                <MotionLink 
                  to="/submit"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "bg-gradient-to-r from-ctp-mauve via-ctp-pink to-ctp-mauve text-ctp-crust font-bold animate-gradient bg-[length:200%_auto] whitespace-nowrap text-base sm:text-lg lg:text-xl px-6 sm:px-8 lg:px-10 py-6 sm:py-7 lg:py-8 rounded-none border-0 shadow-colored"
                  )}
                  variants={motionButtonVariants}
                  initial="rest"
                  whileHover="hover"
                  whileTap="tap"
                >
                  Submit Run
                </MotionLink>
                <MotionLink 
                  to="/leaderboards"
                  className={cn(
                    buttonVariants({ size: "lg", variant: "outline" }),
                    "text-ctp-text border-ctp-surface1/50 bg-glass whitespace-nowrap text-base sm:text-lg lg:text-xl px-6 sm:px-8 lg:px-10 py-6 sm:py-7 lg:py-8 rounded-none backdrop-blur-sm"
                  )}
                  variants={motionButtonVariants}
                  initial="rest"
                  whileHover="hover"
                  whileTap="tap"
                >
                  View All Leaderboards
                </MotionLink>
              </motion.div>
            </motion.div>

            {/* Right Side - Total Time Card */}
            <div className="lg:col-span-3 lg:order-3 min-w-0">
              <AnimatedCard 
                className="glass shadow-colored border-ctp-surface1/50 w-full group overflow-hidden relative rounded-none"
                delay={0.1}
              >
                <CardHeader className="pb-2 pt-4 px-4 relative z-10">
                  <CardTitle className="flex items-center gap-2 text-card-foreground text-base sm:text-lg lg:text-xl whitespace-nowrap">
                    <Clock className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-ctp-mauve flex-shrink-0" />
                    <span className="truncate font-semibold">Total Time</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-2 relative z-10">
                  {statsLoading ? (
                    <Skeleton className="h-10 w-36 mb-1 bg-ctp-surface0/50" />
                  ) : (
                    <div className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-ctp-text transition-all duration-300 break-words min-w-0 leading-tight">
                      {totalTime}
                    </div>
                  )}
                  <p className="text-xs sm:text-sm lg:text-base text-muted-foreground mt-1.5 whitespace-nowrap">
                    Combined runtime
                  </p>
                </CardContent>
              </AnimatedCard>
            </div>
          </div>

          {/* Bottom Row - Twitch Embed and Recent Runs */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8 items-stretch">
            {/* Left Side - Twitch Embed (under Verified Runs) - Only show when live */}
            {isLive === true && (
              <div className="lg:col-span-8 min-w-0 flex flex-col">
                <TwitchEmbed channel={channel} />
              </div>
            )}

            {/* Right Side - Recent Runs */}
            <div className={`${isLive === true ? 'lg:col-span-4' : 'lg:col-span-12'} min-w-0 flex flex-col`}>
              <div className="mb-3 flex-shrink-0">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold mb-1.5 text-ctp-text">
                  Recent Runs
                </h2>
                <p className="text-sm lg:text-base text-ctp-subtext1">
                  Latest submissions
                </p>
              </div>

              <div className="flex-1 min-h-0 flex flex-col">
                <style>{`
                  .homepage-recent-runs [class*="CardContent"] { padding: 0.75rem !important; }
                  .homepage-recent-runs [class*="space-y-5"] > * + * { margin-top: 0.5rem !important; }
                  .homepage-recent-runs div[class*="p-6"], .homepage-recent-runs div[class*="p-8"] { padding: 0.75rem !important; }
                  .homepage-recent-runs .text-xl { font-size: 1rem !important; }
                  .homepage-recent-runs .text-2xl { font-size: 1.25rem !important; }
                  .homepage-recent-runs div[class*="min-w-"] { min-width: 180px !important; }
                  .homepage-recent-runs .text-sm { font-size: 0.625rem !important; }
                  .homepage-recent-runs span[class*="px-3"] { padding-left: 0.375rem !important; padding-right: 0.375rem !important; }
                  .homepage-recent-runs span[class*="py-1"] { padding-top: 0.125rem !important; padding-bottom: 0.125rem !important; }
                  .homepage-recent-runs div[class*="gap-8"] { gap: 1rem !important; }
                  .homepage-recent-runs div[class*="gap-6"] { gap: 0.5rem !important; }
                  .homepage-recent-runs div[class*="gap-3"] { gap: 0.375rem !important; }
                  .homepage-recent-runs .mb-3 { margin-bottom: 0.5rem !important; }
                  .homepage-recent-runs .mb-2 { margin-bottom: 0.25rem !important; }
                  .homepage-recent-runs .mt-2 { margin-top: 0.25rem !important; }
                  .homepage-recent-runs a[class*="text-xl"] { font-size: 1.125rem !important; font-weight: 700 !important; }
                  .homepage-recent-runs a[class*="text-2xl"] { font-size: 1.375rem !important; font-weight: 700 !important; }
                  .homepage-recent-runs p[class*="text-xl"] { font-size: 1.125rem !important; }
                  .homepage-recent-runs p[class*="text-2xl"] { font-size: 1.375rem !important; }
                `}</style>
                <div className="homepage-recent-runs [&_header]:hidden h-full flex-1 min-h-0">
                  <RecentRuns runs={recentRunsData} loading={loading} showRankBadge={false} />
                </div>
              </div>

              <div className="mt-4 text-center flex-shrink-0">
                <MotionLink 
                  to="/leaderboards"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "text-sm lg:text-base text-ctp-text border-ctp-surface1/50 bg-glass whitespace-nowrap px-4 lg:px-6 py-2 lg:py-3 rounded-none backdrop-blur-sm"
                  )}
                  variants={motionButtonVariants}
                  initial="rest"
                  whileHover="hover"
                  whileTap="tap"
                >
                  View Full Leaderboards
                </MotionLink>
              </div>
            </div>
          </div>
        </div>
      </FadeIn>
    </div>
  );
};

export default Index;