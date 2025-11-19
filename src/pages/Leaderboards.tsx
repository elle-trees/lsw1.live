import { useState, useEffect, useRef, useMemo, useCallback, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AnimatedCard } from "@/components/ui/animated-card";
import { FadeIn } from "@/components/ui/fade-in";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Filter, User, Users, Trophy, Sparkles, TrendingUp, Star, Gem, Gamepad2 } from "lucide-react";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { Pagination } from "@/components/Pagination";
import { getLeaderboardEntries, getCategories, getPlatforms, runTypes, getLevels } from "@/lib/db";
import { LeaderboardEntry, Category, Level } from "@/types/database";
import { Skeleton } from "@/components/ui/skeleton";
import LegoGoldBrickIcon from "@/components/icons/LegoGoldBrickIcon";

const Leaderboards = () => {
  const [leaderboardType, setLeaderboardType] = useState<'regular' | 'individual-level' | 'community-golds'>('regular');
  const [availableCategories, setAvailableCategories] = useState<Category[]>([]);
  const [availableLevels, setAvailableLevels] = useState<Level[]>([]);
  const [availablePlatforms, setAvailablePlatforms] = useState<{ id: string; name: string }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("");
  const [selectedRunType, setSelectedRunType] = useState(runTypes[0]?.id || "");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("");
  const [showObsoleteRuns, setShowObsoleteRuns] = useState("false");
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [levelsLoading, setLevelsLoading] = useState(true);
  const [subcategoriesLoading, setSubcategoriesLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [availableSubcategories, setAvailableSubcategories] = useState<Array<{ id: string; name: string }>>([]);
  const itemsPerPage = 25;
  const requestCounterRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastRefreshTimeRef = useRef<number>(Date.now());
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const fetchData = async () => {
      setCategoriesLoading(true);
      setLevelsLoading(true);
      try {
        // For Individual Level: fetch Story/Free Play categories
        // For Community Golds: fetch community-golds categories (now configurable)
        // For Regular: fetch regular categories
        const categoryType = leaderboardType;
        
        const [fetchedCategories, fetchedLevels, fetchedPlatforms] = await Promise.all([
          getCategories(categoryType),
          getLevels(),
          getPlatforms()
        ]);
        
        setAvailableCategories(fetchedCategories);
        setAvailableLevels(fetchedLevels);
        setAvailablePlatforms(fetchedPlatforms);
        
        if (fetchedCategories.length > 0) {
          setSelectedCategory(fetchedCategories[0].id);
        } else {
          setSelectedCategory("");
        }
        
        if (fetchedLevels.length > 0) {
          setSelectedLevel(fetchedLevels[0].id);
        } else {
          setSelectedLevel("");
        }
        
        if (fetchedPlatforms.length > 0 && !selectedPlatform) {
          setSelectedPlatform(fetchedPlatforms[0].id);
        }
      } catch (error) {
        // Silent fail
      } finally {
        setCategoriesLoading(false);
        setLevelsLoading(false);
      }
    };
    
    fetchData();
  }, [leaderboardType]);

  // Fetch subcategories when category changes (only for regular leaderboard type)
  useEffect(() => {
    const fetchSubcategories = async () => {
      if (leaderboardType === 'regular' && selectedCategory) {
        setSubcategoriesLoading(true);
        try {
          const categories = await getCategories('regular');
          const category = categories.find(c => c.id === selectedCategory);
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
        } finally {
          setSubcategoriesLoading(false);
        }
      } else {
        setAvailableSubcategories([]);
        setSelectedSubcategory("");
        setSubcategoriesLoading(false);
      }
    };
    
    fetchSubcategories();
  }, [selectedCategory, leaderboardType]);

  useEffect(() => {
    // Cancel previous request if it exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Increment request counter to track the latest request
    const currentRequest = ++requestCounterRef.current;
    
    const fetchLeaderboardData = async () => {
      setLoading(true);
      try {
        const data = await getLeaderboardEntries(
          selectedCategory,
          selectedPlatform,
          selectedRunType as 'solo' | 'co-op',
          showObsoleteRuns === "true",
          leaderboardType,
          (leaderboardType === 'individual-level' || leaderboardType === 'community-golds') ? selectedLevel : undefined,
          (leaderboardType === 'regular' && selectedSubcategory) ? selectedSubcategory : undefined
        );
        
        // Only update state if this is still the latest request
        if (currentRequest === requestCounterRef.current && !abortController.signal.aborted) {
        setLeaderboardData(data);
        setCurrentPage(1); // Reset to first page when data changes
        }
      } catch (error) {
        // Only handle error if this is still the latest request and not aborted
        if (currentRequest === requestCounterRef.current && !abortController.signal.aborted) {
        // Silent fail
        }
      } finally {
        // Only update loading state if this is still the latest request
        if (currentRequest === requestCounterRef.current) {
        setLoading(false);
        }
      }
    };

    const hasRequiredFilters = selectedCategory && selectedPlatform && selectedRunType;
    const hasLevelFilter = leaderboardType === 'regular' || selectedLevel;
    
    if (hasRequiredFilters && hasLevelFilter) {
      fetchLeaderboardData();
    } else {
      setLoading(false);
      setLeaderboardData([]);
    }

    // Cleanup: abort request on unmount or dependency change
    return () => {
      abortController.abort();
    };
  }, [selectedCategory, selectedPlatform, selectedRunType, selectedLevel, showObsoleteRuns, leaderboardType, selectedSubcategory]);
  
  // Only refresh when page becomes visible AND enough time has passed
  useEffect(() => {
    const MIN_REFRESH_INTERVAL = 60000; // Minimum 1 minute between refreshes
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const timeSinceLastRefresh = Date.now() - lastRefreshTimeRef.current;
        if (timeSinceLastRefresh < MIN_REFRESH_INTERVAL) {
          return; // Skip if refreshed recently
        }
        
        // Refresh data when user returns to the page
        if (selectedCategory && selectedPlatform && selectedRunType) {
          const hasLevelFilter = leaderboardType === 'regular' || selectedLevel;
          if (hasLevelFilter) {
            // Trigger a refresh by incrementing request counter
            requestCounterRef.current++;
            const fetchLeaderboardData = async () => {
              setLoading(true);
              try {
                const data = await getLeaderboardEntries(
                  selectedCategory,
                  selectedPlatform,
                  selectedRunType as 'solo' | 'co-op',
                  showObsoleteRuns === "true",
                  leaderboardType,
                  (leaderboardType === 'individual-level' || leaderboardType === 'community-golds') ? selectedLevel : undefined,
                  (leaderboardType === 'regular' && selectedSubcategory) ? selectedSubcategory : undefined
                );
                setLeaderboardData(data);
                setCurrentPage(1);
                lastRefreshTimeRef.current = Date.now();
              } catch (error) {
                // Silent fail
              } finally {
                setLoading(false);
              }
            };
            fetchLeaderboardData();
          }
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [selectedCategory, selectedPlatform, selectedRunType, selectedLevel, showObsoleteRuns, leaderboardType, selectedSubcategory]);

  return (
    <FadeIn className="min-h-screen bg-[#1e1e2e] text-ctp-text py-4 sm:py-6 overflow-x-hidden">
      <div className="max-w-[1920px] mx-auto px-2 sm:px-4 lg:px-6 w-full">
        <div className="text-center mb-6 animate-slide-up">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Trophy className="h-6 w-6 text-[#a6e3a1]" />
            <h1 className="text-3xl md:text-4xl font-bold text-[#a6e3a1]">
              Leaderboards
            </h1>
          </div>
          <p className="text-base text-ctp-subtext1 max-w-3xl mx-auto leading-relaxed">
            Browse the fastest times across all categories and platforms
          </p>
        </div>

        {/* Leaderboard Type Buttons */}
        <div className="grid grid-cols-3 mb-6 p-0.5 gap-1 bg-ctp-surface0/50 rounded-none border border-ctp-surface1 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <Button
            variant={leaderboardType === 'regular' ? "default" : "ghost"}
            onClick={() => startTransition(() => setLeaderboardType('regular'))}
            className={`button-click-animation h-auto py-2 sm:py-3 px-2 sm:px-4 rounded-none transition-all duration-200 ${
              leaderboardType === 'regular' 
                ? "bg-[#f9e2af] text-[#11111b] hover:bg-[#f9e2af]/90 shadow-sm" 
                : "text-ctp-text hover:bg-ctp-surface1 hover:text-ctp-text"
            } ${isPending ? 'opacity-70' : ''}`}
          >
            <div className="flex items-center justify-center gap-2">
              <Trophy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden min-[375px]:inline font-medium">Full Game</span>
              <span className="min-[375px]:hidden font-medium">Game</span>
            </div>
          </Button>
          <Button
            variant={leaderboardType === 'individual-level' ? "default" : "ghost"}
            onClick={() => startTransition(() => setLeaderboardType('individual-level'))}
            className={`button-click-animation h-auto py-2 sm:py-3 px-2 sm:px-4 rounded-none transition-all duration-200 ${
              leaderboardType === 'individual-level' 
                ? "bg-[#f9e2af] text-[#11111b] hover:bg-[#f9e2af]/90 shadow-sm" 
                : "text-ctp-text hover:bg-ctp-surface1 hover:text-ctp-text"
            } ${isPending ? 'opacity-70' : ''}`}
          >
            <div className="flex items-center justify-center gap-2">
              <Star className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline font-medium">Individual Levels</span>
              <span className="sm:hidden font-medium">ILs</span>
            </div>
          </Button>
          <Button
            variant={leaderboardType === 'community-golds' ? "default" : "ghost"}
            onClick={() => startTransition(() => setLeaderboardType('community-golds'))}
            className={`button-click-animation h-auto py-2 sm:py-3 px-2 sm:px-4 rounded-none transition-all duration-200 ${
              leaderboardType === 'community-golds' 
                ? "bg-[#f9e2af] text-[#11111b] hover:bg-[#f9e2af]/90 shadow-sm" 
                : "text-ctp-text hover:bg-ctp-surface1 hover:text-ctp-text"
            } ${isPending ? 'opacity-70' : ''}`}
          >
            <div className="flex items-center justify-center gap-2">
              <Gem className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline font-medium">Community Golds</span>
              <span className="sm:hidden font-medium">CGs</span>
            </div>
          </Button>
        </div>

        <div className="mt-0">
            {/* Category Buttons */}
            {(() => {
              // Filter out categories that are disabled for the selected level
              const filteredCategories = availableCategories.filter(category => {
                // Only filter if we have a level selected and it's IL or Community Golds
                if ((leaderboardType === 'individual-level' || leaderboardType === 'community-golds') && selectedLevel) {
                  const levelData = availableLevels.find(l => l.id === selectedLevel);
                  if (levelData && levelData.disabledCategories?.[category.id] === true) {
                    return false; // Category is disabled for this level
                  }
                }
                return true;
              });
              
              // If the currently selected category is disabled, reset to first available
              if (filteredCategories.length > 0 && !filteredCategories.find(c => c.id === selectedCategory)) {
                setTimeout(() => setSelectedCategory(filteredCategories[0].id), 0);
              }
              
              return categoriesLoading ? (
                <div className="mb-4">
                  <div className="flex w-full p-1 gap-2 overflow-x-auto overflow-y-hidden scrollbar-thin scrollbar-thumb-ctp-surface1 scrollbar-track-transparent pb-3">
                    {[...Array(6)].map((_, index) => (
                      <Skeleton 
                        key={index} 
                        className="h-9 w-24 flex-shrink-0 rounded-md"
                        style={{ animationDelay: `${index * 50}ms` }}
                      />
                    ))}
                  </div>
                </div>
              ) : filteredCategories.length > 0 ? (
                <>
                  <div className="mb-4 animate-slide-up-delay">
                    <div className="flex w-full p-1 gap-2 overflow-x-auto overflow-y-hidden scrollbar-thin scrollbar-thumb-ctp-surface1 scrollbar-track-transparent pb-3" style={{ minWidth: 'max-content' }}>
                        {filteredCategories.map((category, index) => {
                          const isSelected = selectedCategory === category.id;
                          return (
                          <Button 
                            key={category.id} 
                            variant={isSelected ? "default" : "outline"}
                            onClick={() => setSelectedCategory(category.id)}
                            className={`button-click-animation category-button-animate whitespace-nowrap px-4 py-2 h-9 text-sm font-medium transition-all duration-200 ${
                              isSelected 
                                ? "bg-[#94e2d5] text-[#11111b] hover:bg-[#94e2d5]/90 border-transparent shadow-sm" 
                                : "bg-ctp-surface0 text-ctp-text border-ctp-surface1 hover:bg-ctp-surface1 hover:text-ctp-text hover:border-[#94e2d5]/50"
                            }`}
                            style={{ animationDelay: `${index * 50}ms` }}
                          >
                            {category.name}
                          </Button>
                          );
                        })}
                    </div>
                  </div>
                  
                  {/* Subcategory Buttons (only for regular leaderboard type) */}
                  {leaderboardType === 'regular' && (() => {
                    // Check if the selected category has subcategories
                    const selectedCategoryData = availableCategories.find(c => c.id === selectedCategory);
                    const hasSubcategories = selectedCategoryData?.subcategories && selectedCategoryData.subcategories.length > 0;
                    
                    // Only show loading if we're loading AND the category has subcategories (or we don't know yet)
                    // Don't show loading if we know the category has no subcategories
                    if (subcategoriesLoading) {
                      // Only show loading skeleton if category data is available and has subcategories,
                      // or if category data isn't loaded yet (we don't know if it has subcategories)
                      if (!selectedCategoryData || hasSubcategories) {
                        return (
                          <div className="mb-6">
                            <div className="flex w-full p-1 gap-2 overflow-x-auto overflow-y-hidden scrollbar-thin scrollbar-thumb-ctp-surface1 scrollbar-track-transparent pb-3">
                              {[...Array(4)].map((_, index) => (
                                <Skeleton 
                                  key={index} 
                                  className="h-8 w-28 flex-shrink-0 rounded-md"
                                  style={{ animationDelay: `${index * 50}ms` }}
                                />
                              ))}
                            </div>
                          </div>
                        );
                      }
                      // Category has no subcategories, don't show loading
                      return null;
                    }
                    
                    // Show subcategories if available
                    if (availableSubcategories.length > 0) {
                      return (
                        <div className="mb-6 animate-slide-up-delay">
                          <div className="flex w-full p-1 gap-2 overflow-x-auto overflow-y-hidden scrollbar-thin scrollbar-thumb-ctp-surface1 scrollbar-track-transparent pb-3" style={{ minWidth: 'max-content' }}>
                              {availableSubcategories.map((subcategory, index) => {
                                const isSelected = selectedSubcategory === subcategory.id;
                                return (
                                <Button 
                                  key={subcategory.id} 
                                  variant={isSelected ? "default" : "outline"}
                                  onClick={() => setSelectedSubcategory(subcategory.id)}
                                  className={`button-click-animation category-button-animate whitespace-nowrap px-4 py-2 h-8 text-xs sm:text-sm font-medium transition-all duration-200 ${
                                    isSelected 
                                      ? "bg-[#cba6f7] text-[#11111b] hover:bg-[#cba6f7]/90 border-transparent shadow-sm" 
                                      : "bg-ctp-surface0 text-ctp-text border-ctp-surface1 hover:bg-ctp-surface1 hover:text-ctp-text hover:border-[#cba6f7]/50"
                                  }`}
                                  style={{ animationDelay: `${index * 50}ms` }}
                                >
                                  {subcategory.name}
                                </Button>
                              )})}
                          </div>
                        </div>
                      );
                    }
                    
                    // Don't render anything if no subcategories
                    return null;
                  })()}
                </>
              ) : (
                availableCategories.length > 0 && (
                  <div className="mb-4 p-4 bg-ctp-surface0 rounded-none border border-ctp-surface1">
                    <p className="text-sm text-ctp-subtext1">
                      No categories available for the selected level. Please enable categories for this level in the admin panel.
                    </p>
                  </div>
                )
              );
            })()}

        {/* Filters */}
            <AnimatedCard 
              className="bg-gradient-to-br from-ctp-base to-ctp-mantle border-ctp-surface1 shadow-xl mb-6 rounded-none overflow-hidden animate-slide-up-delay-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
          <CardHeader className="bg-gradient-to-r from-ctp-base to-ctp-mantle border-b border-ctp-surface1 py-4">
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <Filter className="h-5 w-5 text-ctp-mauve" />
              <span className="text-ctp-text">Filter Results</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
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
                      {availableLevels.map((level) => (
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
                    {availablePlatforms.map((platform) => (
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
              <div>
                <label className="block text-sm font-semibold mb-2 text-ctp-text flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-ctp-mauve" />
                  Run Status
                </label>
                <Select value={showObsoleteRuns} onValueChange={setShowObsoleteRuns}>
                  <SelectTrigger className="bg-ctp-base border-ctp-surface1 h-10 text-sm rounded-none focus:ring-ctp-mauve">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false" className="text-sm">Current Runs</SelectItem>
                    <SelectItem value="true" className="text-sm">All Runs (including obsolete)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </AnimatedCard>

        {/* Leaderboard Table */}
        <AnimatedCard 
          className="bg-gradient-to-br from-ctp-base to-ctp-mantle border-ctp-surface1 shadow-xl rounded-none overflow-hidden animate-slide-up-delay-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <CardHeader className="bg-gradient-to-r from-ctp-base to-ctp-mantle border-b border-ctp-surface1 py-4">
            <CardTitle className="flex items-center gap-2 text-lg text-[#a6e3a1]">
              <span>
                {availableCategories.find(c => c.id === selectedCategory)?.name || "Leaderboards"}
              </span>
              {leaderboardData.length > 0 && (
                <span className="ml-auto text-sm font-normal text-ctp-subtext1">
                  {leaderboardData.length} {leaderboardData.length === 1 ? 'entry' : 'entries'}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading || categoriesLoading ? (
              <div className="space-y-2 py-6 px-4">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-[90%]" />
              </div>
            ) : leaderboardData.length === 0 ? (
              <div className="text-center py-12 px-4">
                <div className="flex flex-col items-center gap-3">
                  <Trophy className="h-8 w-8 text-ctp-subtext1" />
                  <div>
                    <h3 className="text-base font-semibold mb-1 text-ctp-text">No entries found</h3>
                    <p className="text-sm text-ctp-subtext1">
                      Try adjusting your filters to see more results
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <LeaderboardTable 
                  data={leaderboardData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)} 
                  platforms={availablePlatforms} 
                  categories={availableCategories}
                  levels={availableLevels}
                  leaderboardType={leaderboardType}
                />
                {leaderboardData.length > itemsPerPage && (
                  <div className="px-4 pb-4 pt-2">
                    <Pagination
                      currentPage={currentPage}
                      totalPages={Math.ceil(leaderboardData.length / itemsPerPage)}
                      onPageChange={setCurrentPage}
                      itemsPerPage={itemsPerPage}
                      totalItems={leaderboardData.length}
                    />
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </AnimatedCard>
          </div>
      </div>
    </FadeIn>
  );
};

export default Leaderboards;