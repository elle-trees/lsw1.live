import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sparkles, Info } from "lucide-react";
import { Player, LeaderboardEntry } from "@/types/database";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Pagination } from "@/components/Pagination";
import { getPlayersByPoints, getPlayerRuns, getCategories, getPlatforms } from "@/lib/db";
import { getCategoryName, getPlatformName } from "@/lib/dataValidation";
import LegoStudIcon from "@/components/icons/LegoStudIcon";

const PointsLeaderboard = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [playerRuns, setPlayerRuns] = useState<LeaderboardEntry[]>([]);
  const [loadingRuns, setLoadingRuns] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [platforms, setPlatforms] = useState<{ id: string; name: string }[]>([]);

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
      } catch (error) {
        // Silent fail
      } finally {
        setLoading(false);
      }
    };

    fetchPlayers();
    
    // Fetch categories and platforms for breakdown
    Promise.all([
      getCategories(),
      getPlatforms()
    ]).then(([cats, plats]) => {
      setCategories(cats);
      setPlatforms(plats);
    });
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
    }
  }, [dialogOpen, selectedPlayer?.uid]);

  const formatPoints = (points: number) => {
    return new Intl.NumberFormat().format(points);
  };

  // Calculate studs breakdown
  const studsBreakdown = useMemo(() => {
    if (!playerRuns.length) return null;

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

      // Use stored points if available, otherwise calculate (points should already be stored)
      const studs = run.points || 0;

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
  }, [playerRuns, categories, platforms]);

  const handlePlayerClick = (player: Player) => {
    setSelectedPlayer(player);
    setDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#1e1e2e] text-[hsl(220,17%,92%)] py-6 overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full">
        <div className="text-center mb-8 animate-fade-in">
          <div className="flex items-center justify-center gap-2 mb-4">
            <LegoStudIcon size={48} color="#fab387" />
            <h1 className="text-3xl md:text-4xl font-bold text-[#fab387]">
              Studs Leaderboard
            </h1>
          </div>
          <p className="text-base text-ctp-subtext1 max-w-3xl mx-auto animate-fade-in-delay">
            Top players ranked by their total studs earned from verified runs.
          </p>
        </div>

        <Card className="bg-gradient-to-br from-[hsl(240,21%,16%)] to-[hsl(235,19%,13%)] border-[hsl(235,13%,30%)] shadow-xl">
          <CardHeader className="bg-gradient-to-r from-[hsl(240,21%,18%)] to-[hsl(240,21%,15%)] border-b border-[hsl(235,13%,30%)]">
            <CardTitle className="flex items-center gap-2 text-xl text-[#fab387]">
              <span>
                Top Players by Studs
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 sm:p-8">
            {loading ? (
              <LoadingSpinner size="sm" className="py-12" />
            ) : players.length === 0 ? (
              <div className="text-center py-16">
                <Sparkles className="h-16 w-16 mx-auto mb-4 text-[hsl(222,15%,60%)] opacity-50" />
                <p className="text-lg text-[hsl(222,15%,60%)]">
                  No players with studs yet. Submit and verify runs to earn studs!
                </p>
              </div>
            ) : (
              <>
              <div className="space-y-4">
                  {players.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((player, index) => {
                  const rank = (currentPage - 1) * itemsPerPage + index + 1;
                  const points = player.totalPoints || 0;
                  const displayName = player.displayName || player.email?.split('@')[0] || "Unknown Player";
                  
                  return (
                    <div
                      key={player.uid}
                      onClick={() => handlePlayerClick(player)}
                      className="block group cursor-pointer"
                    >
                      <div
                        className={`relative overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl animate-fade-in ${
                          rank === 1
                            ? "bg-gradient-to-br from-[#89b4fa]/20 via-[#89b4fa]/15 to-[#89b4fa]/10 border-2 border-[#89b4fa]/50 hover:border-[#89b4fa] hover:shadow-[#89b4fa]/40"
                            : rank === 2
                            ? "bg-gradient-to-br from-[#74c7ec]/20 via-[#74c7ec]/15 to-[#74c7ec]/10 border-2 border-[#74c7ec]/50 hover:border-[#74c7ec] hover:shadow-[#74c7ec]/40"
                            : rank === 3
                            ? "bg-gradient-to-br from-[#89dceb]/20 via-[#89dceb]/15 to-[#89dceb]/10 border-2 border-[#89dceb]/50 hover:border-[#89dceb] hover:shadow-[#89dceb]/40"
                            : "bg-gradient-to-br from-[hsl(240,21%,16%)] to-[hsl(235,19%,13%)] border border-[hsl(235,13%,30%)] hover:border-[#fab387]/50 hover:shadow-[#fab387]/20"
                        }`}
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        {/* Animated background gradient on hover */}
                        <div className="absolute inset-0 bg-gradient-to-r from-[#fab387]/0 via-[#fab387]/10 to-[#fab387]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        
                        {/* Shine effect on hover */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                        
                        <div className="relative flex items-center gap-6 p-6 sm:p-8">
                          {/* Rank */}
                          <div className="flex items-center gap-3 flex-shrink-0">
                            {rank === 1 ? (
                              <div className="relative">
                                <div className="absolute inset-0 bg-[#0055BF]/30 blur-xl animate-pulse" />
                                <LegoStudIcon size={56} color="#0055BF" className="relative" />
                              </div>
                            ) : rank === 2 ? (
                              <div className="relative">
                                <div className="absolute inset-0 bg-[#FFD700]/30 blur-xl animate-pulse" />
                                <LegoStudIcon size={56} color="#FFD700" className="relative" />
                              </div>
                            ) : rank === 3 ? (
                              <div className="relative">
                                <div className="absolute inset-0 bg-[#C0C0C0]/30 blur-xl animate-pulse" />
                                <LegoStudIcon size={56} color="#C0C0C0" className="relative" />
                              </div>
                            ) : (
                              <span className="font-bold text-2xl text-ctp-text w-14 h-14 flex items-center justify-center bg-gradient-to-br from-[hsl(240,21%,18%)] to-[hsl(235,19%,15%)] border border-[hsl(235,13%,30%)] group-hover:border-[#fab387]/50 transition-colors">
                                #{rank}
                              </span>
                            )}
                          </div>

                          {/* Player Name */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span
                                className="font-bold text-xl sm:text-2xl group-hover:scale-105 transition-transform duration-300"
                                style={{ color: player.nameColor || "#cba6f7" }}
                              >
                                {displayName}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-ctp-subtext1">
                              <span className="bg-[hsl(240,21%,18%)] px-3 py-1 border border-[hsl(235,13%,30%)] group-hover:border-[#fab387]/50 transition-colors">
                                {player.totalRuns || 0} verified run{player.totalRuns !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>

                          {/* Studs */}
                          <div className="text-right flex-shrink-0">
                            <div className="flex items-center gap-2 justify-end mb-2">
                              <div className="relative">
                                <div className="absolute inset-0 bg-[#fab387]/20 blur-md group-hover:blur-lg transition-all duration-300" />
                                <LegoStudIcon size={28} color="#fab387" className="group-hover:scale-125 group-hover:rotate-90 transition-all duration-300 relative z-10" />
                              </div>
                              <div className="text-3xl sm:text-4xl font-bold text-[#fab387] group-hover:scale-110 transition-transform duration-300 relative">
                                <div className="absolute inset-0 bg-[#fab387]/10 blur-xl group-hover:blur-2xl transition-all duration-300" />
                                <span className="relative z-10">{formatPoints(points)}</span>
                              </div>
                            </div>
                            <div className="text-sm text-ctp-overlay0 uppercase tracking-wider font-semibold">studs</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
                {players.length > itemsPerPage && (
                  <Pagination
                    currentPage={currentPage}
                    totalPages={Math.ceil(players.length / itemsPerPage)}
                    onPageChange={setCurrentPage}
                    itemsPerPage={itemsPerPage}
                    totalItems={players.length}
                  />
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Studs System Explanation Accordion */}
        <div className="mt-8 animate-fade-in">
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

                  <div className="bg-[hsl(240,21%,18%)] border border-[hsl(235,13%,30%)] p-4 rounded">
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
        </div>

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
            
            {loadingRuns ? (
              <div className="py-12">
                <LoadingSpinner size="sm" />
              </div>
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
      
      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
          opacity: 0;
        }
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};

export default PointsLeaderboard;

