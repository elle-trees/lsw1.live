import { useState, useEffect, useRef, useMemo, useCallback, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AnimatedCard } from "@/components/ui/animated-card";
import { FadeIn } from "@/components/ui/fade-in";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, AnimatedTabsList, AnimatedTabsTrigger, AnimatedTabsContent } from "@/components/ui/animated-tabs";
import { User, Users, Trophy, Sparkles, TrendingUp, Star, Gem, Gamepad2 } from "lucide-react";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { Pagination } from "@/components/Pagination";
import { getCategories, getPlatforms, runTypes, getLevels, subscribeToLeaderboardEntries } from "@/lib/db";
import type { Unsubscribe } from "firebase/firestore";
import { LeaderboardEntry, Category, Level } from "@/types/database";
import { Skeleton } from "@/components/ui/skeleton";
import LegoGoldBrickIcon from "@/components/icons/LegoGoldBrickIcon";
import { motion } from "framer-motion";
import { staggerContainerVariants, staggerItemVariants, fadeSlideUpVariants, transitions } from "@/lib/animations";
import { pageCache } from "@/lib/pageCache";
import { useTranslation } from "react-i18next";
import { getSubcategoryTranslation } from "@/lib/i18n/entity-translations";

const Leaderboards = () => {
  const { t } = useTranslation();
  const [leaderboardType, setLeaderboardType] = useState<'regular' | 'individual-level' | 'community-golds'>('regular');
  
  // Check cache for static data (levels and platforms are shared across all types)
  const getCacheKey = (type: string) => `leaderboards-${type}`;
  const cachedLevels = pageCache.get<Level[]>(getCacheKey('levels'));
  const cachedPlatforms = pageCache.get<{ id: string; name: string }[]>(getCacheKey('platforms'));
  
  // Check cache for categories based on initial leaderboardType
  const initialCategoryCacheKey = getCacheKey(`categories-regular`);
  const initialCachedCategories = pageCache.get<Category[]>(initialCategoryCacheKey);
  
  const [availableCategories, setAvailableCategories] = useState<Category[]>(initialCachedCategories || []);
  const [availableLevels, setAvailableLevels] = useState<Level[]>(cachedLevels || []);
  const [availablePlatforms, setAvailablePlatforms] = useState<{ id: string; name: string }[]>(cachedPlatforms || []);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("");
  const [selectedRunType, setSelectedRunType] = useState(runTypes[0]?.id || "");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("");
  const [showObsoleteRuns, setShowObsoleteRuns] = useState("false");
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(!initialCachedCategories);
  const [levelsLoading, setLevelsLoading] = useState(!cachedLevels);
  const [subcategoriesLoading, setSubcategoriesLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [availableSubcategories, setAvailableSubcategories] = useState<Array<{ id: string; name: string }>>([]);
  const itemsPerPage = 25;
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const fetchData = async () => {
      // Check cache for categories based on current leaderboardType
      const categoryCacheKey = getCacheKey(`categories-${leaderboardType}`);
      const cachedCategories = pageCache.get<Category[]>(categoryCacheKey);
      
      // Only show loading if not in cache
      setCategoriesLoading(!cachedCategories);
      setLevelsLoading(!cachedLevels);
      
      try {
        // For Individual Level: fetch Story/Free Play categories
        // For Community Golds: fetch community-golds categories (now configurable)
        // For Regular: fetch regular categories
        const categoryType = leaderboardType;
        
        // Fetch only what's not cached
        const fetchPromises: Promise<any>[] = [];
        let fetchedCategories = cachedCategories || [];
        let fetchedLevels = cachedLevels || [];
        let fetchedPlatforms = cachedPlatforms || [];
        
        if (!cachedCategories) {
          fetchPromises.push(
            getCategories(categoryType).then(cats => {
              fetchedCategories = cats;
              setAvailableCategories(cats);
              pageCache.set(categoryCacheKey, cats, 1000 * 60 * 30); // 30 minutes
            })
          );
        } else {
          setAvailableCategories(fetchedCategories);
        }
        
        if (!cachedLevels) {
          fetchPromises.push(
            getLevels().then(levels => {
              fetchedLevels = levels;
              setAvailableLevels(levels);
              pageCache.set(getCacheKey('levels'), levels, 1000 * 60 * 30); // 30 minutes
            })
          );
        } else {
          setAvailableLevels(fetchedLevels);
        }
        
        if (!cachedPlatforms) {
          fetchPromises.push(
            getPlatforms().then(platforms => {
              fetchedPlatforms = platforms;
              setAvailablePlatforms(platforms);
              pageCache.set(getCacheKey('platforms'), platforms, 1000 * 60 * 30); // 30 minutes
            })
          );
        } else {
          setAvailablePlatforms(fetchedPlatforms);
        }
        
        await Promise.all(fetchPromises);
        
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
        
        // Set default platform if empty - use functional update to avoid reading selectedPlatform
        if (fetchedPlatforms.length > 0) {
          setSelectedPlatform(prev => prev || fetchedPlatforms[0].id);
        }
      } catch (error) {
        // Silent fail
      } finally {
        setCategoriesLoading(false);
        setLevelsLoading(false);
      }
    };
    
    fetchData();
  }, [leaderboardType, cachedLevels, cachedPlatforms]);

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

  // Set up real-time listener for leaderboard data
  useEffect(() => {
    const hasRequiredFilters = selectedCategory && selectedPlatform && selectedRunType;
    const hasLevelFilter = leaderboardType === 'regular' || selectedLevel;
    
    if (!hasRequiredFilters || !hasLevelFilter) {
      setLoading(false);
      setLeaderboardData([]);
      return;
    }

    setLoading(true);
    let unsubscribe: Unsubscribe | null = null;
    let isMounted = true;

    (async () => {
      const { subscribeToLeaderboardEntries } = await import("@/lib/db/runs");
      if (!isMounted) return;
      
      unsubscribe = subscribeToLeaderboardEntries(
        (data) => {
          if (!isMounted) return;
          setLeaderboardData(data);
          setCurrentPage(1); // Reset to first page when data changes
          setLoading(false);
        },
        selectedCategory,
        selectedPlatform,
        selectedRunType as 'solo' | 'co-op',
        showObsoleteRuns === "true",
        leaderboardType,
        (leaderboardType === 'individual-level' || leaderboardType === 'community-golds') ? selectedLevel : undefined,
        (leaderboardType === 'regular' && selectedSubcategory) ? selectedSubcategory : undefined
      );
    })();

    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [selectedCategory, selectedPlatform, selectedRunType, selectedLevel, showObsoleteRuns, leaderboardType, selectedSubcategory]);

  return (
    <FadeIn className="min-h-screen bg-[#1e1e2e] text-ctp-text py-4 sm:py-6 overflow-x-hidden">
      <div className="max-w-[1920px] mx-auto px-2 sm:px-4 lg:px-6 w-full">
        {/* Leaderboard Type Tabs */}
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={fadeSlideUpVariants}
          transition={{ ...transitions.spring, delay: 0.1 }}
        >
          <Tabs value={leaderboardType} onValueChange={(value) => startTransition(() => setLeaderboardType(value as 'regular' | 'individual-level' | 'community-golds'))} className="w-full">
            <AnimatedTabsList className="grid grid-cols-3 mb-6 p-0 gap-1" indicatorClassName="h-0.5 bg-[#f9e2af]">
              <AnimatedTabsTrigger
                value="regular"
                className={`h-auto py-2 sm:py-3 px-2 sm:px-4 transition-all duration-200 data-[state=active]:text-[#f9e2af] ${isPending ? 'opacity-70' : ''}`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Trophy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden min-[375px]:inline font-medium">{t("submit.fullGame")}</span>
                  <span className="min-[375px]:hidden font-medium">{t("submit.game")}</span>
                </div>
              </AnimatedTabsTrigger>
              <AnimatedTabsTrigger
                value="individual-level"
                className={`h-auto py-2 sm:py-3 px-2 sm:px-4 transition-all duration-200 data-[state=active]:text-[#f9e2af] ${isPending ? 'opacity-70' : ''}`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Star className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline font-medium">{t("submit.individualLevels")}</span>
                  <span className="sm:hidden font-medium">{t("submit.ils")}</span>
                </div>
              </AnimatedTabsTrigger>
              <AnimatedTabsTrigger
                value="community-golds"
                className={`h-auto py-2 sm:py-3 px-2 sm:px-4 transition-all duration-200 data-[state=active]:text-[#f9e2af] ${isPending ? 'opacity-70' : ''}`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Gem className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline font-medium">{t("submit.communityGolds")}</span>
                  <span className="sm:hidden font-medium">{t("submit.golds")}</span>
                </div>
              </AnimatedTabsTrigger>
            </AnimatedTabsList>
          </Tabs>
        </motion.div>

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
                        className="h-9 w-24 flex-shrink-0 rounded-none"
                        style={{ animationDelay: `${index * 50}ms` }}
                      />
                    ))}
                  </div>
                </div>
              ) : filteredCategories.length > 0 ? (
                <>
                  <motion.div 
                    className="mb-4"
                    initial="hidden"
                    animate="visible"
                    variants={fadeSlideUpVariants}
                    transition={{ ...transitions.spring, delay: 0.15 }}
                  >
                    <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
                      <AnimatedTabsList 
                        className="flex w-full p-1 gap-2 overflow-x-auto overflow-y-visible scrollbar-thin scrollbar-thumb-ctp-surface1 scrollbar-track-transparent pb-3 relative" 
                        style={{ minWidth: 'max-content' }}
                        indicatorClassName="h-0.5 bg-[#94e2d5]"
                      >
                        {filteredCategories.map((category, index) => {
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
                  </motion.div>
                  
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
                                  className="h-8 w-28 flex-shrink-0 rounded-none"
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
                        <motion.div 
                          className="mb-6"
                          initial="hidden"
                          animate="visible"
                          variants={fadeSlideUpVariants}
                          transition={{ ...transitions.spring, delay: 0.2 }}
                        >
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
                                  {getSubcategoryTranslation(subcategory.id, subcategory.name)}
                                </AnimatedTabsTrigger>
                              )})}
                            </AnimatedTabsList>
                          </Tabs>
                        </motion.div>
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
                      {t("leaderboards.noCategoriesAvailable")}
                    </p>
                  </div>
                )
              );
            })()}

        {/* Leaderboard Table with Filters */}
        <AnimatedCard 
          className="bg-gradient-to-br from-ctp-base to-ctp-mantle border-ctp-surface1 shadow-xl rounded-none overflow-hidden"
          delay={0.25}
          hover={false}
        >
          <CardHeader className="bg-gradient-to-r from-ctp-base to-ctp-mantle border-b border-ctp-surface1 py-4">
            <CardTitle className="flex items-center gap-2 text-lg text-[#a6e3a1]">
              <span>
                {availableCategories.find(c => c.id === selectedCategory)?.name || t("leaderboards.title")}
              </span>
              {leaderboardData.length > 0 && (
                <span className="ml-auto text-sm font-normal text-ctp-subtext1">
                  {leaderboardData.length} {leaderboardData.length === 1 ? t("leaderboards.entry") : t("leaderboards.entries")}
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
                      {t("leaderboards.levels")}
                    </label>
                    <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                      <SelectTrigger className="bg-ctp-base border-ctp-surface1 h-10 text-sm rounded-none focus:ring-ctp-mauve">
                        <SelectValue placeholder={t("leaderboards.selectLevel")} />
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
                    {t("leaderboards.platform")}
                  </label>
                  <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                    <SelectTrigger className="bg-ctp-base border-ctp-surface1 h-10 text-sm rounded-none focus:ring-ctp-mauve">
                      <SelectValue placeholder={t("submit.selectPlatform")} />
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
                    {t("leaderboards.runType")}
                  </label>
                  <Select value={selectedRunType} onValueChange={setSelectedRunType}>
                    <SelectTrigger className="bg-ctp-base border-ctp-surface1 h-10 text-sm rounded-none focus:ring-ctp-mauve">
                      <SelectValue placeholder={t("submit.selectRunType")} />
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
                    {t("leaderboards.runStatus")}
                  </label>
                  <Select value={showObsoleteRuns} onValueChange={setShowObsoleteRuns}>
                    <SelectTrigger className="bg-ctp-base border-ctp-surface1 h-10 text-sm rounded-none focus:ring-ctp-mauve">
                      <SelectValue placeholder={t("leaderboards.selectStatus")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="false" className="text-sm">{t("leaderboards.currentRuns")}</SelectItem>
                      <SelectItem value="true" className="text-sm">{t("leaderboards.allRunsIncludingObsolete")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
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
                    <h3 className="text-base font-semibold mb-1 text-ctp-text">{t("leaderboards.noEntriesFound")}</h3>
                    <p className="text-sm text-ctp-subtext1">
                      {t("leaderboards.tryAdjustingFilters")}
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