import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sparkles, Info } from "lucide-react";
import { Player, LeaderboardEntry } from "@/types/database";
import { Pagination } from "@/components/Pagination";
import { getPlayersByPoints, getPlayerRuns, getCategories, getPlatforms } from "@/lib/db";
import { getCategoryName, getPlatformName } from "@/lib/dataValidation";
import { calculatePoints } from "@/lib/utils";
import LegoStudIcon from "@/components/icons/LegoStudIcon";
import { FadeIn } from "@/components/ui/fade-in";
import { AnimatedCard } from "@/components/ui/animated-card";
import { PrefetchLink } from "@/components/PrefetchLink";
import { Skeleton } from "@/components/ui/skeleton";
import { pageCache } from "@/lib/pageCache";

const CACHE_KEY_PLAYERS = "points-leaderboard-players";
const CACHE_KEY_CATEGORIES = "points-leaderboard-categories";
const CACHE_KEY_PLATFORMS = "points-leaderboard-platforms";

const PointsLeaderboard = () => {
  // Check cache first for instant display
  const cachedPlayers = pageCache.get<Player[]>(CACHE_KEY_PLAYERS);
  const cachedCategories = pageCache.get<{ id: string; name: string }[]>(CACHE_KEY_CATEGORIES);
  const cachedPlatforms = pageCache.get<{ id: string; name: string }[]>(CACHE_KEY_PLATFORMS);
  
  const [players, setPlayers] = useState<Player[]>(cachedPlayers || []);
  const [loading, setLoading] = useState(!cachedPlayers);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [playerRuns, setPlayerRuns] = useState<LeaderboardEntry[]>([]);
  const [loadingRuns, setLoadingRuns] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>(cachedCategories || []);
  const [platforms, setPlatforms] = useState<{ id: string; name: string }[]>(cachedPlatforms || []);
  const [recalculatedPoints, setRecalculatedPoints] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    const fetchPlayers = async () => {
      setLoading(true);
      try {
        const playersData = await getPlayersByPoints(100);
        
        // Additional deduplication by UID and displayName as a safety measure
        // Also filter out "Unknown" players and unclaimed players
        const uniquePlayers = new Map<string, Player>();
        const seenUIDs = new Set<string>();
        const seenNames = new Map<string, string>(); // name -> uid
        
        for (const player of playersData) {
          if (!player.uid) continue;
          
          // Filter out "Unknown" players and unclaimed/temporary players
          const displayNameLower = player.displayName?.toLowerCase().trim() || "";
          if (displayNameLower === "unknown" || 
              player.uid.startsWith("unclaimed_") || 
              player.uid.startsWith("unlinked_") ||
              player.uid === "imported") {
            continue;
          }
          
          // Check by UID first
          if (seenUIDs.has(player.uid)) {
            const existing = uniquePlayers.get(player.uid);
            if (existing) {
              const existingPoints = existing.totalPoints || 0;
              const currentPoints = player.totalPoints || 0;
              if (currentPoints > existingPoints) {
                uniquePlayers.set(player.uid, player);
              }
            }
            continue;
          }
          
          // Check by displayName (case-insensitive)
          if (displayNameLower) {
            const existingUIDForName = seenNames.get(displayNameLower);
            if (existingUIDForName && existingUIDForName !== player.uid) {
              // Same name but different UID - treat as duplicate
              const existingPlayer = uniquePlayers.get(existingUIDForName);
              if (existingPlayer) {
                const existingPoints = existingPlayer.totalPoints || 0;
                const currentPoints = player.totalPoints || 0;
                if (currentPoints > existingPoints) {
                  uniquePlayers.delete(existingUIDForName);
                  uniquePlayers.set(player.uid, player);
                  seenNames.set(displayNameLower, player.uid);
                }
              }
              continue;
            }
          }
          
          // New unique player
          seenUIDs.add(player.uid);
          if (displayNameLower) {
            seenNames.set(displayNameLower, player.uid);
          }
          uniquePlayers.set(player.uid, player);
        }
        
        // Convert back to array and sort by points
        const deduplicatedPlayers = Array.from(uniquePlayers.values())
          .filter(p => (p.totalPoints || 0) > 0) // Only include players with points
          .sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));
        
        setPlayers(deduplicatedPlayers);
        // Cache the data for instant navigation
        pageCache.set(CACHE_KEY_PLAYERS, deduplicatedPlayers, 1000 * 60 * 5); // 5 minutes
      } catch (error) {
        // Silent fail
      } finally {
        setLoading(false);
      }
    };

    // Only fetch if not in cache
    if (!cachedPlayers) {
      fetchPlayers();
    }
    
    // Fetch categories and platforms for breakdown
    if (!cachedCategories || !cachedPlatforms) {
      Promise.all([
        getCategories(),
        getPlatforms()
      ]).then(([cats, plats]) => {
        setCategories(cats);
        setPlatforms(plats);
        pageCache.set(CACHE_KEY_CATEGORIES, cats, 1000 * 60 * 30); // 30 minutes
        pageCache.set(CACHE_KEY_PLATFORMS, plats, 1000 * 60 * 30); // 30 minutes
      });
    }
  }, []);

  // Fetch player runs when dialog opens
  useEffect(() => {
    if (dialogOpen && selectedPlayer?.uid) {
      setLoadingRuns(true);
      getPlayerRuns(selectedPlayer.uid)
        .then((runs) => {
          setPlayerRuns(runs);
        })
        .catch(() => {
          setPlayerRuns([]);
        })
        .finally(() => {
          setLoadingRuns(false);
        });
    } else {
      setPlayerRuns([]);
      setRecalculatedPoints(new Map());
    }
  }, [dialogOpen, selectedPlayer?.uid]);

  // Recalculate points for all runs using current configuration
  useEffect(() => {
    if (!playerRuns.length || !categories.length || !platforms.length) {
      setRecalculatedPoints(new Map());
      return;
    }

    const recalculate = async () => {
      const pointsMap = new Map<string, number>();
      
      for (const run of playerRuns) {
        if (!run.verified) {
          pointsMap.set(run.id, 0);
          continue;
        }

        const category = categories.find((c) => c.id === run.category);
        const platform = platforms.find((p) => p.id === run.platform);
        
        const calculated = await calculatePoints(
          run.time,
          category?.name || "Unknown",
          platform?.name || "Unknown",
          run.category,
          run.platform,
          run.rank,
          run.runType as 'solo' | 'co-op' | undefined,
          run.leaderboardType,
          run.isObsolete
        );
        pointsMap.set(run.id, calculated);
      }
      
      setRecalculatedPoints(pointsMap);
    };

    recalculate();
  }, [playerRuns, categories, platforms]);

  const formatPoints = (points: number) => {
    return new Intl.NumberFormat().format(points);
  };

  // Calculate studs breakdown using recalculated points
  const studsBreakdown = useMemo(() => {
    if (!playerRuns.length || recalculatedPoints.size === 0) return null;

    const breakdown = {
      byLeaderboardType: new Map<string, { studs: number; runs: number }>(),
      byCategory: new Map<string, { studs: number; runs: number }>(),
      byPlatform: new Map<string, { studs: number; runs: number }>(),
      byRunType: new Map<string, { studs: number; runs: number }>(),
      total: 0,
      totalRuns: playerRuns.length
    };

    playerRuns.forEach((run) => {
      const categoryName = getCategoryName(run.category, categories, run.srcCategoryName);
      const platformName = getPlatformName(run.platform, platforms);
      const runType = run.runType === 'co-op' ? 'Co-op' : 'Solo';
      const leaderboardType = run.leaderboardType === 'individual-level' ? 'Individual Levels' 
        : run.leaderboardType === 'community-golds' ? 'Community Golds' 
        : 'Full Game';

      // Use recalculated points from current configuration
      const studs = recalculatedPoints.get(run.id) || 0;

      breakdown.total += studs;

      // By leaderboard type
      const lbTypeData = breakdown.byLeaderboardType.get(leaderboardType) || { studs: 0, runs: 0 };
      lbTypeData.studs += studs;
      lbTypeData.runs += 1;
      breakdown.byLeaderboardType.set(leaderboardType, lbTypeData);

      // By category
      const catData = breakdown.byCategory.get(categoryName) || { studs: 0, runs: 0 };
      catData.studs += studs;
      catData.runs += 1;
      breakdown.byCategory.set(categoryName, catData);

      // By platform
      const platData = breakdown.byPlatform.get(platformName) || { studs: 0, runs: 0 };
      platData.studs += studs;
      platData.runs += 1;
      breakdown.byPlatform.set(platformName, platData);

      // By run type
      const rtData = breakdown.byRunType.get(runType) || { studs: 0, runs: 0 };
      rtData.studs += studs;
      rtData.runs += 1;
      breakdown.byRunType.set(runType, rtData);
    });

    return breakdown;
  }, [playerRuns, categories, platforms, recalculatedPoints]);

  const handlePlayerClick = (player: Player) => {
    setSelectedPlayer(player);
    setDialogOpen(true);
  };

  return (
    <FadeIn className="min-h-screen bg-[#1e1e2e] text-ctp-text py-4 sm:py-6 overflow-x-hidden">
      <div className="max-w-[1920px] mx-auto px-2 sm:px-4 lg:px-6 w-full">
        <AnimatedCard 
          className="bg-gradient-to-br from-ctp-base to-ctp-mantle border-ctp-surface1 shadow-xl rounded-none overflow-hidden"
          delay={0.1}
          hover={false}
        >
          <CardHeader className="bg-gradient-to-r from-ctp-base to-ctp-mantle border-b border-ctp-surface1 py-4">
            <CardTitle className="flex items-center gap-2 text-lg text-[#fab387]">
              <LegoStudIcon size={24} color="#fab387" />
              <span>Top Players by Studs</span>
              {players.length > 0 && !loading && (
                <span className="ml-auto text-sm font-normal text-ctp-subtext1">
                  {players.length} {players.length === 1 ? 'player' : 'players'}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="space-y-2 py-6 px-4">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-[90%]" />
              </div>
            ) : players.length === 0 ? (
              <div className="text-center py-12 px-4">
                <div className="flex flex-col items-center gap-3">
                  <Sparkles className="h-8 w-8 text-ctp-subtext1" />
                  <div>
                    <h3 className="text-base font-semibold mb-1 text-ctp-text">No players with studs yet</h3>
                    <p className="text-sm text-ctp-subtext1">
                      Submit and verify runs to earn studs!
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div className="overflow-x-auto scrollbar-custom">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-ctp-surface1/50 hover:bg-transparent bg-ctp-surface0/50">
                        <TableHead className="py-5 pl-4 pr-2 text-left text-sm font-semibold text-ctp-text whitespace-nowrap w-20">Rank</TableHead>
                        <TableHead className="py-5 pl-2 pr-4 text-left text-sm font-semibold text-ctp-text min-w-[200px]">Player</TableHead>
                        <TableHead className="py-5 px-4 text-left text-sm font-semibold text-ctp-text hidden sm:table-cell whitespace-nowrap">Runs</TableHead>
                        <TableHead className="py-5 pl-4 pr-8 text-right text-sm font-semibold text-ctp-text whitespace-nowrap">Studs</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {players.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((player, index) => {
                        const rank = (currentPage - 1) * itemsPerPage + index + 1;
                        const points = player.totalPoints || 0;
                        const displayName = player.displayName || player.email?.split('@')[0] || "Unknown Player";
                        
                        return (
                          <TableRow
                            key={player.uid}
                            onClick={() => handlePlayerClick(player)}
                            className="border-b border-ctp-surface1/20 cursor-pointer transition-colors duration-50 hover:bg-ctp-surface0"
                          >
                            <TableCell className="py-5 pl-4 pr-2">
                              <div className="flex items-center gap-1.5">
                                {rank === 1 ? (
                                  <LegoStudIcon size={40} color="#0055BF" />
                                ) : rank === 2 ? (
                                  <LegoStudIcon size={40} color="#FFD700" />
                                ) : rank === 3 ? (
                                  <LegoStudIcon size={40} color="#C0C0C0" />
                                ) : (
                                  <span className="font-semibold text-base text-ctp-text w-10 h-10 flex items-center justify-center">
                                    #{rank}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="py-5 pl-2 pr-4 min-w-[200px]">
                              <PrefetchLink 
                                to={`/player/${player.uid}`} 
                                params={{ playerId: player.uid }}
                                className="inline-block"
                                style={{ color: player.nameColor || '#cba6f7' }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <span className="font-semibold text-base whitespace-nowrap">{displayName}</span>
                              </PrefetchLink>
                            </TableCell>
                            <TableCell className="py-5 px-4 hidden sm:table-cell">
                              <span className="text-base text-ctp-subtext1 whitespace-nowrap">
                                {player.totalRuns || 0} verified run{player.totalRuns !== 1 ? 's' : ''}
                              </span>
                            </TableCell>
                            <TableCell className="py-5 pl-4 pr-8 text-right">
                              <div className="flex items-center gap-3 justify-end">
                                <LegoStudIcon size={32} color="#fab387" />
                                <span className="text-xl font-semibold text-[#fab387]">
                                  {formatPoints(points)}
                                </span>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                {players.length > itemsPerPage && (
                  <div className="px-4 pb-4 pt-2">
                    <Pagination
                      currentPage={currentPage}
                      totalPages={Math.ceil(players.length / itemsPerPage)}
                      onPageChange={setCurrentPage}
                      itemsPerPage={itemsPerPage}
                      totalItems={players.length}
                    />
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </AnimatedCard>

        {/* Studs System Explanation Accordion */}
        <FadeIn className="mt-8" delay={0.2}>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="studs-system" className="border-[hsl(235,13%,30%)]">
              <AccordionTrigger className="text-[#fab387] hover:text-[#fab387]/80 px-4 py-6">
                <div className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  <span className="text-lg font-semibold">How Studs Work</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-6 text-ctp-text">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-[#fab387] mb-3">Overview</h3>
                    <p className="text-ctp-text leading-relaxed">
                      Studs are awarded for all verified runs across Full Game, Individual Levels, and Community Golds leaderboards. 
                      All platforms and categories are eligible for studs. The points system is configurable by administrators.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-[#fab387] mb-3">How Studs Are Calculated</h3>
                    <div className="space-y-3 text-ctp-text">
                      <div>
                        <p className="font-medium mb-2">Base Points:</p>
                        <p className="text-ctp-subtext1 ml-2">
                          All verified runs receive base points. This is the foundation for all stud calculations.
                        </p>
                      </div>
                      <div>
                        <p className="font-medium mb-2">Rank Bonuses:</p>
                        <p className="text-ctp-subtext1 ml-2">
                          Full Game runs ranked 1st, 2nd, or 3rd receive additional bonus points. Rank bonuses can optionally be enabled for Individual Levels and Community Golds.
                        </p>
                      </div>
                      <div>
                        <p className="font-medium mb-2">Multipliers:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2 text-ctp-subtext1">
                          <li><strong>Co-op Multiplier:</strong> Applied to co-op runs to split points between players</li>
                          <li><strong>IL Multiplier:</strong> Applied to Individual Level runs</li>
                          <li><strong>Community Golds Multiplier:</strong> Applied to Community Golds runs</li>
                          <li><strong>Obsolete Multiplier:</strong> Applied to obsolete runs (typically reduces points)</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-[#fab387] mb-3">Calculation Formula</h3>
                    <div className="space-y-2 text-ctp-text">
                      <p className="text-ctp-subtext1">
                        Studs = (Base Points × Multiplier) + Rank Bonus (if applicable)
                      </p>
                      <p className="text-sm text-ctp-overlay0 mt-2 italic">
                        For co-op runs, the final result is multiplied by the co-op multiplier to split points between players.
                      </p>
                    </div>
                  </div>

                  <div className="bg-[hsl(240,21%,18%)] border border-[hsl(235,13%,30%)] p-4 rounded-none">
                    <p className="text-sm text-ctp-text leading-relaxed">
                      <strong className="text-[#fab387]">Note:</strong> Only verified runs count toward studs. 
                      Studs are automatically calculated and updated when runs are verified. 
                      The exact values for base points, rank bonuses, and multipliers can be configured by administrators in the Admin panel.
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </FadeIn>

        {/* Studs Breakdown Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-[#1e1e2e] border-[hsl(235,13%,30%)]">
            <DialogHeader>
              <DialogTitle className="text-2xl text-[#fab387] flex items-center gap-2">
                <LegoStudIcon size={28} color="#fab387" />
                {selectedPlayer?.displayName || "Unknown Player"}'s Studs Breakdown
              </DialogTitle>
              <DialogDescription className="text-ctp-subtext1">
                Total: {formatPoints(selectedPlayer?.totalPoints || 0)} studs from {selectedPlayer?.totalRuns || 0} verified run{selectedPlayer?.totalRuns !== 1 ? 's' : ''}
              </DialogDescription>
            </DialogHeader>
            
            {loadingRuns || (playerRuns.length > 0 && recalculatedPoints.size === 0) ? (
              <div className="py-12" />
            ) : studsBreakdown ? (
              <div className="space-y-6 mt-4">
                {/* By Leaderboard Type */}
                <Card className="bg-gradient-to-br from-[hsl(240,21%,16%)] to-[hsl(235,19%,13%)] border-[hsl(235,13%,30%)]">
                  <CardHeader>
                    <CardTitle className="text-lg text-[#fab387]">By Leaderboard Type</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow className="border-[hsl(235,13%,30%)]">
                          <TableHead className="text-ctp-text">Type</TableHead>
                          <TableHead className="text-ctp-text text-right">Studs</TableHead>
                          <TableHead className="text-ctp-text text-right">Runs</TableHead>
                          <TableHead className="text-ctp-text text-right">%</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Array.from(studsBreakdown.byLeaderboardType.entries())
                          .sort((a, b) => b[1].studs - a[1].studs)
                          .map(([type, data]) => (
                            <TableRow key={type} className="border-[hsl(235,13%,30%)]">
                              <TableCell className="font-medium text-ctp-text">{type}</TableCell>
                              <TableCell className="text-right text-[#fab387] font-semibold">
                                {formatPoints(data.studs)}
                              </TableCell>
                              <TableCell className="text-right text-ctp-subtext1">{data.runs}</TableCell>
                              <TableCell className="text-right text-ctp-subtext1">
                                {((data.studs / studsBreakdown.total) * 100).toFixed(1)}%
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* By Category */}
                <Card className="bg-gradient-to-br from-[hsl(240,21%,16%)] to-[hsl(235,19%,13%)] border-[hsl(235,13%,30%)]">
                  <CardHeader>
                    <CardTitle className="text-lg text-[#fab387]">By Category</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow className="border-[hsl(235,13%,30%)]">
                          <TableHead className="text-ctp-text">Category</TableHead>
                          <TableHead className="text-ctp-text text-right">Studs</TableHead>
                          <TableHead className="text-ctp-text text-right">Runs</TableHead>
                          <TableHead className="text-ctp-text text-right">%</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Array.from(studsBreakdown.byCategory.entries())
                          .sort((a, b) => b[1].studs - a[1].studs)
                          .slice(0, 10)
                          .map(([category, data]) => (
                            <TableRow key={category} className="border-[hsl(235,13%,30%)]">
                              <TableCell className="font-medium text-ctp-text">{category}</TableCell>
                              <TableCell className="text-right text-[#fab387] font-semibold">
                                {formatPoints(data.studs)}
                              </TableCell>
                              <TableCell className="text-right text-ctp-subtext1">{data.runs}</TableCell>
                              <TableCell className="text-right text-ctp-subtext1">
                                {((data.studs / studsBreakdown.total) * 100).toFixed(1)}%
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* By Platform */}
                <Card className="bg-gradient-to-br from-[hsl(240,21%,16%)] to-[hsl(235,19%,13%)] border-[hsl(235,13%,30%)]">
                  <CardHeader>
                    <CardTitle className="text-lg text-[#fab387]">By Platform</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow className="border-[hsl(235,13%,30%)]">
                          <TableHead className="text-ctp-text">Platform</TableHead>
                          <TableHead className="text-ctp-text text-right">Studs</TableHead>
                          <TableHead className="text-ctp-text text-right">Runs</TableHead>
                          <TableHead className="text-ctp-text text-right">%</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Array.from(studsBreakdown.byPlatform.entries())
                          .sort((a, b) => b[1].studs - a[1].studs)
                          .map(([platform, data]) => (
                            <TableRow key={platform} className="border-[hsl(235,13%,30%)]">
                              <TableCell className="font-medium text-ctp-text">{platform}</TableCell>
                              <TableCell className="text-right text-[#fab387] font-semibold">
                                {formatPoints(data.studs)}
                              </TableCell>
                              <TableCell className="text-right text-ctp-subtext1">{data.runs}</TableCell>
                              <TableCell className="text-right text-ctp-subtext1">
                                {((data.studs / studsBreakdown.total) * 100).toFixed(1)}%
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* By Run Type */}
                <Card className="bg-gradient-to-br from-[hsl(240,21%,16%)] to-[hsl(235,19%,13%)] border-[hsl(235,13%,30%)]">
                  <CardHeader>
                    <CardTitle className="text-lg text-[#fab387]">By Run Type</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow className="border-[hsl(235,13%,30%)]">
                          <TableHead className="text-ctp-text">Type</TableHead>
                          <TableHead className="text-ctp-text text-right">Studs</TableHead>
                          <TableHead className="text-ctp-text text-right">Runs</TableHead>
                          <TableHead className="text-ctp-text text-right">%</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Array.from(studsBreakdown.byRunType.entries())
                          .sort((a, b) => b[1].studs - a[1].studs)
                          .map(([type, data]) => (
                            <TableRow key={type} className="border-[hsl(235,13%,30%)]">
                              <TableCell className="font-medium text-ctp-text">{type}</TableCell>
                              <TableCell className="text-right text-[#fab387] font-semibold">
                                {formatPoints(data.studs)}
                              </TableCell>
                              <TableCell className="text-right text-ctp-subtext1">{data.runs}</TableCell>
                              <TableCell className="text-right text-ctp-subtext1">
                                {((data.studs / studsBreakdown.total) * 100).toFixed(1)}%
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="text-center py-12 text-ctp-subtext1">
                No runs found for this player.
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </FadeIn>
  );
};

export default PointsLeaderboard;

