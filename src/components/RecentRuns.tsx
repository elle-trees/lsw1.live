import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Users, Trophy, Sparkles, TrendingUp, Gamepad2 } from "lucide-react";
import { LeaderboardEntry } from "@/types/database";
import { getCategories, getPlatforms } from "@/lib/db";
import { formatDate, formatTime } from "@/lib/utils";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";

interface RecentRunsProps {
  runs: LeaderboardEntry[];
  loading?: boolean;
  showRankBadge?: boolean;
}

export function RecentRuns({ runs, loading, showRankBadge = true }: RecentRunsProps) {
  const [platforms, setPlatforms] = useState<{ id: string; name: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [platformsData, categoriesData] = await Promise.all([
          getPlatforms(),
          getCategories()
        ]);
        setPlatforms(platformsData);
        setCategories(categoriesData);
      } catch (error) {
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

  // Function to get full platform name
  const getPlatformName = (platformId: string) => {
    const platform = platforms.find(p => p.id === platformId);
    return platform ? platform.name : null;
  };

  return (
    <Card className="bg-gradient-to-br from-[hsl(240,21%,15%)] to-[hsl(235,19%,13%)] border-[hsl(235,13%,30%)] shadow-xl h-full flex flex-col">
      <CardHeader className="bg-gradient-to-r from-[hsl(240,21%,18%)] to-[hsl(240,21%,15%)] border-b border-[hsl(235,13%,30%)] flex-shrink-0">
        <CardTitle className="flex items-center gap-2 text-ctp-text">
          <span>
            Recent Runs
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 sm:p-8 flex-1 overflow-y-auto">
        {loading ? (
          <LoadingSpinner size="sm" className="py-12" />
        ) : runs.length === 0 ? (
          <div className="text-center py-16">
            <Sparkles className="h-16 w-16 mx-auto mb-4 text-[hsl(222,15%,60%)] opacity-50" />
            <p className="text-lg text-[hsl(222,15%,60%)]">No recent runs yet</p>
          </div>
        ) : (
          <div className="space-y-5">
            {runs.map((run, index) => (
              <Link
                key={run.id}
                to={`/run/${run.id}`}
                className="group relative block overflow-hidden bg-gradient-to-br from-[hsl(240,21%,16%)] to-[hsl(235,19%,13%)] border border-[hsl(235,13%,30%)] hover:border-[hsl(var(--mocha-mauve))]/60 transition-all duration-500 hover:shadow-2xl hover:shadow-[hsl(var(--mocha-mauve))]/30 hover:-translate-y-1 animate-fade-in"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {/* Animated background gradient on hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--mocha-mauve))]/0 via-[hsl(var(--mocha-mauve))]/8 to-[hsl(var(--mocha-mauve))]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                {/* Shine effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                
                <div className="relative flex items-center justify-between p-6 sm:p-8">
                  <div className="flex items-center gap-6 flex-1 min-w-0">
                    {showRankBadge && (
                      <div className="flex-shrink-0">
                        {index < 3 ? (
                          <div className={`relative flex items-center justify-center w-16 h-16 font-bold text-xl shadow-xl group-hover:scale-110 transition-transform duration-300 ${
                            index === 0 
                              ? "bg-gradient-to-br from-[#FFD700] to-[#FFA500] text-[hsl(240,21%,15%)]" 
                              : index === 1 
                              ? "bg-gradient-to-br from-[#bac2de] to-[#89b4fa] text-[hsl(240,21%,15%)]" 
                              : "bg-gradient-to-br from-[#fab387] to-[#fe8019] text-[hsl(240,21%,15%)]"
                          }`}>
                            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
                            {index === 0 && (
                              <Trophy className="absolute -top-1 -right-1 h-5 w-5 text-[#FFD700] drop-shadow-lg animate-pulse" />
                            )}
                            <span className="relative z-10">#{index + 1}</span>
                          </div>
                        ) : (
                          <Badge 
                            variant="secondary"
                            className="w-16 h-16 flex items-center justify-center text-xl font-bold bg-gradient-to-br from-[hsl(240,21%,18%)] to-[hsl(235,19%,15%)] text-ctp-text border border-[hsl(235,13%,30%)] group-hover:border-[hsl(var(--mocha-mauve))]/50 group-hover:scale-110 transition-all duration-300"
                          >
                            #{index + 1}
                          </Badge>
                        )}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-3 flex-wrap">
                        <Link
                          to={`/player/${run.playerId}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-bold text-xl sm:text-2xl truncate hover:opacity-80 transition-all group-hover:scale-105"
                          style={{ color: run.nameColor || '#cba6f7' }}
                        >
                          {run.playerName}
                        </Link>
                        {run.player2Name && (
                          <>
                            <span className="text-ctp-overlay0 font-normal text-lg">&</span>
                            <span 
                              className="font-bold text-xl sm:text-2xl"
                              style={{ color: run.player2Color || '#cba6f7' }}
                            >
                              {run.player2Name}
                            </span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        {getCategoryName(run.category) && (
                          <Badge variant="outline" className="border-[hsl(235,13%,30%)] bg-[hsl(240,21%,18%)] text-ctp-text text-sm px-3 py-1.5 group-hover:border-[hsl(var(--mocha-mauve))]/50 transition-colors">
                            {getCategoryName(run.category)}
                          </Badge>
                        )}
                        {getPlatformName(run.platform) && (
                          <Badge variant="outline" className="border-[hsl(235,13%,30%)] bg-[hsl(240,21%,18%)] text-ctp-text text-sm px-3 py-1.5 group-hover:border-[hsl(var(--mocha-mauve))]/50 transition-colors">
                            <Gamepad2 className="h-4 w-4 mr-1.5" />
                            {getPlatformName(run.platform)}
                          </Badge>
                        )}
                        <Badge variant="outline" className="border-[hsl(235,13%,30%)] bg-[hsl(240,21%,18%)] text-ctp-text text-sm px-3 py-1.5 group-hover:border-[hsl(var(--mocha-mauve))]/50 transition-colors">
                          {run.runType === 'solo' ? <User className="h-4 w-4 mr-1.5" /> : <Users className="h-4 w-4 mr-1.5" />}
                          {run.runType.charAt(0).toUpperCase() + run.runType.slice(1)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-8 flex-shrink-0 ml-6">
                    <div className="text-left min-w-[140px]">
                      <div className="flex items-center gap-2 justify-start mb-2">
                        <p className="text-xl sm:text-2xl font-bold text-ctp-text group-hover:scale-110 transition-transform duration-300">
                          {formatTime(run.time)}
                        </p>
                      </div>
                      <p className="text-sm text-ctp-overlay0 mt-2 font-medium">
                        {formatDate(run.date)}
                      </p>
                    </div>
                    <div className="text-ctp-overlay0 group-hover:text-[hsl(var(--mocha-mauve))] transition-colors group-hover:translate-x-1 transition-transform duration-300">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}