import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlayerProfile } from "@/components/PlayerProfile";
import { ArrowLeft, Trophy, User, Users, Clock, Star, Gem } from "lucide-react";
import { Link } from "react-router-dom";
import { getPlayerRuns, getPlayerByUid, getCategories, getPlatforms, getPlayerPendingRuns, getLevels } from "@/lib/db";
import LegoStudIcon from "@/components/icons/LegoStudIcon";
import { Player, LeaderboardEntry } from "@/types/database";
import { formatDate, formatTime } from "@/lib/utils";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useAuth } from "@/components/AuthProvider";

const PlayerDetails = () => {
  const { playerId } = useParams<{ playerId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [player, setPlayer] = useState<Player | null>(null);
  const [playerRuns, setPlayerRuns] = useState<LeaderboardEntry[]>([]);
  const [pendingRuns, setPendingRuns] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [platforms, setPlatforms] = useState<{ id: string; name: string }[]>([]);
  const [levels, setLevels] = useState<{ id: string; name: string }[]>([]);
  const [leaderboardType, setLeaderboardType] = useState<'regular' | 'individual-level' | 'community-golds'>('regular');
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
        const [fetchedPlayer, fetchedRuns, fetchedCategories, fetchedPlatforms, fetchedLevels] = await Promise.all([
          getPlayerByUid(playerId),
          getPlayerRuns(playerId),
          getCategories(),
          getPlatforms(),
          getLevels()
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
        setCategories(fetchedCategories);
        setPlatforms(fetchedPlatforms);
        setLevels(fetchedLevels);
        
        // Only fetch pending runs if viewing own profile
        // Check both currentUser exists and uid matches playerId
        if (currentUser && currentUser.uid && currentUser.uid === playerId) {
          try {
            const fetchedPending = await getPlayerPendingRuns(playerId);
            setPendingRuns(fetchedPending || []);
          } catch (error) {
            setPendingRuns([]);
          }
        } else {
          // Clear pending runs if not own profile
          setPendingRuns([]);
        }
      } catch (error) {
        // Error handling - player data fetch failed
        setPlayer(null);
        setPlayerRuns([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPlayerData();
  }, [playerId, currentUser?.uid]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[hsl(240,21%,15%)] to-[hsl(235,19%,13%)] text-[hsl(220,17%,92%)] flex items-center justify-center">
        <LoadingSpinner size="md" />
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
        <div className="mb-6 animate-fade-in">
          <Button variant="outline" className="text-ctp-text border-ctp-surface1/50 bg-glass hover:bg-ctp-surface0/50 hover:border-ctp-mauve/50 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-ctp-mauve/20 rounded-lg backdrop-blur-sm" asChild>
            <Link to="/leaderboards">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Leaderboards
            </Link>
          </Button>
        </div>

        <div className="mb-8 animate-fade-in-delay">
          <h1 className="text-4xl font-bold mb-2">
            <span className="text-glow" style={{ color: player.nameColor || '#cba6f7' }}>{player.displayName}</span>
            <span className="text-ctp-text">'s Profile</span>
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
        {isOwnProfile && (
          <Card className="glass shadow-colored card-hover-subtle rounded-xl border-ctp-surface1/50 mt-8 overflow-hidden relative animate-fade-in-delay-2">
            <div className="absolute inset-0 bg-gradient-to-br from-ctp-yellow/5 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500" />
            <CardHeader className="bg-gradient-to-r from-ctp-surface0/30 to-ctp-surface1/20 border-b border-ctp-surface1/50 relative z-10">
              <CardTitle className="flex items-center gap-2 text-ctp-text font-bold">
                <Clock className="h-5 w-5 text-ctp-yellow" />
                Pending Submissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingRuns.length === 0 ? (
                <p className="text-ctp-overlay0 text-center py-4">No pending submissions</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[hsl(235,13%,30%)]">
                        <th className="py-3 px-4 text-left">Category</th>
                        <th className="py-3 px-4 text-left">Time</th>
                        <th className="py-3 px-4 text-left">Date</th>
                        <th className="py-3 px-4 text-left">Platform</th>
                        <th className="py-3 px-4 text-left">Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingRuns.map((run) => {
                        const categoryName = categories.find(c => c.id === run.category)?.name || run.category;
                        const platformName = platforms.find(p => p.id === run.platform)?.name || run.platform;
                        
                        return (
                          <tr 
                            key={run.id} 
                            className="border-b border-[hsl(235,13%,30%)] hover:bg-[hsl(235,19%,13%)] cursor-pointer transition-colors"
                            onClick={() => navigate(`/run/${run.id}`)}
                          >
                            <td className="py-3 px-4 font-medium">{categoryName}</td>
                            <td className="py-3 px-4 font-mono">{formatTime(run.time)}</td>
                            <td className="py-3 px-4 text-ctp-overlay0">{formatDate(run.date)}</td>
                            <td className="py-3 px-4">
                              <Badge variant="outline" className="border-[hsl(235,13%,30%)]">
                                {platformName}
                              </Badge>
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant="outline" className="border-[hsl(235,13%,30%)] flex items-center gap-1 w-fit">
                                {run.runType === 'solo' ? <User className="h-3 w-3" /> : <Users className="h-3 w-3" />}
                                {run.runType.charAt(0).toUpperCase() + run.runType.slice(1)}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="glass shadow-colored card-hover-subtle rounded-xl border-ctp-surface1/50 mt-8 overflow-hidden relative animate-fade-in-delay-2">
          <div className="absolute inset-0 bg-gradient-to-br from-ctp-mauve/5 via-transparent to-ctp-pink/5 opacity-0 hover:opacity-100 transition-opacity duration-500" />
          <CardHeader className="bg-gradient-to-r from-ctp-surface0/30 to-ctp-surface1/20 border-b border-ctp-surface1/50 relative z-10">
            <CardTitle className="flex items-center gap-2 text-ctp-text font-bold">
              <Trophy className="h-5 w-5 text-ctp-yellow animate-float" />
              Runs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={leaderboardType} onValueChange={(value) => setLeaderboardType(value as 'regular' | 'individual-level' | 'community-golds')} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-4 p-0.5 gap-1 glass rounded-xl border-ctp-surface1/50 shadow-colored">
                <TabsTrigger 
                  value="regular" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-ctp-yellow data-[state=active]:to-ctp-peach data-[state=active]:text-[#11111b] bg-ctp-surface0/50 text-ctp-text transition-all duration-300 font-medium border border-transparent hover:bg-ctp-surface1/50 hover:border-ctp-yellow/50 data-[state=active]:shadow-colored-yellow text-xs sm:text-sm py-1.5 sm:py-2 px-2 sm:px-3 whitespace-nowrap rounded-lg"
                >
                  <Trophy className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 sm:mr-1.5" />
                  <span className="hidden min-[375px]:inline">Full Game</span>
                  <span className="min-[375px]:hidden">Game</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="individual-level" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-ctp-yellow data-[state=active]:to-ctp-peach data-[state=active]:text-[#11111b] bg-ctp-surface0/50 text-ctp-text transition-all duration-300 font-medium border border-transparent hover:bg-ctp-surface1/50 hover:border-ctp-yellow/50 data-[state=active]:shadow-colored-yellow text-xs sm:text-sm py-1.5 sm:py-2 px-2 sm:px-3 whitespace-nowrap rounded-lg"
                >
                  <Star className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 sm:mr-1.5" />
                  <span className="hidden sm:inline">Individual Levels</span>
                  <span className="sm:hidden">ILs</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="community-golds" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-ctp-yellow data-[state=active]:to-ctp-peach data-[state=active]:text-[#11111b] bg-ctp-surface0/50 text-ctp-text transition-all duration-300 font-medium border border-transparent hover:bg-ctp-surface1/50 hover:border-ctp-yellow/50 data-[state=active]:shadow-colored-yellow text-xs sm:text-sm py-1.5 sm:py-2 px-2 sm:px-3 whitespace-nowrap rounded-lg"
                >
                  <Gem className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 sm:mr-1.5" />
                  <span className="hidden sm:inline">Community Golds</span>
                  <span className="sm:hidden">CGs</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value={leaderboardType} className="mt-0">
                {(() => {
                  // Filter runs by leaderboard type
                  const filteredRuns = playerRuns.filter(run => {
                    const runLeaderboardType = run.leaderboardType || 'regular';
                    return runLeaderboardType === leaderboardType;
                  });

                  if (filteredRuns.length === 0) {
                    return (
                      <div className="text-center py-8">
                        <p className="text-ctp-overlay0">No {leaderboardType === 'regular' ? 'Full Game' : leaderboardType === 'individual-level' ? 'Individual Level' : 'Community Gold'} runs submitted yet</p>
                      </div>
                    );
                  }

                  return (
                    <div className="overflow-x-auto scrollbar-custom rounded-lg">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b-2 border-ctp-surface1/50 bg-gradient-to-r from-ctp-surface0/30 to-ctp-surface1/20">
                            <th className="py-3 px-4 text-left font-bold text-ctp-text">Rank</th>
                            <th className="py-3 px-4 text-left font-bold text-ctp-text">Category</th>
                            {leaderboardType !== 'regular' && (
                              <th className="py-3 px-4 text-left font-bold text-ctp-text">Level</th>
                            )}
                            <th className="py-3 px-4 text-left font-bold text-ctp-text">Time</th>
                            <th className="py-3 px-4 text-left font-bold text-ctp-text">Date</th>
                            <th className="py-3 px-4 text-left font-bold text-ctp-text">Platform</th>
                            <th className="py-3 px-4 text-left font-bold text-ctp-text">Type</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredRuns.map((run, index) => {
                            const categoryName = categories.find(c => c.id === run.category)?.name || run.category;
                            const platformName = platforms.find(p => p.id === run.platform)?.name || run.platform;
                            
                            return (
                              <tr 
                                key={run.id} 
                                className="border-b border-ctp-surface1/30 hover:bg-gradient-to-r hover:from-ctp-mauve/5 hover:to-ctp-pink/5 cursor-pointer transition-all duration-300 group animate-fade-in"
                                style={{ animationDelay: `${index * 0.03}s` }}
                                onClick={() => navigate(`/run/${run.id}`)}
                              >
                                <td className="py-3 px-4">
                                  {run.rank ? (
                                    run.rank === 1 ? (
                                      <div className="flex items-center gap-2">
                                        <LegoStudIcon size={36} color="#0055BF" />
                                        <span className="font-bold text-base text-ctp-text">
                                          #{run.rank}
                                        </span>
                                      </div>
                                    ) : run.rank === 2 ? (
                                      <div className="flex items-center gap-2">
                                        <LegoStudIcon size={36} color="#FFD700" />
                                        <span className="font-bold text-base text-ctp-text">
                                          #{run.rank}
                                        </span>
                                      </div>
                                    ) : run.rank === 3 ? (
                                      <div className="flex items-center gap-2">
                                        <LegoStudIcon size={36} color="#C0C0C0" />
                                        <span className="font-bold text-base text-ctp-text">
                                          #{run.rank}
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="font-bold text-base text-ctp-text w-9 h-9 flex items-center justify-center">
                                        #{run.rank}
                                      </span>
                                    )
                                  ) : (
                                    <span className="text-ctp-overlay0">—</span>
                                  )}
                                </td>
                                <td className="py-3 px-4 font-medium">{categoryName}</td>
                                {leaderboardType !== 'regular' && (
                                  <td className="py-3 px-4 text-ctp-overlay0">
                                    {run.level ? (levels.find(l => l.id === run.level)?.name || run.level) : '—'}
                                  </td>
                                )}
                                <td className="py-3 px-4 text-base font-semibold">{formatTime(run.time)}</td>
                                <td className="py-3 px-4 text-ctp-overlay0">{formatDate(run.date)}</td>
                                <td className="py-3 px-4">
                                  <Badge variant="outline" className="border-[hsl(235,13%,30%)]">
                                    {platformName}
                                  </Badge>
                                </td>
                                <td className="py-3 px-4">
                                  <Badge variant="outline" className="border-[hsl(235,13%,30%)] flex items-center gap-1 w-fit">
                                    {run.runType === 'solo' ? <User className="h-3 w-3" /> : <Users className="h-3 w-3" />}
                                    {run.runType.charAt(0).toUpperCase() + run.runType.slice(1)}
                                  </Badge>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PlayerDetails;