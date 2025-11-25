import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { User, Users, Trophy, Sparkles, Check } from "lucide-react";
import { LeaderboardEntry } from "@/types/database";
import { getCategories, getPlatforms } from "@/lib/db";
import { formatTime } from "@/lib/utils";
import { PrefetchLink } from "@/components/PrefetchLink";
import { useState, useEffect } from "react";
import LegoStudIcon from "@/components/icons/LegoStudIcon";
import { getPlatformName } from "@/lib/dataValidation";
import { usePrefetchVisible } from "@/hooks/usePrefetch";
import { useTranslation } from "react-i18next";

interface RecentRunsProps {
  runs: LeaderboardEntry[];
  loading?: boolean;
  showRankBadge?: boolean;
  maxRuns?: number; // Optional max runs to display
}

export function RecentRuns({ runs, loading, showRankBadge = true, maxRuns }: RecentRunsProps) {
  const { t } = useTranslation();
  const [platforms, setPlatforms] = useState<{ id: string; name: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const { prefetchItem } = usePrefetchVisible([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [platformsData, categoriesData] = await Promise.all([
          getPlatforms(),
          getCategories()
        ]);
        setPlatforms(platformsData);
        setCategories(categoriesData);
      } catch (_error) {
        // Silent fail
      }
    };
    fetchData();
  }, []);

  // Function to get full category name
  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : null;
  };

  // Filter out individual level runs
  const filteredRuns = runs.filter(run => {
    const runLeaderboardType = run.leaderboardType || 'regular';
    return runLeaderboardType !== 'individual-level';
  });

  // Get visible runs based on maxRuns prop
  const visibleRuns = maxRuns ? filteredRuns.slice(0, maxRuns) : filteredRuns;

  if (loading) {
    return (
      <div className="overflow-x-auto scrollbar-custom">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-ctp-surface1/50 hover:bg-transparent bg-ctp-surface0/50">
              {showRankBadge && <TableHead className="py-4 pl-4 pr-2 text-left text-base font-semibold text-ctp-text whitespace-nowrap w-20">{t("components.rank")}</TableHead>}
              <TableHead className="py-4 pl-2 pr-3 text-left text-base font-semibold text-ctp-text min-w-[250px]">{t("components.player")}</TableHead>
              <TableHead className="py-4 px-3 text-left text-base font-semibold text-ctp-text hidden sm:table-cell whitespace-nowrap w-32">{t("components.time")}</TableHead>
              <TableHead className="py-4 px-3 text-left text-base font-semibold text-ctp-text hidden md:table-cell whitespace-nowrap w-36">{t("components.date")}</TableHead>
              <TableHead className="py-4 px-3 text-left text-base font-semibold text-ctp-text hidden lg:table-cell whitespace-nowrap w-40">{t("components.platform")}</TableHead>
              <TableHead className="py-4 px-3 text-left text-base font-semibold text-ctp-text hidden lg:table-cell whitespace-nowrap w-32">{t("components.type")}</TableHead>
              <TableHead className="py-4 px-3 text-left text-base font-semibold text-ctp-text hidden lg:table-cell whitespace-nowrap w-40">{t("components.category")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, index) => (
              <TableRow key={index} className="border-b border-ctp-surface1/20">
                {showRankBadge && (
                  <TableCell className="py-4 pl-4 pr-2">
                    <Skeleton className="w-10 h-10" />
                  </TableCell>
                )}
                <TableCell className="py-4 pl-2 pr-3">
                  <Skeleton className="h-5 w-40" />
                </TableCell>
                <TableCell className="py-4 px-3 hidden sm:table-cell">
                  <Skeleton className="h-5 w-20" />
                </TableCell>
                <TableCell className="py-4 px-3 hidden md:table-cell">
                  <Skeleton className="h-5 w-24" />
                </TableCell>
                <TableCell className="py-4 px-3 hidden lg:table-cell">
                  <Skeleton className="h-5 w-28" />
                </TableCell>
                <TableCell className="py-4 px-3 hidden lg:table-cell">
                  <Skeleton className="h-5 w-20" />
                </TableCell>
                <TableCell className="py-4 px-3 hidden lg:table-cell">
                  <Skeleton className="h-5 w-28" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (filteredRuns.length === 0) {
    return (
      <div className="text-center py-16">
        <Sparkles className="h-16 w-16 mx-auto mb-4 text-ctp-overlay0 opacity-50" />
        <p className="text-lg text-ctp-overlay0">{t("components.noRecentRuns")}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto scrollbar-custom">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-ctp-surface1/50 hover:bg-transparent bg-ctp-surface0/50">
            {showRankBadge && <TableHead className="py-4 pl-4 pr-2 text-left text-base font-semibold text-ctp-text whitespace-nowrap w-20">{t("components.rank")}</TableHead>}
            <TableHead className="py-4 pl-2 pr-3 text-left text-base font-semibold text-ctp-text min-w-[250px]">{t("components.player")}</TableHead>
            <TableHead className="py-4 px-3 text-left text-base font-semibold text-ctp-text hidden sm:table-cell whitespace-nowrap w-32">{t("components.time")}</TableHead>
            <TableHead className="py-4 px-3 text-left text-base font-semibold text-ctp-text hidden md:table-cell whitespace-nowrap w-36">{t("components.date")}</TableHead>
            <TableHead className="py-4 px-3 text-left text-base font-semibold text-ctp-text hidden lg:table-cell whitespace-nowrap w-40">{t("components.platform")}</TableHead>
            <TableHead className="py-4 px-3 text-left text-base font-semibold text-ctp-text hidden lg:table-cell whitespace-nowrap w-32">{t("components.type")}</TableHead>
            <TableHead className="py-4 px-3 text-left text-base font-semibold text-ctp-text hidden lg:table-cell whitespace-nowrap w-40">{t("components.category")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleRuns.map((run, index) => {
            const rank = index + 1;
            const platformName = getPlatformName(
              run.platform,
              platforms,
              run.srcPlatformName
            );

            const isHighlighted = highlightedId === run.id;
            
            return (
              <TableRow 
                key={run.id} 
                onMouseEnter={() => setHighlightedId(run.id)}
                onMouseLeave={() => setHighlightedId(null)}
                className={`table-row-animate border-b border-ctp-surface1/20 transition-colors duration-50 ${isHighlighted ? 'bg-ctp-surface0' : ''} ${run.isObsolete ? 'opacity-60 italic' : ''}`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {showRankBadge && (
                  <TableCell className="py-4 pl-4 pr-2">
                    <PrefetchLink to="/run/$runId" params={{ runId: run.id }} className="block" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        {rank === 1 ? (
                          <LegoStudIcon size={36} color="#0055BF" />
                        ) : rank === 2 ? (
                          <LegoStudIcon size={36} color="#FFD700" />
                        ) : rank === 3 ? (
                          <LegoStudIcon size={36} color="#C0C0C0" />
                        ) : (
                          <span className="font-semibold text-base text-ctp-text w-10 h-10 flex items-center justify-center">
                            #{rank}
                          </span>
                        )}
                        {run.isObsolete && (
                          <Badge variant="destructive" className="bg-red-800/50 text-red-200 text-xs px-2 py-1 border border-red-700/30">
                            {t("components.obsolete")}
                          </Badge>
                        )}
                      </div>
                    </PrefetchLink>
                  </TableCell>
                )}
                <TableCell className="py-4 pl-2 pr-3 min-w-[250px]">
                  <div className="flex items-center gap-2 flex-wrap">
                    {(() => {
                      // Check if run is unclaimed - simply check if playerId is empty/null
                      const isUnclaimed = !run.playerId || run.playerId.trim() === "";
                      
                      if (isUnclaimed) {
                        // For unclaimed runs, show name without link
                        return (
                          <>
                            <span className="font-semibold text-base whitespace-nowrap text-ctp-text">{run.playerName}</span>
                            {run.player2Name && (
                              <>
                                <span className="text-ctp-overlay0 text-base"> & </span>
                                <span className="font-semibold text-base whitespace-nowrap text-ctp-text">
                                  {run.player2Name}
                                </span>
                              </>
                            )}
                            {rank === 1 && !run.isObsolete && (
                              <Badge className="bg-gradient-to-r from-[#0055BF] to-[#0070f3] text-white text-sm px-2 py-1 border border-[#0055BF]/50 flex items-center gap-1.5 font-semibold">
                                <Trophy className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">{t("components.worldRecord")}</span>
                                <span className="sm:hidden">{t("components.worldRecordShort")}</span>
                              </Badge>
                            )}
                          </>
                        );
                      } else {
                        // For claimed runs, show with link and check icon
                        return (
                          <>
                            <PrefetchLink 
                              to="/player/$playerId" 
                              params={{ playerId: run.playerId }}
                              className="inline-block"
                              style={{ color: run.nameColor || '#cba6f7' }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span className="font-semibold text-base whitespace-nowrap">{run.playerName}</span>
                            </PrefetchLink>
                            {run.player2Name && (
                              <>
                                <span className="text-ctp-overlay0 text-base"> & </span>
                                {run.player2Id && run.player2Id.trim() !== "" ? (
                                  <PrefetchLink 
                                    to="/player/$playerId" 
                                    params={{ playerId: run.player2Id }}
                                    className="inline-block"
                                    style={{ color: run.player2Color || '#cba6f7' }}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <span className="font-semibold text-base whitespace-nowrap">{run.player2Name}</span>
                                  </PrefetchLink>
                                ) : (
                                  <span className="font-semibold text-base whitespace-nowrap text-ctp-text">{run.player2Name}</span>
                                )}
                              </>
                            )}
                            <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                            {rank === 1 && !run.isObsolete && (
                              <Badge className="bg-gradient-to-r from-[#0055BF] to-[#0070f3] text-white text-sm px-2 py-1 border border-[#0055BF]/50 flex items-center gap-1.5 font-semibold">
                                <Trophy className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">{t("components.worldRecord")}</span>
                                <span className="sm:hidden">{t("components.worldRecordShort")}</span>
                              </Badge>
                            )}
                          </>
                        );
                      }
                    })()}
                  </div>
                  <div className="sm:hidden mt-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base font-semibold text-ctp-text">{formatTime(run.time)}</span>
                      {platformName && (
                        <Badge variant="outline" className="border-ctp-surface1 bg-ctp-surface0 text-ctp-text text-sm px-2 py-1">
                          {platformName}
                        </Badge>
                      )}
                      <Badge variant="outline" className="border-ctp-surface1 bg-ctp-surface0 text-ctp-text flex items-center gap-1.5 w-fit text-sm px-2 py-1">
                        {run.runType === 'solo' ? <User className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                        {run.runType === 'solo' ? t("stats.solo") : t("stats.coop")}
                      </Badge>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="py-4 px-3 hidden sm:table-cell text-left">
                  <PrefetchLink to={`/run/${run.id}`} params={{ runId: run.id }} className="block" onClick={(e) => e.stopPropagation()}>
                    <span className="text-base font-semibold text-ctp-text">
                      {formatTime(run.time)}
                    </span>
                  </PrefetchLink>
                </TableCell>
                <TableCell className="py-4 px-3 hidden md:table-cell text-left">
                  <PrefetchLink to={`/run/${run.id}`} params={{ runId: run.id }} className="block" onClick={(e) => e.stopPropagation()}>
                    <span className="text-base text-ctp-subtext1 whitespace-nowrap">{run.date}</span>
                  </PrefetchLink>
                </TableCell>
                <TableCell className="py-4 px-3 hidden lg:table-cell">
                  <PrefetchLink to={`/run/${run.id}`} params={{ runId: run.id }} className="block" onClick={(e) => e.stopPropagation()}>
                    {platformName && (
                      <Badge variant="outline" className="border-ctp-surface1/50 bg-ctp-surface0/50 text-ctp-text text-sm px-2 py-1">
                        {platformName}
                      </Badge>
                    )}
                  </PrefetchLink>
                </TableCell>
                <TableCell className="py-4 px-3 hidden lg:table-cell">
                  <PrefetchLink to={`/run/${run.id}`} params={{ runId: run.id }} className="block" onClick={(e) => e.stopPropagation()}>
                    <Badge variant="outline" className="border-ctp-surface1/50 bg-ctp-surface0/50 text-ctp-text flex items-center gap-1.5 w-fit text-sm px-2 py-1">
                      {run.runType === 'solo' ? <User className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                      {run.runType === 'solo' ? t("stats.solo") : t("stats.coop")}
                    </Badge>
                  </PrefetchLink>
                </TableCell>
                <TableCell className="py-4 px-3 hidden lg:table-cell">
                  <PrefetchLink to={`/run/${run.id}`} params={{ runId: run.id }} className="block" onClick={(e) => e.stopPropagation()}>
                    {getCategoryName(run.category) && (
                      <Badge variant="outline" className="border-ctp-surface1/50 bg-ctp-surface0/50 text-ctp-text text-sm px-2 py-1">
                        {getCategoryName(run.category)}
                      </Badge>
                    )}
                  </PrefetchLink>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}