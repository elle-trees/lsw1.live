import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlayerProfile } from "@/components/PlayerProfile";
import { ArrowLeft, Trophy, User, Users, Clock, Star, Gem, CheckCircle, Filter, Gamepad2, Sparkles, MapPin, ExternalLink, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { getPlayerRuns, getPlayerByUid, getCategories, getPlatforms, getPlayerPendingRuns, getLevels, getCategoriesFromFirestore, getUnclaimedRunsBySRCUsername, claimRun, runTypes } from "@/lib/db";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import LegoStudIcon from "@/components/icons/LegoStudIcon";
import { Player, LeaderboardEntry, Category } from "@/types/database";
import { formatDate, formatTime } from "@/lib/utils";
import { useAuth } from "@/components/AuthProvider";
import { getCategoryName, getPlatformName, getLevelName } from "@/lib/dataValidation";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
  const isOwnProfile = currentUser?.uid === playerId;

  useEffect(() => {
    const fetchPlayerData = async () => {
      if (!playerId) return;
      
      // Prevent accessing unclaimed player profiles (empty/null playerId)
      if (!playerId || playerId.trim() === "") {
        setPlayer(null);
        setPlayerRuns([]);
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        // Fetch player and runs first (most important data)
        const [fetchedPlayer, fetchedRuns] = await Promise.all([
          getPlayerByUid(playerId),
          getPlayerRuns(playerId)
        ]);
        
        // Double-check: if player is still unclaimed, don't show profile
        if (!fetchedPlayer || !fetchedPlayer.uid || fetchedPlayer.uid.trim() === "") {
          setPlayer(null);
          setPlayerRuns([]);
          setLoading(false);
          return;
        }
        
        setPlayer(fetchedPlayer);
        setPlayerRuns(fetchedRuns);
        
        // Fetch static data (categories, platforms, levels) in parallel - these can load after main content
        // This allows the page to render faster while these load
        Promise.all([
          getCategoriesFromFirestore('regular'),
          getCategoriesFromFirestore('individual-level'),
          getCategoriesFromFirestore('community-golds'),
          getPlatforms(),
          getLevels()
        ]).then(([regularCategories, ilCategories, cgCategories, fetchedPlatforms, fetchedLevels]) => {
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
        
        // Set loading to false early so main content can render
        setLoading(false);
        
        // Only fetch pending runs and unclaimed runs if viewing own profile
        // Fetch these in parallel and after main content loads (non-blocking)
        if (currentUser && currentUser.uid && currentUser.uid === playerId) {
          setLoadingPendingRuns(true);
          
          // Fetch pending and unclaimed runs in parallel
          const pendingRunsPromise = getPlayerPendingRuns(playerId).catch(() => []);
          const unclaimedRunsPromise = fetchedPlayer.srcUsername 
            ? getUnclaimedRunsBySRCUsername(fetchedPlayer.srcUsername).catch(() => [])
            : Promise.resolve([]);
          
          const [fetchedPending, fetchedUnclaimed] = await Promise.all([
            pendingRunsPromise,
            unclaimedRunsPromise
          ]);
          
          setPendingRuns(fetchedPending || []);
          setUnclaimedRuns(fetchedUnclaimed || []);
          setLoadingPendingRuns(false);
        } else {
          // Clear pending runs and unclaimed runs if not own profile
          setPendingRuns([]);
          setUnclaimedRuns([]);
        }
      } catch (error) {
        // Error handling - player data fetch failed
        setPlayer(null);
        setPlayerRuns([]);
        setLoading(false);
      }
    };

    fetchPlayerData();
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


  if (!player) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[hsl(240,21%,15%)] to-[hsl(235,19%,13%)] text-[hsl(220,17%,92%)] py-8">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h1 className="text-3xl font-bold mb-4">Player Not Found</h1>
          <p className="text-[hsl(222,15%,60%)] mb-8">The requested player could not be found.</p>
          <Button variant="outline" className="text-[hsl(220,17%,92%)] border-[hsl(235,13%,30%)] hover:bg-[hsl(234,14%,29%)]" asChild>
            <Link to="/leaderboards">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Leaderboards
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-ctp-text py-8 overflow-x-hidden relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 w-full">
        <div className="mb-8 mt-4 animate-fade-in">
          <Button variant="outline" className="text-ctp-text border-ctp-surface1/50 bg-glass hover:bg-ctp-surface0/50 hover:border-ctp-mauve/50 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-ctp-mauve/20 rounded-none backdrop-blur-sm" asChild>
            <Link to="/leaderboards">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Leaderboards
            </Link>
          </Button>
        </div>

        <div className="mb-8 animate-fade-in-delay">
          <h1 className="text-4xl font-bold mb-2">
            <span style={{ color: player.nameColor || 'inherit' }}>{player.displayName}</span>'s Profile
          </h1>
          <p className="text-ctp-overlay0 text-lg">View all runs and achievements</p>
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
          <div className="mt-8 animate-fade-in">
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
                        <TableCell className="py-3 px-4 font-mono text-ctp-text">{formatTime(run.time)}</TableCell>
                        <TableCell className="py-3 px-4 text-ctp-subtext1">{formatDate(run.date)}</TableCell>
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
          </div>
        )}

        <div className="mt-8 animate-fade-in-delay">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-ctp-text">
              <Trophy className="h-5 w-5 text-ctp-yellow" />
              Runs
            </h3>

            {/* Leaderboard Type Buttons */}
            <div className="grid grid-cols-3 mb-4 p-0.5 gap-1 bg-ctp-surface0/50 rounded-none border border-ctp-surface1">
              <Button
                variant={leaderboardType === 'regular' ? "default" : "ghost"}
                onClick={() => setLeaderboardType('regular')}
                className={`button-click-animation h-auto py-1.5 sm:py-2 px-2 sm:px-3 rounded-none transition-all duration-200 font-medium text-xs sm:text-sm whitespace-nowrap ${
                  leaderboardType === 'regular'
                    ? "bg-[#f9e2af] text-[#11111b] hover:bg-[#f9e2af]/90 shadow-sm"
                    : "text-ctp-text hover:bg-ctp-surface1 hover:text-ctp-text"
                }`}
              >
                <Trophy className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 sm:mr-1.5" />
                <span className="hidden min-[375px]:inline">Full Game</span>
                <span className="min-[375px]:hidden">Game</span>
              </Button>
              <Button
                variant={leaderboardType === 'individual-level' ? "default" : "ghost"}
                onClick={() => setLeaderboardType('individual-level')}
                className={`button-click-animation h-auto py-1.5 sm:py-2 px-2 sm:px-3 rounded-none transition-all duration-200 font-medium text-xs sm:text-sm whitespace-nowrap ${
                  leaderboardType === 'individual-level'
                    ? "bg-[#f9e2af] text-[#11111b] hover:bg-[#f9e2af]/90 shadow-sm"
                    : "text-ctp-text hover:bg-ctp-surface1 hover:text-ctp-text"
                }`}
              >
                <Star className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 sm:mr-1.5" />
                <span className="hidden sm:inline">Individual Levels</span>
                <span className="sm:hidden">ILs</span>
              </Button>
              <Button
                variant={leaderboardType === 'community-golds' ? "default" : "ghost"}
                onClick={() => setLeaderboardType('community-golds')}
                className={`button-click-animation h-auto py-1.5 sm:py-2 px-2 sm:px-3 rounded-none transition-all duration-200 font-medium text-xs sm:text-sm whitespace-nowrap ${
                  leaderboardType === 'community-golds'
                    ? "bg-[#f9e2af] text-[#11111b] hover:bg-[#f9e2af]/90 shadow-sm"
                    : "text-ctp-text hover:bg-ctp-surface1 hover:text-ctp-text"
                }`}
              >
                <Gem className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 sm:mr-1.5" />
                <span className="hidden sm:inline">Community Golds</span>
                <span className="sm:hidden">CGs</span>
              </Button>
            </div>

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

                  // Category buttons
                  const categoryButtons = categoriesWithRuns.length > 0 ? (
                    <div className="mb-4">
                      <div className="flex w-full p-1 gap-2 overflow-x-auto overflow-y-hidden scrollbar-thin scrollbar-thumb-ctp-surface1 scrollbar-track-transparent pb-3" style={{ minWidth: 'max-content' }}>
                        {categoriesWithRuns.map((category) => {
                          const isSelected = selectedCategory === category.id;
                          return (
                            <Button
                              key={category.id}
                              variant={isSelected ? "default" : "outline"}
                              onClick={() => setSelectedCategory(category.id)}
                              className={`button-click-animation whitespace-nowrap px-4 py-2 h-9 text-sm font-medium transition-all duration-200 ${
                                isSelected
                                  ? "bg-[#94e2d5] text-[#11111b] hover:bg-[#94e2d5]/90 border-transparent shadow-sm"
                                  : "bg-ctp-surface0 text-ctp-text border-ctp-surface1 hover:bg-ctp-surface1 hover:text-ctp-text hover:border-[#94e2d5]/50"
                              }`}
                            >
                              {category.name}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null;
                  
                  // Subcategory buttons (only for regular leaderboard type)
                  const subcategoryButtons = leaderboardType === 'regular' && availableSubcategories.length > 0 ? (
                    <div className="mb-6">
                      <div className="flex w-full p-1 gap-2 overflow-x-auto overflow-y-hidden scrollbar-thin scrollbar-thumb-ctp-surface1 scrollbar-track-transparent pb-3" style={{ minWidth: 'max-content' }}>
                        {availableSubcategories.map((subcategory) => {
                          const isSelected = selectedSubcategory === subcategory.id;
                          return (
                            <Button
                              key={subcategory.id}
                              variant={isSelected ? "default" : "outline"}
                              onClick={() => setSelectedSubcategory(subcategory.id)}
                              className={`button-click-animation whitespace-nowrap px-4 py-2 h-8 text-xs sm:text-sm font-medium transition-all duration-200 ${
                                isSelected
                                  ? "bg-[#cba6f7] text-[#11111b] hover:bg-[#cba6f7]/90 border-transparent shadow-sm"
                                  : "bg-ctp-surface0 text-ctp-text border-ctp-surface1 hover:bg-ctp-surface1 hover:text-ctp-text hover:border-[#cba6f7]/50"
                              }`}
                            >
                              {subcategory.name}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null;

                  return (
                    <>
                      {categoryButtons}
                      {subcategoryButtons}
                      
                      {/* Filters */}
                      <Card className="bg-gradient-to-br from-ctp-base to-ctp-mantle border-ctp-surface1 shadow-xl mb-6 rounded-none">
                        <CardHeader className="bg-gradient-to-r from-ctp-base to-ctp-mantle border-b border-ctp-surface1 py-3">
                          <CardTitle className="flex items-center gap-2 text-lg">
                            <Filter className="h-4 w-4 text-ctp-mauve" />
                            <span className="text-ctp-text">Filter Results</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 sm:p-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            {(leaderboardType === 'individual-level' || leaderboardType === 'community-golds') && (
                              <div>
                                <label className="block text-sm font-semibold mb-1.5 text-ctp-text flex items-center gap-2">
                                  <Sparkles className="h-3.5 w-3.5 text-ctp-mauve" />
                                  Levels
                                </label>
                                <Select value={selectedLevel} onValueChange={setSelectedLevel}>
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
                              <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
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
                                {selectedRunType === 'solo' ? (
                                  <User className="h-3.5 w-3.5 text-ctp-mauve" />
                                ) : (
                                  <Users className="h-3.5 w-3.5 text-ctp-mauve" />
                                )}
                                Run Type
                              </label>
                              <Select value={selectedRunType} onValueChange={setSelectedRunType}>
                                <SelectTrigger className="bg-ctp-base border-ctp-surface1 h-9 text-sm rounded-none">
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
                        </CardContent>
                      </Card>

                      {allRuns.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-ctp-overlay0">No runs found matching the selected filters</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto scrollbar-custom rounded-none border border-ctp-surface1/20">
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
                            
                            return (
                              <TableRow 
                                key={run.id} 
                                className="table-row-animate border-b border-ctp-surface1/20 hover:bg-ctp-surface0 hover:brightness-125 transition-all duration-150 cursor-pointer"
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
                                <TableCell className="py-2.5 px-4 font-semibold text-ctp-text">{formatTime(run.time)}</TableCell>
                                <TableCell className="py-2.5 px-4 text-ctp-subtext1 hidden sm:table-cell">{formatDate(run.date)}</TableCell>
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
                    </>
                  );
                })()}
            </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerDetails;