import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Trophy, Medal, Award } from "lucide-react";
import { Player } from "@/types/database";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { getPlayersByPoints } from "@/lib/db";

const PointsLeaderboard = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlayers = async () => {
      setLoading(true);
      try {
        const playersData = await getPlayersByPoints(100);
        setPlayers(playersData);
      } catch (error) {
        // Silent fail
      } finally {
        setLoading(false);
      }
    };

    fetchPlayers();
  }, []);

  const getRankIcon = (rank: number) => {
    // Icons removed - just show rank numbers
    return null;
  };

  const formatPoints = (points: number) => {
    return new Intl.NumberFormat().format(points);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(240,21%,15%)] to-[hsl(235,19%,13%)] text-[hsl(220,17%,92%)] py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-10 animate-fade-in">
          <h1 className="text-4xl font-bold mb-4 flex items-center justify-center gap-2 bg-gradient-to-r from-[#FFD700] via-[#FFA500] to-[#FFD700] bg-clip-text text-transparent animate-gradient bg-[length:200%_auto]">
            <Trophy className="h-12 w-12 text-yellow-500 transition-transform duration-300 hover:rotate-12" />
            Points Leaderboard
          </h1>
          <p className="text-[hsl(222,15%,60%)] max-w-2xl mx-auto">
            Top players ranked by their total points. Points are only awarded for <strong>GameCube</strong> runs in <strong>Any%</strong> and <strong>Nocuts Noships</strong> categories. Points are calculated exponentially for faster times, with special bonuses for exceptional milestone times!
          </p>
        </div>

        <Card className="bg-[hsl(240,21%,15%)] border-[hsl(235,13%,30%)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Top Players by Points
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <LoadingSpinner size="sm" className="py-8" />
            ) : players.length === 0 ? (
              <div className="text-center py-8 text-[hsl(222,15%,60%)]">
                No players with points yet. Submit and verify runs to earn points!
              </div>
            ) : (
              <div className="space-y-2">
                {players.map((player, index) => {
                  const rank = index + 1;
                  const points = player.totalPoints || 0;
                  const displayName = player.displayName || player.email?.split('@')[0] || "Unknown Player";
                  
                  return (
                    <Link
                      key={player.uid}
                      to={`/player/${player.uid}`}
                      className="block"
                    >
                      <div
                        className={`flex items-center gap-4 p-4 rounded-lg transition-all duration-300 hover:bg-[hsl(235,19%,20%)] hover:shadow-lg ${
                          rank <= 3
                            ? "bg-gradient-to-r from-[hsl(240,21%,18%)] to-[hsl(240,21%,16%)] border border-[hsl(235,13%,30%)]"
                            : "bg-[hsl(240,21%,16%)]"
                        }`}
                      >
                        {/* Rank */}
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[hsl(235,13%,25%)] font-bold text-lg">
                          {getRankIcon(rank) || (
                            <span className={rank <= 10 ? "text-[#cba6f7]" : "text-[hsl(222,15%,60%)]"}>
                              {rank}
                            </span>
                          )}
                        </div>

                        {/* Player Name */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className="font-semibold text-lg"
                              style={{ color: player.nameColor || "#cba6f7" }}
                            >
                              {displayName}
                            </span>
                          </div>
                          <div className="text-sm text-[hsl(222,15%,60%)]">
                            {player.totalRuns || 0} verified run{player.totalRuns !== 1 ? 's' : ''}
                          </div>
                        </div>

                        {/* Points */}
                        <div className="text-right">
                          <div className="text-2xl font-bold bg-gradient-to-r from-[#FFD700] to-[#FFA500] bg-clip-text text-transparent">
                            {formatPoints(points)}
                          </div>
                          <div className="text-xs text-[hsl(222,15%,60%)]">points</div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PointsLeaderboard;

