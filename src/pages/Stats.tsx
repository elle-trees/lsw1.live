"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, AnimatedTabsList, AnimatedTabsTrigger } from "@/components/ui/animated-tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Trophy, 
  Clock, 
  Users, 
  Gamepad2, 
  BarChart3,
  Award,
  Star,
  Gem,
  CalendarDays
} from "lucide-react";
import { getAllVerifiedRuns, getCategories, getPlatforms, getLevels, runTypes } from "@/lib/db";
import { LeaderboardEntry, Player } from "@/types/database";
import { formatTime, parseTimeToSeconds, formatSecondsToTime } from "@/lib/utils";
import { getCategoryName, getPlatformName, getLevelName } from "@/lib/dataValidation";
import { Link } from "@tanstack/react-router";
import { FadeIn } from "@/components/ui/fade-in";
import { lazy, Suspense } from "react";

// Lazy load the chart component to reduce initial bundle size
const WRProgressionChart = lazy(() => import("@/components/WRProgressionChart").then(m => ({ default: m.WRProgressionChart })));

// Category name overrides for stats page
const CATEGORY_NAME_OVERRIDES: Record<string, string> = {
  'GdR0b0zs2ZFVVvjsglIL': 'Story IL',
  'zRhqEIO8iXYUiHoW5qIp': 'Free Play IL',
};

// Helper function to get category name with overrides
const getCategoryNameWithOverride = (
  categoryId: string | undefined | null,
  categories: Array<{ id: string; name: string }>,
  srcCategoryName?: string | null
): string => {
  if (categoryId && CATEGORY_NAME_OVERRIDES[categoryId]) {
    return CATEGORY_NAME_OVERRIDES[categoryId];
  }
  return getCategoryName(categoryId, categories, srcCategoryName);
};

interface LongestHeldWR {
  run: LeaderboardEntry;
  days: number;
  startDate: string;
  endDate: string;
  groupKey: string;
}

interface StatsData {
  totalRuns: number;
  verifiedRuns: number;
  worldRecords: number;
  runsByCategory: Map<string, number>;
  runsByPlatform: Map<string, number>;
  runsByRunType: { solo: number; coOp: number };
  runsByLeaderboardType: { regular: number; individualLevel: number; communityGolds: number };
  worldRecordProgression: Array<{ date: string; count: number; runs?: LeaderboardEntry[] }>;
  recentWorldRecords: LeaderboardEntry[];
  wrStartDate?: string;
  wrEndDate?: string;
  longestWRHolder?: { playerName: string; days: number };
  longestHeldWRs: LongestHeldWR[];
  allWorldRecords: LeaderboardEntry[];
  allVerifiedRuns: LeaderboardEntry[];
}

const Stats = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [platforms, setPlatforms] = useState<Array<{ id: string; name: string }>>([]);
  const [levels, setLevels] = useState<Array<{ id: string; name: string }>>([]);
  const [wrProgressionLeaderboardType, setWrProgressionLeaderboardType] = useState<'regular' | 'individual-level' | 'community-golds'>('regular');
  const [wrProgressionCategory, setWrProgressionCategory] = useState("");
  const [wrProgressionPlatform, setWrProgressionPlatform] = useState("");
  const [wrProgressionRunType, setWrProgressionRunType] = useState("");
  const [wrProgressionLevel, setWrProgressionLevel] = useState("");
  const [availableWrCategories, setAvailableWrCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [filterCurrentWROnly, setFilterCurrentWROnly] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [allRuns, fetchedCategories, fetchedPlatforms, fetchedLevels] = await Promise.all([
          getAllVerifiedRuns(),
          getCategories(),
          getPlatforms(),
          import("@/lib/db").then(m => m.getLevels())
        ]);

        setCategories(fetchedCategories);
        setPlatforms(fetchedPlatforms);
        setLevels(fetchedLevels);

        // Calculate statistics
        const verifiedRuns = allRuns.filter(run => run.verified && !run.isObsolete);
        
        // Calculate world records by finding the fastest run in each group
        // Group key: leaderboardType_category_platform_runType_level
        const worldRecordMap = new Map<string, LeaderboardEntry>();
        
        verifiedRuns.forEach(run => {
          const leaderboardType = run.leaderboardType || 'regular';
          const category = run.category || '';
          const platform = run.platform || '';
          const runType = run.runType || 'solo';
          const level = run.level || '';
          const groupKey = `${leaderboardType}_${category}_${platform}_${runType}_${level}`;
          
          const existing = worldRecordMap.get(groupKey);
          if (!existing) {
            worldRecordMap.set(groupKey, run);
          } else {
            // Compare times - keep the faster one
            const existingTime = parseTimeToSeconds(existing.time) || Infinity;
            const currentTime = parseTimeToSeconds(run.time) || Infinity;
            if (currentTime < existingTime) {
              worldRecordMap.set(groupKey, run);
            }
          }
        });
        
        const worldRecords = Array.from(worldRecordMap.values());

        // Group runs by category
        const runsByCategory = new Map<string, number>();
        verifiedRuns.forEach(run => {
          const categoryId = run.category || 'unknown';
          runsByCategory.set(categoryId, (runsByCategory.get(categoryId) || 0) + 1);
        });

        // Group runs by platform
        const runsByPlatform = new Map<string, number>();
        verifiedRuns.forEach(run => {
          const platformId = run.platform || 'unknown';
          runsByPlatform.set(platformId, (runsByPlatform.get(platformId) || 0) + 1);
        });

        // Group by run type
        const runsByRunType = {
          solo: verifiedRuns.filter(run => run.runType === 'solo').length,
          coOp: verifiedRuns.filter(run => run.runType === 'co-op').length,
        };

        // Group by leaderboard type
        const runsByLeaderboardType = {
          regular: verifiedRuns.filter(run => run.leaderboardType === 'regular' || !run.leaderboardType).length,
          individualLevel: verifiedRuns.filter(run => run.leaderboardType === 'individual-level').length,
          communityGolds: verifiedRuns.filter(run => run.leaderboardType === 'community-golds').length,
        };

        // World record progression over time
        // Track runs by date for tooltip display
        const wrProgression = new Map<string, number>();
        const wrRunsByDate = new Map<string, LeaderboardEntry[]>();
        const sortedWRs = worldRecords
          .filter(wr => wr.date)
          .sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            return dateA - dateB;
          });

        let cumulativeCount = 0;
        sortedWRs.forEach(wr => {
          cumulativeCount++;
          const date = wr.date!;
          
          // Track runs for this date
          if (!wrRunsByDate.has(date)) {
            wrRunsByDate.set(date, []);
          }
          wrRunsByDate.get(date)!.push(wr);
          
          wrProgression.set(date, cumulativeCount);
        });

        const progressionData = Array.from(wrProgression.entries())
          .map(([date, count]) => ({ 
            date, 
            count,
            runs: wrRunsByDate.get(date) || []
          }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Calculate WR start and end dates
        const wrStartDate = progressionData.length > 0 ? progressionData[0].date : undefined;
        const wrEndDate = progressionData.length > 0 ? progressionData[progressionData.length - 1].date : undefined;

        // Calculate who has held WRs the longest
        // Track WR holders by group (category/platform/runType/level) over time
        // For each group, find all runs that were WRs at some point
        const wrHoldersByGroup = new Map<string, Array<{ playerName: string; date: string; endDate?: string }>>();
        const longestHeldWRsList: LongestHeldWR[] = [];
        const now = new Date();
        const nowDateStr = now.toISOString().split('T')[0];
        
        // Group all verified runs by their leaderboard group
        const runsByGroup = new Map<string, LeaderboardEntry[]>();
        verifiedRuns.forEach(run => {
          if (!run.date) return;
          
          const leaderboardType = run.leaderboardType || 'regular';
          const category = run.category || '';
          const platform = run.platform || '';
          const runType = run.runType || 'solo';
          const level = run.level || '';
          const groupKey = `${leaderboardType}_${category}_${platform}_${runType}_${level}`;
          
          if (!runsByGroup.has(groupKey)) {
            runsByGroup.set(groupKey, []);
          }
          runsByGroup.get(groupKey)!.push(run);
        });
        
        // For each group, sort by time and track WR progression
        runsByGroup.forEach((runs, groupKey) => {
          // Sort by time (fastest first)
          runs.sort((a, b) => {
            const timeA = parseTimeToSeconds(a.time) || Infinity;
            const timeB = parseTimeToSeconds(b.time) || Infinity;
            return timeA - timeB;
          });
          
          // Track when each player held the WR
          // Sort runs by date first to track chronological WR progression
          const runsByDate = [...runs].sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            return dateA - dateB;
          });
          
          // Track the current WR holder over time
          const holders: Array<{ playerName: string; date: string; endDate?: string }> = [];
          const wrRuns: Array<{ run: LeaderboardEntry; startDate: string; endDate?: string }> = [];
          let currentWR: LeaderboardEntry | null = null;
          let currentWRDate: string | null = null;
          
          // Process runs chronologically
          runsByDate.forEach(run => {
            const runTime = parseTimeToSeconds(run.time) || Infinity;
            const currentWRTime = currentWR ? (parseTimeToSeconds(currentWR.time) || Infinity) : Infinity;
            
            // If this run is faster than current WR, it becomes the new WR
            if (runTime < currentWRTime) {
              // If there was a previous WR holder, record when their WR ended
              if (currentWR && currentWRDate) {
                const lastHolder = holders[holders.length - 1];
                if (lastHolder && lastHolder.playerName === (currentWR.playerName || 'Unknown') && !lastHolder.endDate) {
                  lastHolder.endDate = run.date;
                } else {
                  holders.push({
                    playerName: currentWR.playerName || 'Unknown',
                    date: currentWRDate,
                    endDate: run.date,
                  });
                }
                
                // Record when the previous WR run ended
                const lastWRRun = wrRuns[wrRuns.length - 1];
                if (lastWRRun && lastWRRun.run.id === currentWR.id && !lastWRRun.endDate) {
                  // Update the existing entry's end date
                  lastWRRun.endDate = run.date;
                } else {
                  // This shouldn't happen, but add it as a fallback
                  wrRuns.push({
                    run: currentWR,
                    startDate: currentWRDate,
                    endDate: run.date,
                  });
                }
              }
              
              // Set new WR holder
              currentWR = run;
              currentWRDate = run.date;
              holders.push({
                playerName: run.playerName || 'Unknown',
                date: run.date,
                endDate: undefined, // Will be set when broken or at end
              });
              wrRuns.push({
                run: run,
                startDate: run.date,
                endDate: undefined, // Will be set when broken or at end
              });
            }
          });
          
          // Set end date for current WR holder (if still holding)
          if (holders.length > 0) {
            const lastHolder = holders[holders.length - 1];
            if (!lastHolder.endDate) {
              lastHolder.endDate = nowDateStr;
            }
          }
          
          // Set end date for current WR run (if still holding)
          if (wrRuns.length > 0) {
            const lastWRRun = wrRuns[wrRuns.length - 1];
            if (!lastWRRun.endDate) {
              lastWRRun.endDate = nowDateStr;
            }
          }
          
          wrHoldersByGroup.set(groupKey, holders);
          
          // Add all WR runs from this group to the longest-held list
          wrRuns.forEach(wrRun => {
            const startDate = new Date(wrRun.startDate);
            const endDate = new Date(wrRun.endDate || nowDateStr);
            const days = Math.max(0, Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
            
            longestHeldWRsList.push({
              run: wrRun.run,
              days,
              startDate: wrRun.startDate,
              endDate: wrRun.endDate || nowDateStr,
              groupKey,
            });
          });
        });
        
        // Calculate total days each player has held WRs (across all groups)
        // Sum up all WR-holding periods for each player
        const playerWRDays = new Map<string, number>();
        wrHoldersByGroup.forEach(holders => {
          holders.forEach(holder => {
            const startDate = new Date(holder.date);
            const endDate = new Date(holder.endDate || nowDateStr);
            const days = Math.max(0, Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
            
            // Sum up days for this player across all groups
            const currentDays = playerWRDays.get(holder.playerName) || 0;
            playerWRDays.set(holder.playerName, currentDays + days);
          });
        });
        
        // Find player with most days
        let longestWRHolder: { playerName: string; days: number } | undefined;
        playerWRDays.forEach((days, playerName) => {
          if (!longestWRHolder || days > longestWRHolder.days) {
            longestWRHolder = { playerName, days };
          }
        });
        
        // Sort longest-held WRs by duration (longest first)
        longestHeldWRsList.sort((a, b) => b.days - a.days);

        // Recent world records (last 20)
        const recentWorldRecords = worldRecords
          .filter(wr => wr.date)
          .sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            return dateB - dateA;
          })
          .slice(0, 20);

        setStats({
          totalRuns: allRuns.length,
          verifiedRuns: verifiedRuns.length,
          worldRecords: worldRecords.length,
          runsByCategory,
          runsByPlatform,
          runsByRunType,
          runsByLeaderboardType,
          worldRecordProgression: progressionData,
          recentWorldRecords,
          wrStartDate,
          wrEndDate,
          longestWRHolder,
          longestHeldWRs: longestHeldWRsList,
          allWorldRecords: worldRecords,
          allVerifiedRuns: verifiedRuns,
        });
        
        // Initialize filter defaults
        if (fetchedPlatforms.length > 0) {
          setWrProgressionPlatform(fetchedPlatforms[0].id);
        }
        if (runTypes.length > 0) {
          setWrProgressionRunType(runTypes[0].id);
        }
        if (fetchedLevels.length > 0) {
          setWrProgressionLevel(fetchedLevels[0].id);
        }
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Update available categories when WR progression leaderboard type changes
  useEffect(() => {
    const updateCategories = async () => {
      try {
        const fetchedCategories = await getCategories(wrProgressionLeaderboardType);
        setAvailableWrCategories(fetchedCategories);
        
        // Auto-select first category if available
        if (fetchedCategories.length > 0) {
          setWrProgressionCategory(fetchedCategories[0].id);
        } else {
          setWrProgressionCategory("");
        }
      } catch (error) {
        setAvailableWrCategories([]);
        setWrProgressionCategory("");
      }
    };
    
    updateCategories();
  }, [wrProgressionLeaderboardType]);

  const topCategories = useMemo(() => {
    if (!stats) return [];
    return Array.from(stats.runsByCategory.entries())
      .map(([id, count]) => ({
        id,
        name: getCategoryNameWithOverride(id, categories),
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [stats, categories]);

  const topPlatforms = useMemo(() => {
    if (!stats) return [];
    return Array.from(stats.runsByPlatform.entries())
      .map(([id, count]) => ({
        id,
        name: getPlatformName(id, platforms),
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [stats, platforms]);


  // Calculate filtered WR time progression
  const filteredWRTimeProgression = useMemo(() => {
    if (!stats || !stats.allWorldRecords) return [];
    
    // Filter world records by selected criteria
    let filteredWRs = stats.allWorldRecords.filter(wr => {
      if (!wr.date) return false;
      
      // Filter by leaderboard type
      const runLeaderboardType = wr.leaderboardType || 'regular';
      if (runLeaderboardType !== wrProgressionLeaderboardType) return false;
      
      // Filter by category
      if (wrProgressionCategory && wr.category !== wrProgressionCategory) return false;
      
      // Filter by platform
      if (wrProgressionPlatform && wr.platform !== wrProgressionPlatform) return false;
      
      // Filter by run type
      if (wrProgressionRunType && wr.runType !== wrProgressionRunType) return false;
      
      // Filter by level (for IL/CG)
      if ((wrProgressionLeaderboardType === 'individual-level' || wrProgressionLeaderboardType === 'community-golds')) {
        if (wrProgressionLevel && wr.level !== wrProgressionLevel) return false;
      }
      
      return true;
    });
    
    if (filteredWRs.length === 0) return [];
    
    // Group by the same key (category/platform/runType/level) to track progression
    const leaderboardType = wrProgressionLeaderboardType;
    const category = wrProgressionCategory;
    const platform = wrProgressionPlatform;
    const runType = wrProgressionRunType;
    const level = wrProgressionLevel;
    const groupKey = `${leaderboardType}_${category}_${platform}_${runType}_${level}`;
    
    // Get all runs for this specific group (not just WRs, but all verified runs)
    // We need to track when WRs were broken
    const allRunsForGroup = stats.allVerifiedRuns.filter(run => {
      const runLeaderboardType = run.leaderboardType || 'regular';
      if (runLeaderboardType !== leaderboardType) return false;
      if (category && run.category !== category) return false;
      if (platform && run.platform !== platform) return false;
      if (runType && run.runType !== runType) return false;
      if ((leaderboardType === 'individual-level' || leaderboardType === 'community-golds') && level && run.level !== level) return false;
      return true;
    });
    
    // Sort all runs by date chronologically
    const runsByDate = allRunsForGroup
      .filter(run => run.date)
      .sort((a, b) => {
        const dateA = new Date(a.date!).getTime();
        const dateB = new Date(b.date!).getTime();
        return dateA - dateB;
      });
    
    // Track WR progression (best time over time)
    const progression: Array<{ date: string; time: number; timeString: string; run: LeaderboardEntry }> = [];
    let currentBestTime = Infinity;
    let currentBestRun: LeaderboardEntry | null = null;
    
    runsByDate.forEach(run => {
      const runTime = parseTimeToSeconds(run.time) || Infinity;
      
      // If this run is faster than current best, it becomes the new WR
      if (runTime < currentBestTime) {
        currentBestTime = runTime;
        currentBestRun = run;
        progression.push({
          date: run.date!,
          time: runTime,
          timeString: run.time,
          run: run,
        });
      }
    });
    
    return progression;
  }, [stats, wrProgressionLeaderboardType, wrProgressionCategory, wrProgressionPlatform, wrProgressionRunType, wrProgressionLevel]);


  if (loading) {
    return (
      <FadeIn className="container mx-auto px-4 py-8">
        <FadeIn className="mb-8" delay={0.1}>
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </FadeIn>

        {/* Overview Cards Skeletons */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <FadeIn delay={i * 0.1}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-4 rounded" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24 mb-2" />
                <Skeleton className="h-4 w-40" />
              </CardContent>
              </FadeIn>
            </Card>
          ))}
        </div>

        {/* Tab Buttons Skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 mb-4 p-0 gap-0 bg-ctp-surface0/50 rounded-none border border-ctp-surface1">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-10 w-full rounded-none" />
          ))}
        </div>

        {/* Content Skeleton */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <FadeIn delay={0.2}>
            <CardHeader>
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between">
                    <Skeleton className="h-4 w-32" />
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-5 w-12" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            </FadeIn>
          </Card>

          <Card>
            <FadeIn delay={0.3}>
            <CardHeader>
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center justify-between">
                    <Skeleton className="h-4 w-32" />
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-12" />
                      <Skeleton className="h-5 w-10" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            </FadeIn>
          </Card>
        </div>
      </FadeIn>
    );
  }

  if (!stats) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Failed to load statistics.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const chartConfig = {
    count: {
      label: "World Records",
      color: "hsl(var(--chart-1))",
    },
  };

  return (
    <FadeIn className="min-h-screen bg-[#1e1e2e] container mx-auto px-4 py-8">

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <FadeIn delay={0.1}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Verified Runs</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.verifiedRuns.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalRuns.toLocaleString()} total runs
            </p>
          </CardContent>
          </FadeIn>
        </Card>

        <Card>
          <FadeIn delay={0.2}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">World Records</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.worldRecords.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {((stats.worldRecords / stats.verifiedRuns) * 100).toFixed(1)}% of verified runs
            </p>
          </CardContent>
          </FadeIn>
        </Card>

        <Card>
          <FadeIn delay={0.3}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Solo Runs</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.runsByRunType.solo.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {((stats.runsByRunType.solo / stats.verifiedRuns) * 100).toFixed(1)}% of runs
            </p>
          </CardContent>
          </FadeIn>
        </Card>

        <Card>
          <FadeIn delay={0.4}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Co-op Runs</CardTitle>
            <Gamepad2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.runsByRunType.coOp.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {((stats.runsByRunType.coOp / stats.verifiedRuns) * 100).toFixed(1)}% of runs
            </p>
          </CardContent>
          </FadeIn>
        </Card>
      </div>

      <div className="space-y-4">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'overview' | 'progression' | 'breakdown' | 'recent' | 'longest')} className="w-full">
          <AnimatedTabsList className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 mb-4 p-0 gap-0" indicatorClassName="h-0.5 bg-[#f9e2af]">
            <AnimatedTabsTrigger
              value="overview"
              className="h-auto py-2 px-3 transition-all duration-300 border-r border-ctp-surface1 last:border-r-0 data-[state=active]:text-[#f9e2af]"
            >
              <span className="font-medium text-xs sm:text-sm">Overview</span>
            </AnimatedTabsTrigger>
            <AnimatedTabsTrigger
              value="progression"
              className="h-auto py-2 px-3 transition-all duration-300 border-r border-ctp-surface1 last:border-r-0 data-[state=active]:text-[#f9e2af]"
            >
              <span className="font-medium text-xs sm:text-sm">WR Progression</span>
            </AnimatedTabsTrigger>
            <AnimatedTabsTrigger
              value="breakdown"
              className="h-auto py-2 px-3 transition-all duration-300 border-r border-ctp-surface1 last:border-r-0 data-[state=active]:text-[#f9e2af]"
            >
              <span className="font-medium text-xs sm:text-sm">Breakdown</span>
            </AnimatedTabsTrigger>
            <AnimatedTabsTrigger
              value="recent"
              className="h-auto py-2 px-3 transition-all duration-300 border-r border-ctp-surface1 last:border-r-0 data-[state=active]:text-[#f9e2af]"
            >
              <span className="font-medium text-xs sm:text-sm">Recent WRs</span>
            </AnimatedTabsTrigger>
            <AnimatedTabsTrigger
              value="longest"
              className="h-auto py-2 px-3 transition-all duration-300 border-r border-ctp-surface1 last:border-r-0 data-[state=active]:text-[#f9e2af]"
            >
              <span className="font-medium text-xs sm:text-sm">Longest WRs</span>
            </AnimatedTabsTrigger>
          </AnimatedTabsList>
        </Tabs>

        {activeTab === 'overview' && (
          <>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
            <FadeIn delay={0.2}>
              <CardHeader>
                <CardTitle>Leaderboard Types</CardTitle>
                <CardDescription>Distribution of runs by leaderboard type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      <span>Regular</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">{stats.runsByLeaderboardType.regular.toLocaleString()}</span>
                      <Badge variant="secondary">
                        {((stats.runsByLeaderboardType.regular / stats.verifiedRuns) * 100).toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Award className="h-4 w-4" />
                      <span>Individual Levels</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">{stats.runsByLeaderboardType.individualLevel.toLocaleString()}</span>
                      <Badge variant="secondary">
                        {((stats.runsByLeaderboardType.individualLevel / stats.verifiedRuns) * 100).toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4" />
                      <span>Community Golds</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">{stats.runsByLeaderboardType.communityGolds.toLocaleString()}</span>
                      <Badge variant="secondary">
                        {((stats.runsByLeaderboardType.communityGolds / stats.verifiedRuns) * 100).toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </FadeIn>
            </Card>

            <Card>
            <FadeIn delay={0.3}>
              <CardHeader>
                <CardTitle>Top Categories</CardTitle>
                <CardDescription>Categories with the most runs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {topCategories.map((category) => (
                    <div key={category.id} className="flex items-center justify-between">
                      <span className="text-sm">{category.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{category.count.toLocaleString()}</span>
                        <Badge variant="outline">
                          {((category.count / stats.verifiedRuns) * 100).toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </FadeIn>
            </Card>
          </div>

          <Card>
            <FadeIn delay={0.3}>
            <CardHeader>
              <CardTitle>Top Platforms</CardTitle>
              <CardDescription>Platforms with the most runs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {topPlatforms.map((platform) => (
                  <div key={platform.id} className="flex items-center justify-between p-2 border rounded">
                    <span className="text-sm font-medium">{platform.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{platform.count.toLocaleString()}</span>
                      <Badge variant="outline">
                        {((platform.count / stats.verifiedRuns) * 100).toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            </FadeIn>
          </Card>
          </>
        )}

        {activeTab === 'progression' && (
          <Card>
            <FadeIn delay={0.3}>
            <CardHeader>
              <CardTitle>World Record Time Progression</CardTitle>
              <CardDescription>World record times improving over time (lower is better)</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters - Always show so users can switch leaderboard types even when no data */}
              <div className="mb-6 space-y-4">
                {/* Leaderboard Type Tabs */}
                <Tabs value={wrProgressionLeaderboardType} onValueChange={(value) => setWrProgressionLeaderboardType(value as 'regular' | 'individual-level' | 'community-golds')} className="w-full mb-4">
                  <AnimatedTabsList className="grid grid-cols-3 p-0 gap-1 relative" indicatorClassName="h-0.5 bg-[#f9e2af]">
                    <AnimatedTabsTrigger
                      value="regular"
                      className="h-auto py-2 px-3 transition-all duration-300 data-[state=active]:text-[#f9e2af]"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Trophy className="h-4 w-4" />
                        <span className="font-medium text-xs sm:text-sm">Full Game</span>
                      </div>
                    </AnimatedTabsTrigger>
                    <AnimatedTabsTrigger
                      value="individual-level"
                      className="h-auto py-2 px-3 transition-all duration-300 data-[state=active]:text-[#f9e2af]"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Star className="h-4 w-4" />
                        <span className="font-medium text-xs sm:text-sm">ILs</span>
                      </div>
                    </AnimatedTabsTrigger>
                    <AnimatedTabsTrigger
                      value="community-golds"
                      className="h-auto py-2 px-3 transition-all duration-300 data-[state=active]:text-[#f9e2af]"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Gem className="h-4 w-4" />
                        <span className="font-medium text-xs sm:text-sm">CGs</span>
                      </div>
                    </AnimatedTabsTrigger>
                  </AnimatedTabsList>
                </Tabs>

                {/* Category Tabs */}
                {availableWrCategories.length > 0 && (
                  <div className="mb-4">
                    <Tabs value={wrProgressionCategory} onValueChange={setWrProgressionCategory} className="w-full">
                      <AnimatedTabsList 
                        className="flex w-full p-1 gap-2 overflow-x-auto overflow-y-visible scrollbar-thin scrollbar-thumb-ctp-surface1 scrollbar-track-transparent pb-3 relative" 
                        style={{ minWidth: 'max-content' }}
                        indicatorClassName="h-0.5 bg-[#94e2d5]"
                      >
                        {availableWrCategories.map((category) => {
                          return (
                            <AnimatedTabsTrigger
                              key={category.id}
                              value={category.id}
                              className="whitespace-nowrap px-4 py-2 h-9 text-sm font-medium transition-all duration-200 data-[state=active]:text-[#94e2d5]"
                            >
                              {category.name || getCategoryNameWithOverride(category.id, availableWrCategories)}
                            </AnimatedTabsTrigger>
                          );
                        })}
                      </AnimatedTabsList>
                    </Tabs>
                  </div>
                )}

                {/* Filter Card */}
                <Card className="bg-gradient-to-br from-ctp-base to-ctp-mantle border-ctp-surface1 shadow-xl rounded-none">
                  <CardHeader className="bg-gradient-to-r from-ctp-base to-ctp-mantle border-b border-ctp-surface1 py-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <span className="text-ctp-text">Filter Results</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {(wrProgressionLeaderboardType === 'individual-level' || wrProgressionLeaderboardType === 'community-golds') && (
                        <div>
                          <label className="block text-sm font-semibold mb-1.5 text-ctp-text flex items-center gap-2">
                            <Star className="h-3.5 w-3.5 text-ctp-mauve" />
                            Levels
                          </label>
                          <Select value={wrProgressionLevel} onValueChange={setWrProgressionLevel}>
                            <SelectTrigger className="bg-ctp-base border-ctp-surface1 h-9 text-sm rounded-none">
                              <SelectValue placeholder="Select level" />
                            </SelectTrigger>
                            <SelectContent>
                              {levels.map((level) => (
                                <SelectItem key={level.id} value={level.id} className="text-sm">
                                  {level.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-semibold mb-1.5 text-ctp-text flex items-center gap-2">
                          <Gamepad2 className="h-3.5 w-3.5 text-ctp-mauve" />
                          Platform
                        </label>
                        <Select value={wrProgressionPlatform} onValueChange={setWrProgressionPlatform}>
                          <SelectTrigger className="bg-ctp-base border-ctp-surface1 h-9 text-sm rounded-none">
                            <SelectValue placeholder="Select platform" />
                          </SelectTrigger>
                          <SelectContent>
                            {platforms.map((platform) => (
                              <SelectItem key={platform.id} value={platform.id} className="text-sm">
                                {platform.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-1.5 text-ctp-text flex items-center gap-2">
                          {wrProgressionRunType === 'solo' ? (
                            <Users className="h-3.5 w-3.5 text-ctp-mauve" />
                          ) : (
                            <Users className="h-3.5 w-3.5 text-ctp-mauve" />
                          )}
                          Run Type
                        </label>
                        <Select value={wrProgressionRunType} onValueChange={setWrProgressionRunType}>
                          <SelectTrigger className="bg-ctp-base border-ctp-surface1 h-9 text-sm rounded-none">
                            <SelectValue placeholder="Select run type" />
                          </SelectTrigger>
                          <SelectContent>
                            {runTypes.map((type) => (
                              <SelectItem key={type.id} value={type.id} className="text-sm">
                                <div className="flex items-center gap-2">
                                  {type.id === 'solo' ? <Users className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                                  {type.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {filteredWRTimeProgression.length > 0 ? (
                <>
                  {/* WR Statistics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="p-4 border rounded-none bg-muted/50">
                        <div className="text-sm text-muted-foreground mb-1">First WR</div>
                        <div className="text-lg font-semibold">
                          {new Date(filteredWRTimeProgression[0].date).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {formatTime(filteredWRTimeProgression[0].timeString)}
                        </div>
                      </div>
                      <div className="p-4 border rounded-none bg-muted/50">
                        <div className="text-sm text-muted-foreground mb-1">Current WR</div>
                        <div className="text-lg font-semibold">
                          {new Date(filteredWRTimeProgression[filteredWRTimeProgression.length - 1].date).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {formatTime(filteredWRTimeProgression[filteredWRTimeProgression.length - 1].timeString)}
                        </div>
                      </div>
                      <div className="p-4 border rounded-none bg-muted/50">
                        <div className="text-sm text-muted-foreground mb-1">Improvement</div>
                        <div className="text-lg font-semibold">
                          {(() => {
                            const firstTime = filteredWRTimeProgression[0].time;
                            const currentTime = filteredWRTimeProgression[filteredWRTimeProgression.length - 1].time;
                            const improvement = firstTime - currentTime;
                            return formatTime(formatSecondsToTime(improvement));
                          })()}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {filteredWRTimeProgression.length} WR{filteredWRTimeProgression.length !== 1 ? 's' : ''} total
                        </div>
                      </div>
                    </div>
                  
                  <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
                    <WRProgressionChart 
                      data={filteredWRTimeProgression}
                      categories={categories}
                      platforms={platforms}
                      levels={levels}
                      chartConfig={chartConfig}
                    />
                  </Suspense>
                </>
              ) : (
                <div className="h-[600px] flex items-center justify-center text-muted-foreground">
                  {stats && stats.allWorldRecords.length > 0 
                    ? "No world record progression data available for the selected filters"
                    : "No world record progression data available"}
                </div>
              )}
            </CardContent>
            </FadeIn>
          </Card>
        )}

        {activeTab === 'breakdown' && (
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Runs by Category</CardTitle>
                <CardDescription>Complete breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {Array.from(stats.runsByCategory.entries())
                    .map(([id, count]) => ({
                      id,
                      name: getCategoryNameWithOverride(id, categories),
                      count,
                    }))
                    .sort((a, b) => b.count - a.count)
                    .map((category) => (
                      <div key={category.id} className="flex items-center justify-between py-2 border-b">
                        <span className="text-sm">{category.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{category.count.toLocaleString()}</span>
                          <Badge variant="outline">
                            {((category.count / stats.verifiedRuns) * 100).toFixed(1)}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            <Card>
            <FadeIn delay={0.3}>
              <CardHeader>
                <CardTitle>Runs by Platform</CardTitle>
                <CardDescription>Complete breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {Array.from(stats.runsByPlatform.entries())
                    .map(([id, count]) => ({
                      id,
                      name: getPlatformName(id, platforms),
                      count,
                    }))
                    .sort((a, b) => b.count - a.count)
                    .map((platform) => (
                      <div key={platform.id} className="flex items-center justify-between py-2 border-b">
                        <span className="text-sm">{platform.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{platform.count.toLocaleString()}</span>
                          <Badge variant="outline">
                            {((platform.count / stats.verifiedRuns) * 100).toFixed(1)}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </FadeIn>
            </Card>
          </div>
        )}

        {activeTab === 'recent' && (
          <Card>
            <FadeIn delay={0.2}>
            <CardHeader>
              <CardTitle>Recent World Records</CardTitle>
              <CardDescription>Most recently achieved world records</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.recentWorldRecords.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Player</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Platform</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.recentWorldRecords.map((wr) => {
                      const categoryName = getCategoryNameWithOverride(wr.category, categories);
                      const platformName = getPlatformName(wr.platform, platforms);
                      const levelName = wr.level ? getLevelName(wr.level, levels) : null;
                      const leaderboardTypeName = 
                        wr.leaderboardType === 'individual-level' ? 'IL' :
                        wr.leaderboardType === 'community-golds' ? 'CG' : 'Full Game';

                      return (
                        <TableRow key={wr.id}>
                          <TableCell>
                            {wr.date ? new Date(wr.date).toLocaleDateString() : 'N/A'}
                          </TableCell>
                          <TableCell>
                            <Link 
                              to="/player/$playerId"
                              params={{ playerId: wr.playerId }}
                              className="text-primary hover:underline"
                            >
                              {wr.playerName}
                              {wr.player2Name && ` & ${wr.player2Name}`}
                            </Link>
                          </TableCell>
                          <TableCell>{categoryName}</TableCell>
                          <TableCell>{platformName}</TableCell>
                          <TableCell>{levelName || '-'}</TableCell>
                          <TableCell className="font-mono">{formatTime(wr.time)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge variant={wr.runType === 'co-op' ? 'default' : 'secondary'}>
                                {wr.runType === 'co-op' ? 'Co-op' : 'Solo'}
                              </Badge>
                              <Badge variant="outline">{leaderboardTypeName}</Badge>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No recent world records found
                </p>
              )}
            </CardContent>
            </FadeIn>
          </Card>
        )}

        {activeTab === 'longest' && (
          <Card>
            <FadeIn delay={0.2}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                Longest-Held World Records
              </CardTitle>
              <CardDescription>
                Runs that held the world record for the longest duration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex items-center gap-2">
                <Switch
                  id="filter-current-wr"
                  checked={filterCurrentWROnly}
                  onCheckedChange={setFilterCurrentWROnly}
                />
                <Label htmlFor="filter-current-wr" className="cursor-pointer">
                  Show only current world records
                </Label>
              </div>
              {stats.longestHeldWRs.length > 0 ? (() => {
                const now = new Date();
                const nowDateStr = now.toISOString().split('T')[0];
                const filteredWRs = filterCurrentWROnly
                  ? stats.longestHeldWRs.filter(wr => {
                      const endDate = new Date(wr.endDate);
                      return endDate.toISOString().split('T')[0] === nowDateStr;
                    })
                  : stats.longestHeldWRs;
                
                return filteredWRs.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Duration</TableHead>
                      <TableHead>Player</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Platform</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Period</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredWRs.map((longestWR, index) => {
                      const categoryName = getCategoryNameWithOverride(longestWR.run.category, categories);
                      const platformName = getPlatformName(longestWR.run.platform, platforms);
                      const levelName = longestWR.run.level ? getLevelName(longestWR.run.level, levels) : null;
                      const leaderboardTypeName = 
                        longestWR.run.leaderboardType === 'individual-level' ? 'IL' :
                        longestWR.run.leaderboardType === 'community-golds' ? 'CG' : 'Full Game';
                      const startDate = new Date(longestWR.startDate);
                      const endDate = new Date(longestWR.endDate);
                      const now = new Date();
                      const nowDateStr = now.toISOString().split('T')[0];
                      const isCurrentWR = endDate.toISOString().split('T')[0] === nowDateStr;
                      
                      // Format duration
                      const years = Math.floor(longestWR.days / 365);
                      const months = Math.floor((longestWR.days % 365) / 30);
                      const days = longestWR.days % 30;
                      let durationText = '';
                      if (years > 0) {
                        durationText = `${years} year${years !== 1 ? 's' : ''}`;
                        if (months > 0) {
                          durationText += `, ${months} month${months !== 1 ? 's' : ''}`;
                        }
                      } else if (months > 0) {
                        durationText = `${months} month${months !== 1 ? 's' : ''}`;
                        if (days > 0) {
                          durationText += `, ${days} day${days !== 1 ? 's' : ''}`;
                        }
                      } else {
                        durationText = `${days} day${days !== 1 ? 's' : ''}`;
                      }

                      return (
                        <TableRow key={`${longestWR.run.id}-${index}`}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{durationText}</span>
                              <Badge variant="outline" className="text-xs">
                                {longestWR.days} days
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Link 
                              to="/player/$playerId"
                              params={{ playerId: longestWR.run.playerId }}
                              className="text-primary hover:underline"
                            >
                              <span style={{ color: longestWR.run.nameColor || 'inherit' }}>
                                {longestWR.run.playerName}
                              </span>
                              {longestWR.run.player2Name && (
                                <>
                                  <span className="text-muted-foreground"> & </span>
                                  <span style={{ color: longestWR.run.player2Color || 'inherit' }}>
                                    {longestWR.run.player2Name}
                                  </span>
                                </>
                              )}
                            </Link>
                          </TableCell>
                          <TableCell>{categoryName}</TableCell>
                          <TableCell>{platformName}</TableCell>
                          <TableCell>{levelName || '-'}</TableCell>
                          <TableCell className="font-mono">{formatTime(longestWR.run.time)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge variant={longestWR.run.runType === 'co-op' ? 'default' : 'secondary'}>
                                {longestWR.run.runType === 'co-op' ? 'Co-op' : 'Solo'}
                              </Badge>
                              <Badge variant="outline">{leaderboardTypeName}</Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>{startDate.toLocaleDateString()}</div>
                              <div className="text-muted-foreground">
                                {isCurrentWR ? (
                                  <span className="text-green-500 font-semibold">Current WR</span>
                                ) : (
                                  `→ ${endDate.toLocaleDateString()}`
                                )}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    {filterCurrentWROnly 
                      ? "No current world records found"
                      : "No world record data available"}
                  </p>
                );
              })() : (
                <p className="text-center text-muted-foreground py-8">
                  No world record data available
                </p>
              )}
            </CardContent>
            </FadeIn>
          </Card>
        )}

      </div>
    </FadeIn>
  );
};

export default Stats;

