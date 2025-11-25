import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, AnimatedTabsList, AnimatedTabsTrigger } from "@/components/ui/animated-tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlayerProfile } from "@/components/PlayerProfile";
import { ArrowLeft, Trophy, User, Users, Clock, Star, Gem, CheckCircle, Gamepad2, Sparkles, MapPin, ExternalLink, Check } from "lucide-react";
import { PrefetchLink } from "@/components/PrefetchLink";
import { getCategories, getPlatforms, getLevels, getCategoriesFromFirestore, getUnclaimedRunsBySRCUsername, claimRun, runTypes, subscribeToPlayer, subscribeToPlayerRuns, subscribeToPlayerPendingRuns } from "@/lib/db";
import type { Unsubscribe } from "firebase/firestore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import LegoStudIcon from "@/components/icons/LegoStudIcon";
import { Player, LeaderboardEntry, Category } from "@/types/database";
import { formatDate, formatTime } from "@/lib/utils";
import { useAuth } from "@/components/AuthProvider";
import { getCategoryName, getPlatformName, getLevelName } from "@/lib/dataValidation";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { FadeIn } from "@/components/ui/fade-in";

const PlayerDetails = () => {
  const { playerId } = useParams<{ playerId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [player, setPlayer] = useState<Player | null>(null);
  const [playerRuns, setPlayerRuns] = useState<LeaderboardEntry[]>([]);
  const [pendingRuns, setPendingRuns] = useState<LeaderboardEntry[]>([]);
  const [unclaimedRuns, setUnclaimedRuns] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPendingRuns, setLoadingPendingRuns] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [platforms, setPlatforms] = useState<{ id: string; name: string }[]>([]);
  const [levels, setLevels] = useState<{ id: string; name: string }[]>([]);
  const [leaderboardType, setLeaderboardType] = useState<'regular' | 'individual-level' | 'community-golds'>('regular');
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("");
  const [selectedRunType, setSelectedRunType] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState("");
  const [availableSubcategories, setAvailableSubcategories] = useState<Array<{ id: string; name: string }>>([]);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const isOwnProfile = currentUser?.uid === playerId;

  // Set up real-time listeners for player data and runs
  useEffect(() => {
    if (!playerId || playerId.trim() === "") {
      setPlayer(null);
      setPlayerRuns([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribes: (Unsubscribe | null)[] = [];
    let isMounted = true;

    (async () => {
      // Set up real-time listener for player data
      const { subscribeToPlayer } = await import("@/lib/db/players");
      if (!isMounted) return;
      
      const unsubPlayer = subscribeToPlayer(playerId, (playerData) => {
        if (!isMounted) return;
        
        // Double-check: if player is still unclaimed, don't show profile
        if (!playerData || !playerData.uid || playerData.uid.trim() === "") {
          setPlayer(null);
          setPlayerRuns([]);
          setLoading(false);
          return;
        }
        
        setPlayer(playerData);
        setLoading(false);
      });
      if (unsubPlayer) unsubscribes.push(unsubPlayer);

      // Set up real-time listener for player runs
      const { subscribeToPlayerRuns } = await import("@/lib/db/runs");
      if (!isMounted) return;
      
      const unsubRuns = subscribeToPlayerRuns(playerId, (runs) => {
        if (!isMounted) return;
        setPlayerRuns(runs);
      });
      if (unsubRuns) unsubscribes.push(unsubRuns);

      // Set up real-time listener for pending runs (only for own profile)
      if (currentUser && currentUser.uid && currentUser.uid === playerId) {
        const { subscribeToPlayerPendingRuns } = await import("@/lib/db/runs");
        if (!isMounted) return;
        
        setLoadingPendingRuns(true);
        const unsubPending = subscribeToPlayerPendingRuns(playerId, (runs) => {
          if (!isMounted) return;
          setPendingRuns(runs || []);
          setLoadingPendingRuns(false);
        });
        if (unsubPending) unsubscribes.push(unsubPending);

        // Fetch unclaimed runs (this still needs polling as it's a complex query)
        const { getPlayerByUid, getUnclaimedRunsBySRCUsername } = await import("@/lib/db");
        getPlayerByUid(playerId).then((playerData) => {
          if (!isMounted || !playerData) return;
          if (playerData.srcUsername) {
            getUnclaimedRunsBySRCUsername(playerData.srcUsername)
              .then((unclaimed) => {
                if (!isMounted) return;
                setUnclaimedRuns(unclaimed || []);
              })
              .catch(() => {
                if (!isMounted) return;
                setUnclaimedRuns([]);
              });
          } else {
            setUnclaimedRuns([]);
          }
        }).catch(() => {});
      } else {
        setPendingRuns([]);
        setUnclaimedRuns([]);
      }
    })();

    // Fetch static data (categories, platforms, levels) - these don't need real-time
    Promise.all([
      getCategoriesFromFirestore('regular'),
      getCategoriesFromFirestore('individual-level'),
      getCategoriesFromFirestore('community-golds'),
      getPlatforms(),
      getLevels()
    ]).then(([regularCategories, ilCategories, cgCategories, fetchedPlatforms, fetchedLevels]) => {
      if (!isMounted) return;
      // Combine all categories
      const fetchedCategories = [...regularCategories, ...ilCategories, ...cgCategories];
      
      setCategories(fetchedCategories);
      setPlatforms(fetchedPlatforms);
      setLevels(fetchedLevels);
      
      // Initialize filter defaults
      if (fetchedPlatforms.length > 0) {
        setSelectedPlatform(fetchedPlatforms[0].id);
      }
      if (runTypes.length > 0) {
        setSelectedRunType(runTypes[0].id);
      }
      if (fetchedLevels.length > 0) {
        setSelectedLevel(fetchedLevels[0].id);
      }
    }).catch(() => {
      // Silent fail for static data - page can still function
    });

    return () => {
      isMounted = false;
      unsubscribes.forEach(unsub => {
        if (unsub) unsub();
      });
    };
  }, [playerId, currentUser]);

  // Update selected category when leaderboard type changes
  useEffect(() => {
    if (categories.length > 0) {
      // First, filter categories by the current leaderboard type
      const categoriesForType = categories.filter(cat => {
        // For 'regular', include categories without leaderboardType field (backward compatibility)
        if (leaderboardType === 'regular') {
          return !cat.leaderboardType || cat.leaderboardType === 'regular';
        }
        return cat.leaderboardType === leaderboardType;
      });
      
      if (categoriesForType.length > 0) {
        // Select first category for this leaderboard type, or keep current if it's still valid
        const firstCategory = categoriesForType[0];
        const currentCategoryStillValid = categoriesForType.some(cat => cat.id === selectedCategory);
        
        if (!currentCategoryStillValid) {
          setSelectedCategory(firstCategory.id);
        }
      } else {
        setSelectedCategory("");
      }
    } else {
      setSelectedCategory("");
    }
  }, [leaderboardType, categories, selectedCategory]);

  // Fetch subcategories when category changes (only for regular leaderboard type)
  useEffect(() => {
    const fetchSubcategories = async () => {
      if (leaderboardType === 'regular' && selectedCategory) {
        try {
          const regularCategories = await getCategories('regular');
          const category = regularCategories.find(c => c.id === selectedCategory);
          if (category && category.subcategories && category.subcategories.length > 0) {
            // Sort subcategories by order
            const sorted = [...category.subcategories].sort((a, b) => {
              const orderA = a.order ?? Infinity;
              const orderB = b.order ?? Infinity;
              return orderA - orderB;
            });
            setAvailableSubcategories(sorted);
            // Automatically select the first subcategory when category changes
            if (sorted.length > 0) {
              setSelectedSubcategory(sorted[0].id);
            } else {
              setSelectedSubcategory("");
            }
          } else {
            setAvailableSubcategories([]);
            setSelectedSubcategory("");
          }
        } catch (error) {
          setAvailableSubcategories([]);
          setSelectedSubcategory("");
        }
      } else {
        setAvailableSubcategories([]);
        setSelectedSubcategory("");
      }
    };
    
    fetchSubcategories();
  }, [selectedCategory, leaderboardType]);

  const handleClaimRun = async (runId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation(); // Prevent row click navigation
    }
    if (!currentUser?.uid) return;
    
    try {
      const success = await claimRun(runId, currentUser.uid);
      if (success) {
        toast({
          title: "Run Claimed",
          description: "This run has been linked to your account.",
        });
        // Refresh player data to update the runs list
        const [fetchedPlayer, fetchedRuns] = await Promise.all([
          getPlayerByUid(playerId!),
          getPlayerRuns(playerId!)
        ]);
        setPlayer(fetchedPlayer);
        setPlayerRuns(fetchedRuns);
        
        // Refresh unclaimed runs
        if (fetchedPlayer?.srcUsername) {
          try {
            const fetchedUnclaimed = await getUnclaimedRunsBySRCUsername(fetchedPlayer.srcUsername);
            setUnclaimedRuns(fetchedUnclaimed || []);
          } catch (error) {
            setUnclaimedRuns([]);
          }
        }
      } else {
        throw new Error("Failed to claim run.");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to claim run.",
        variant: "destructive",
      });
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen text-ctp-text py-8 overflow-x-hidden relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 w-full">
          {/* Back Button Skeleton */}
          <FadeIn className="mb-8 mt-4">
            <Skeleton className="h-10 w-32 rounded-none" />
          </FadeIn>

          {/* Player Profile Skeleton */}
          <Card className="bg-[hsl(240,21%,15%)] border-[hsl(235,13%,30%)] rounded-none mb-8">
            <FadeIn delay={0.1}>
            <CardHeader>
              <div className="flex items-start gap-3">
                <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
                <div className="flex-1 min-w-0 space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-full max-w-md" />
                  <div className="flex flex-wrap items-center gap-2">
                    <Skeleton className="h-5 w-32 rounded-full" />
                    <Skeleton className="h-5 w-28 rounded-full" />
                  </div>
                </div>
              </div>
            </CardHeader>
            </FadeIn>
          </Card>

          {/* Runs Section Skeleton */}
          <FadeIn className="mt-8" delay={0.2}>
            <Skeleton className="h-7 w-24 mb-4" />

            {/* Leaderboard Type Buttons Skeleton */}
            <div className="grid grid-cols-3 mb-4 p-0.5 gap-1 bg-ctp-surface0/50 rounded-none border border-ctp-surface1">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full rounded-none" />
              ))}
            </div>

            {/* Category Buttons Skeleton */}
            <div className="mb-4">
              <div className="flex w-full p-1 gap-2 overflow-x-auto overflow-y-hidden pb-3">
                {[...Array(5)].map((_, index) => (
                  <Skeleton 
                    key={index} 
                    className="h-9 w-28 flex-shrink-0 rounded-none"
                    style={{ animationDelay: `${index * 50}ms` }}
                  />
                ))}
              </div>
            </div>

            {/* Filter Card Skeleton */}
            <Card className="bg-gradient-to-br from-ctp-base to-ctp-mantle border-ctp-surface1 shadow-xl mb-6 rounded-none">
              <CardHeader className="bg-gradient-to-r from-ctp-base to-ctp-mantle border-b border-ctp-surface1 py-3">
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent className="p-3 sm:p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-9 w-full rounded-none" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Table Skeleton */}
            <div className="overflow-x-auto scrollbar-custom rounded-none border border-ctp-surface1/20">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-ctp-surface1/50 hover:bg-transparent bg-ctp-surface0/50">
                    <TableHead className="py-3 pl-3 pr-1">
                      <Skeleton className="h-4 w-12" />
                    </TableHead>
                    <TableHead className="py-3 px-4">
                      <Skeleton className="h-4 w-20" />
                    </TableHead>
                    <TableHead className="py-3 px-4">
                      <Skeleton className="h-4 w-16" />
                    </TableHead>
                    <TableHead className="py-3 px-4 hidden sm:table-cell">
                      <Skeleton className="h-4 w-16" />
                    </TableHead>
                    <TableHead className="py-3 px-4 hidden md:table-cell">
                      <Skeleton className="h-4 w-20" />
                    </TableHead>
                    <TableHead className="py-3 px-4 hidden lg:table-cell">
                      <Skeleton className="h-4 w-16" />
                    </TableHead>
                    <TableHead className="py-3 px-4">
                      <Skeleton className="h-4 w-16" />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...Array(5)].map((_, i) => (
                    <TableRow key={i} className="border-b border-ctp-surface1/20">
                      <TableCell className="py-2.5 pl-3 pr-1">
                        <Skeleton className="h-6 w-6 rounded" />
                      </TableCell>
                      <TableCell className="py-2.5 px-4">
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell className="py-2.5 px-4">
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell className="py-2.5 px-4 hidden sm:table-cell">
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell className="py-2.5 px-4 hidden md:table-cell">
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </TableCell>
                      <TableCell className="py-2.5 px-4 hidden lg:table-cell">
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </TableCell>
                      <TableCell className="py-2.5 px-4">
                        <Skeleton className="h-4 w-12" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </FadeIn>
        </div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[hsl(240,21%,15%)] to-[hsl(235,19%,13%)] text-[hsl(220,17%,92%)] py-8">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h1 className="text-3xl font-bold mb-4">Player Not Found</h1>
          <p className="text-[hsl(222,15%,60%)] mb-8">The requested player could not be found.</p>
          <Button variant="outline" className="text-[hsl(220,17%,92%)] border-[hsl(235,13%,30%)] hover:bg-[hsl(234,14%,29%)]" asChild>
            <PrefetchLink to="/leaderboards">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Leaderboards
            </PrefetchLink>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1e1e2e] text-ctp-text py-8 overflow-x-hidden relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 w-full">
        <div className="mb-8 mt-4 animate-fade-in">
          <Button variant="outline" className="text-ctp-text border-ctp-surface1/50 bg-glass hover:bg-ctp-surface0/50 hover:border-ctp-mauve/50 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-ctp-mauve/20 rounded-none backdrop-blur-sm" asChild>
            <PrefetchLink to="/leaderboards">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Leaderboards
            </PrefetchLink>
          </Button>
        </div>


        <PlayerProfile 
          playerName={player.displayName || "Unknown Player"} 
          joinDate={player.joinDate ? formatDate(player.joinDate) : "Unknown"} 
          stats={{
            totalRuns: player.totalRuns || 0,
            bestRank: player.bestRank || 0,
            favoriteCategory: player.favoriteCategory || "Not set",
            favoritePlatform: player.favoritePlatform || "Not set",
          }} 
          nameColor={player.nameColor}
          profilePicture={player.profilePicture}
          bio={player.bio}
          pronouns={player.pronouns}
          srcUsername={player.srcUsername}
        />

        {/* Pending Submissions Panel - Only show for own profile */}
        {isOwnProfile && pendingRuns.length > 0 && (
          <FadeIn className="mt-8" delay={0.15}>
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-ctp-text">
              <Clock className="h-5 w-5 text-ctp-yellow" />
              Pending Submissions
            </h3>
            <div className="overflow-x-auto scrollbar-custom rounded-none border border-ctp-surface1/50">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-ctp-surface1/50 hover:bg-transparent bg-ctp-surface0/50">
                    <TableHead className="py-3 px-4 text-left text-sm font-semibold text-ctp-text">Category</TableHead>
                    <TableHead className="py-3 px-4 text-left text-sm font-semibold text-ctp-text">Time</TableHead>
                    <TableHead className="py-3 px-4 text-left text-sm font-semibold text-ctp-text">Date</TableHead>
                    <TableHead className="py-3 px-4 text-left text-sm font-semibold text-ctp-text">Platform</TableHead>
                    <TableHead className="py-3 px-4 text-left text-sm font-semibold text-ctp-text">Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingRuns.map((run, index) => {
                    const categoryName = categories.find(c => c.id === run.category)?.name || run.category;
                    const platformName = platforms.find(p => p.id === run.platform)?.name || run.platform;
                    
                    return (
                      <TableRow 
                        key={run.id} 
                        className="table-row-animate border-b border-ctp-surface1/20 hover:bg-ctp-surface0 hover:brightness-125 transition-all duration-150 cursor-pointer"
                        style={{ animationDelay: `${index * 50}ms` }}
                        onClick={() => navigate(`/run/${run.id}`)}
                      >
                        <TableCell className="py-3 px-4 font-medium text-ctp-text">{categoryName}</TableCell>
                        <TableCell className="py-3 px-4 font-mono text-ctp-text text-left">{formatTime(run.time)}</TableCell>
                        <TableCell className="py-3 px-4 text-ctp-subtext1 text-left">{formatDate(run.date)}</TableCell>
                        <TableCell className="py-3 px-4">
                          <Badge variant="outline" className="border-ctp-surface1 bg-ctp-surface0 text-ctp-text text-xs px-1.5 py-0.5">
                            {platformName}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3 px-4">
                          <Badge variant="outline" className="border-ctp-surface1 bg-ctp-surface0 text-ctp-text flex items-center gap-1 w-fit text-xs px-1.5 py-0.5">
                            {run.runType === 'solo' ? <User className="h-3 w-3" /> : <Users className="h-3 w-3" />}
                            {run.runType.charAt(0).toUpperCase() + run.runType.slice(1)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </FadeIn>
        )}

        <FadeIn className="mt-8" delay={0.2}>
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-ctp-text">
              <Trophy className="h-5 w-5 text-ctp-yellow" />
              Runs
            </h3>

            {/* Leaderboard Type Tabs */}
            <Tabs value={leaderboardType} onValueChange={(value) => setLeaderboardType(value as 'regular' | 'individual-level' | 'community-golds')} className="w-full mb-4">
              <AnimatedTabsList className="grid grid-cols-3 p-0 gap-1 relative" indicatorClassName="h-0.5 bg-[#f9e2af]">
                <AnimatedTabsTrigger
                  value="regular"
                  className="h-auto py-1.5 sm:py-2 px-2 sm:px-3 transition-all duration-200 font-medium text-xs sm:text-sm whitespace-nowrap data-[state=active]:text-[#f9e2af]"
                >
                  <Trophy className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 sm:mr-1.5" />
                  <span className="hidden min-[375px]:inline">Full Game</span>
                  <span className="min-[375px]:hidden">Game</span>
                </AnimatedTabsTrigger>
                <AnimatedTabsTrigger
                  value="individual-level"
                  className="h-auto py-1.5 sm:py-2 px-2 sm:px-3 transition-all duration-200 font-medium text-xs sm:text-sm whitespace-nowrap data-[state=active]:text-[#f9e2af]"
                >
                  <Star className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 sm:mr-1.5" />
                  <span className="hidden sm:inline">Individual Levels</span>
                  <span className="sm:hidden">ILs</span>
                </AnimatedTabsTrigger>
                <AnimatedTabsTrigger
                  value="community-golds"
                  className="h-auto py-1.5 sm:py-2 px-2 sm:px-3 transition-all duration-200 font-medium text-xs sm:text-sm whitespace-nowrap data-[state=active]:text-[#f9e2af]"
                >
                  <Gem className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 sm:mr-1.5" />
                  <span className="hidden sm:inline">Community Golds</span>
                  <span className="sm:hidden">CGs</span>
                </AnimatedTabsTrigger>
              </AnimatedTabsList>
            </Tabs>

            <div className="mt-0">
                {(() => {
                  // First, filter categories by the current leaderboard type
                  const categoriesForType = categories.filter(cat => {
                    // For 'regular', include categories without leaderboardType field (backward compatibility)
                    if (leaderboardType === 'regular') {
                      return !cat.leaderboardType || cat.leaderboardType === 'regular';
                    }
                    return cat.leaderboardType === leaderboardType;
                  });
                  
                  // Get categories that have runs for this leaderboard type
                  const runsForType = playerRuns.filter(run => {
                    const runLeaderboardType = run.leaderboardType || 'regular';
                    return runLeaderboardType === leaderboardType;
                  });
                  
                  // Show all categories for this leaderboard type
                  // This allows users to see all available categories even if they don't have runs yet
                  const categoriesWithRuns = categoriesForType;
                  
                  // Filter verified runs by leaderboard type
                  let filteredVerifiedRuns = playerRuns.filter(run => {
                    const runLeaderboardType = run.leaderboardType || 'regular';
                    return runLeaderboardType === leaderboardType;
                  });
                  
                  // Filter unclaimed runs by leaderboard type (only show on own profile)
                  let filteredUnclaimedRuns = isOwnProfile ? unclaimedRuns.filter(run => {
                    const runLeaderboardType = run.leaderboardType || 'regular';
                    return runLeaderboardType === leaderboardType;
                  }) : [];
                  
                  // Apply filters
                  if (selectedCategory) {
                    filteredVerifiedRuns = filteredVerifiedRuns.filter(run => run.category === selectedCategory);
                    filteredUnclaimedRuns = filteredUnclaimedRuns.filter(run => run.category === selectedCategory);
                  }
                  
                  if (selectedPlatform) {
                    filteredVerifiedRuns = filteredVerifiedRuns.filter(run => run.platform === selectedPlatform);
                    filteredUnclaimedRuns = filteredUnclaimedRuns.filter(run => run.platform === selectedPlatform);
                  }
                  
                  if (selectedRunType) {
                    filteredVerifiedRuns = filteredVerifiedRuns.filter(run => run.runType === selectedRunType);
                    filteredUnclaimedRuns = filteredUnclaimedRuns.filter(run => run.runType === selectedRunType);
                  }
                  
                  if (selectedLevel && (leaderboardType === 'individual-level' || leaderboardType === 'community-golds')) {
                    filteredVerifiedRuns = filteredVerifiedRuns.filter(run => run.level === selectedLevel);
                    filteredUnclaimedRuns = filteredUnclaimedRuns.filter(run => run.level === selectedLevel);
                  }
                  
                  if (selectedSubcategory && leaderboardType === 'regular') {
                    filteredVerifiedRuns = filteredVerifiedRuns.filter(run => run.subcategory === selectedSubcategory);
                    filteredUnclaimedRuns = filteredUnclaimedRuns.filter(run => run.subcategory === selectedSubcategory);
                  }
                  
                  // Combine verified and unclaimed runs
                  const allRuns = [...filteredVerifiedRuns, ...filteredUnclaimedRuns];

                  // Category tabs
                  const categoryButtons = categoriesWithRuns.length > 0 ? (
                    <div className="mb-4">
                      <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
                        <AnimatedTabsList 
                          className="flex w-full p-1 gap-2 overflow-x-auto overflow-y-hidden scrollbar-thin scrollbar-thumb-ctp-surface1 scrollbar-track-transparent pb-3" 
                          style={{ minWidth: 'max-content' }}
                          indicatorClassName="h-0.5 bg-[#94e2d5]"
                        >
                          {categoriesWithRuns.map((category, index) => {
                            return (
                              <AnimatedTabsTrigger
                                key={category.id}
                                value={category.id}
                                className="whitespace-nowrap px-4 py-2 h-9 text-sm font-medium transition-all duration-200 data-[state=active]:text-[#94e2d5]"
                                style={{ animationDelay: `${index * 50}ms` }}
                              >
                                {category.name}
                              </AnimatedTabsTrigger>
                            );
                          })}
                        </AnimatedTabsList>
                      </Tabs>
                    </div>
                  ) : null;
                  
                  // Subcategory tabs (only for regular leaderboard type)
                  const subcategoryButtons = leaderboardType === 'regular' && availableSubcategories.length > 0 ? (
                    <div className="mb-6">
                      <Tabs value={selectedSubcategory} onValueChange={setSelectedSubcategory} className="w-full">
                        <AnimatedTabsList 
                          className="flex w-full p-1 gap-2 overflow-x-auto overflow-y-visible scrollbar-thin scrollbar-thumb-ctp-surface1 scrollbar-track-transparent pb-3 relative" 
                          style={{ minWidth: 'max-content' }}
                          indicatorClassName="h-0.5 bg-[#cba6f7]"
                        >
                          {availableSubcategories.map((subcategory, index) => {
                            return (
                              <AnimatedTabsTrigger
                                key={subcategory.id}
                                value={subcategory.id}
                                className="whitespace-nowrap px-4 py-2 h-8 text-xs sm:text-sm font-medium transition-all duration-200 data-[state=active]:text-[#cba6f7]"
                                style={{ animationDelay: `${index * 50}ms` }}
                              >
                                {subcategory.name}
                              </AnimatedTabsTrigger>
                            );
                          })}
                        </AnimatedTabsList>
                      </Tabs>
                    </div>
                  ) : null;

                  return (
                    <>
                      {categoryButtons}
                      {subcategoryButtons}
                      
                      {/* Runs Table with Filters */}
                      <Card className="bg-gradient-to-br from-ctp-base to-ctp-mantle border-ctp-surface1 shadow-xl rounded-none overflow-hidden">
                        <CardHeader className="bg-gradient-to-r from-ctp-base to-ctp-mantle border-b border-ctp-surface1 py-4">
                          <CardTitle className="flex items-center gap-2 text-lg text-[#a6e3a1]">
                            <span>Runs</span>
                            {allRuns.length > 0 && (
                              <span className="ml-auto text-sm font-normal text-ctp-subtext1">
                                {allRuns.length} {allRuns.length === 1 ? 'run' : 'runs'}
                              </span>
                            )}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                          {/* Filters */}
                          <div className="p-4 sm:p-6 border-b border-ctp-surface1/50">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                              {(leaderboardType === 'individual-level' || leaderboardType === 'community-golds') && (
                                <div>
                                  <label className="block text-sm font-semibold mb-2 text-ctp-text flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-ctp-mauve" />
                                    Levels
                                  </label>
                                  <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                                    <SelectTrigger className="bg-ctp-base border-ctp-surface1 h-10 text-sm rounded-none focus:ring-ctp-mauve">
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
                                <label className="block text-sm font-semibold mb-2 text-ctp-text flex items-center gap-2">
                                  <Gamepad2 className="h-4 w-4 text-ctp-mauve" />
                                  Platform
                                </label>
                                <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                                  <SelectTrigger className="bg-ctp-base border-ctp-surface1 h-10 text-sm rounded-none focus:ring-ctp-mauve">
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
                                <label className="block text-sm font-semibold mb-2 text-ctp-text flex items-center gap-2">
                                  {selectedRunType === 'solo' ? (
                                    <User className="h-4 w-4 text-ctp-mauve" />
                                  ) : (
                                    <Users className="h-4 w-4 text-ctp-mauve" />
                                  )}
                                  Run Type
                                </label>
                                <Select value={selectedRunType} onValueChange={setSelectedRunType}>
                                  <SelectTrigger className="bg-ctp-base border-ctp-surface1 h-10 text-sm rounded-none focus:ring-ctp-mauve">
                                    <SelectValue placeholder="Select run type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {runTypes.map((type) => (
                                      <SelectItem key={type.id} value={type.id} className="text-sm">
                                        <div className="flex items-center gap-2">
                                          {type.id === 'solo' ? <User className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                                          {type.name}
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>

                          {allRuns.length === 0 ? (
                            <div className="text-center py-12 px-4">
                              <div className="flex flex-col items-center gap-3">
                                <Trophy className="h-8 w-8 text-ctp-subtext1" />
                                <div>
                                  <h3 className="text-base font-semibold mb-1 text-ctp-text">No runs found</h3>
                                  <p className="text-sm text-ctp-subtext1">
                                    Try adjusting your filters to see more results
                                  </p>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="overflow-x-auto scrollbar-custom">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-b border-ctp-surface1/50 hover:bg-transparent bg-ctp-surface0/50">
                            <TableHead className="py-3 pl-3 pr-1 text-left text-sm font-semibold text-ctp-text whitespace-nowrap w-16">Rank</TableHead>
                            <TableHead className="py-3 px-4 text-left text-sm font-semibold text-ctp-text">Category</TableHead>
                            {leaderboardType !== 'regular' && (
                              <TableHead className="py-3 px-4 text-left text-sm font-semibold text-ctp-text">Level</TableHead>
                            )}
                            <TableHead className="py-3 px-4 text-left text-sm font-semibold text-ctp-text">Time</TableHead>
                            <TableHead className="py-3 px-4 text-left text-sm font-semibold text-ctp-text hidden sm:table-cell">Date</TableHead>
                            <TableHead className="py-3 px-4 text-left text-sm font-semibold text-ctp-text hidden md:table-cell">Platform</TableHead>
                            <TableHead className="py-3 px-4 text-left text-sm font-semibold text-ctp-text hidden lg:table-cell">Type</TableHead>
                            <TableHead className="py-3 px-4 text-left text-sm font-semibold text-ctp-text">Video</TableHead>
                            {isOwnProfile && (
                              <TableHead className="py-3 px-4 text-left text-sm font-semibold text-ctp-text">Action</TableHead>
                            )}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {allRuns.map((run, index) => {
                            // Check if this is an unclaimed run
                            const isUnclaimed = !run.playerId || run.playerId.trim() === "";
                            // Use data validation utilities for proper name resolution with SRC fallbacks
                            const categoryName = getCategoryName(
                              run.category,
                              categories,
                              run.srcCategoryName
                            );
                            const platformName = getPlatformName(
                              run.platform,
                              platforms,
                              run.srcPlatformName
                            );
                            const levelName = leaderboardType !== 'regular' && run.level
                              ? getLevelName(run.level, levels, run.srcLevelName)
                              : undefined;
                            
                            const isHighlighted = highlightedId === run.id;
                            
                            return (
                              <TableRow 
                                key={run.id} 
                                onMouseEnter={() => setHighlightedId(run.id)}
                                onMouseLeave={() => setHighlightedId(null)}
                                className={`table-row-animate border-b border-ctp-surface1/20 transition-colors duration-50 cursor-pointer ${isHighlighted ? 'bg-ctp-surface0' : ''}`}
                                style={{ animationDelay: `${index * 50}ms` }}
                                onClick={() => navigate(`/run/${run.id}`)}
                              >
                                <TableCell className="py-2.5 pl-3 pr-1">
                                  {run.rank ? (
                                    run.rank === 1 ? (
                                      <LegoStudIcon size={28} color="#0055BF" />
                                    ) : run.rank === 2 ? (
                                      <LegoStudIcon size={28} color="#FFD700" />
                                    ) : run.rank === 3 ? (
                                      <LegoStudIcon size={28} color="#C0C0C0" />
                                    ) : (
                                      <span className="font-bold text-sm text-ctp-text w-7 h-7 flex items-center justify-center">
                                        #{run.rank}
                                      </span>
                                    )
                                  ) : (
                                    <span className="text-ctp-overlay0">—</span>
                                  )}
                                </TableCell>
                                <TableCell className="py-2.5 px-4 font-medium">
                                  <div className="flex items-center gap-2 text-ctp-text">
                                    {categoryName}
                                    {isUnclaimed && (
                                      <Badge variant="outline" className="border-yellow-600/50 bg-yellow-600/10 text-yellow-400 text-xs">
                                        Unclaimed
                                      </Badge>
                                    )}
                                  </div>
                                </TableCell>
                                {leaderboardType !== 'regular' && (
                                  <TableCell className="py-2.5 px-4 text-ctp-subtext1 flex items-center gap-1">
                                    {levelName ? (
                                      <>
                                        <MapPin className="h-3.5 w-3.5 text-ctp-overlay0" />
                                        {levelName}
                                      </>
                                    ) : (
                                      run.srcLevelName || '—'
                                    )}
                                  </TableCell>
                                )}
                                <TableCell className="py-2.5 px-4 font-semibold text-ctp-text text-left">{formatTime(run.time)}</TableCell>
                                <TableCell className="py-2.5 px-4 text-ctp-subtext1 hidden sm:table-cell text-left">{formatDate(run.date)}</TableCell>
                                <TableCell className="py-2.5 px-4 hidden md:table-cell">
                                  <Badge variant="outline" className="border-ctp-surface1 bg-ctp-surface0 text-ctp-text text-xs px-1.5 py-0.5">
                                    {platformName}
                                  </Badge>
                                </TableCell>
                                <TableCell className="py-2.5 px-4 hidden lg:table-cell">
                                  <Badge variant="outline" className="border-ctp-surface1 bg-ctp-surface0 text-ctp-text flex items-center gap-1 w-fit text-xs px-1.5 py-0.5">
                                    {run.runType === 'solo' ? <User className="h-3 w-3" /> : <Users className="h-3 w-3" />}
                                    {run.runType.charAt(0).toUpperCase() + run.runType.slice(1)}
                                  </Badge>
                                </TableCell>
                                <TableCell className="py-2.5 px-4">
                                  {run.videoUrl && (
                                    <a 
                                      href={run.videoUrl} 
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      className="text-[#cba6f7] hover:text-[#f5c2e7] flex items-center gap-1"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                      <span className="text-xs hidden sm:inline">Watch</span>
                                    </a>
                                  )}
                                </TableCell>
                                {isOwnProfile && (
                                  <TableCell className="py-2.5 px-4">
                                    {isUnclaimed ? (
                                      <Button
                                        onClick={(e) => handleClaimRun(run.id, e)}
                                        size="sm"
                                        className="bg-[#cba6f7] hover:bg-[#b4a0e2] text-[hsl(240,21%,15%)] font-bold h-7 text-xs"
                                      >
                                        <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                                        Claim
                                      </Button>
                                    ) : (
                                      <Check className="h-4 w-4 text-green-500 opacity-0" /> // Spacer
                                    )}
                                  </TableCell>
                                )}
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </>
                  );
                })()}
            </div>
        </FadeIn>
      </div>
    </div>
  );
};

export default PlayerDetails;