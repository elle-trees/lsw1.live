"use client";

import React, { useState, useEffect } from 'react';
import { Radio } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { AnimatedCard } from '@/components/ui/animated-card';
import { FadeIn } from '@/components/ui/fade-in';
import { getPlayersWithTwitchUsernames } from '@/lib/db';

interface LiveRunner {
  uid: string;
  displayName: string;
  twitchUsername: string;
  nameColor?: string;
  profilePicture?: string;
  viewerCount?: number;
}

const Live = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [parentDomain, setParentDomain] = useState<string>('localhost');
  const [isLive, setIsLive] = useState<boolean | null>(null);
  const [liveRunners, setLiveRunners] = useState<LiveRunner[]>([]);
  const [checkingRunners, setCheckingRunners] = useState(false);
  const [hasCheckedOnce, setHasCheckedOnce] = useState(false);
  const channel = 'lsw1live';

  useEffect(() => {
    // Get the current hostname for the 'parent' parameter required by Twitch embeds
    // Twitch requires the parent parameter to match the domain where the embed is hosted
    if (typeof window !== 'undefined') {
      setParentDomain(window.location.hostname);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    // Check if stream is live
    const checkStreamStatus = async () => {
      try {
        // Use proxy API endpoint which returns "live" or "offline"
        const response = await fetch(`/api/twitch/status?username=${encodeURIComponent(channel)}`);
        
        if (!response.ok) {
          setIsLive(false);
          return;
        }
        
        const data = await response.text();
        const trimmedData = data.trim().toLowerCase();
        
        // The status endpoint should return "live" or "offline"
        if (trimmedData === 'live') {
          setIsLive(true);
        } else if (trimmedData === 'offline') {
          setIsLive(false);
        } else {
          // If response is unexpected, default to offline for safety
          setIsLive(false);
        }
      } catch (_error) {
        // Default to offline on error
        setIsLive(false);
      }
    };

    // Check immediately
    checkStreamStatus();

    // Check every 30 seconds
    const interval = setInterval(checkStreamStatus, 30000);

    return () => clearInterval(interval);
  }, [channel]);

  useEffect(() => {
    // Check for live runners - simplified logic
    const checkLiveRunners = async () => {
      setCheckingRunners(true);
      try {
        // Fetch all players with Twitch usernames
        const players = await getPlayersWithTwitchUsernames();
        
        // Filter out players with empty/invalid Twitch usernames
        const validPlayers = players.filter((player) => {
          if (!player?.twitchUsername) return false;
          const trimmed = player.twitchUsername.trim();
          const lower = trimmed.toLowerCase();
          return trimmed !== '' && 
                 lower !== 'null' && 
                 lower !== 'undefined';
        });

        if (validPlayers.length === 0) {
          console.log('[Live] No players with valid Twitch usernames found');
          setLiveRunners([]);
          setHasCheckedOnce(true);
          setCheckingRunners(false);
          return;
        }

        console.log(`[Live] Checking ${validPlayers.length} players for live streams:`, validPlayers.map(p => p.twitchUsername));

        // Check each player's stream status - only include if live
        const liveStatusChecks = await Promise.all(
          validPlayers.map(async (player) => {
            try {
              const twitchUsername = player.twitchUsername!.trim();
              const twitchUsernameLower = twitchUsername.toLowerCase();
              
              // Check if stream is live using multiple methods for reliability
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 10000);
              
              let isLive = false;
              
              // Method 1: Try status endpoint (via proxy to avoid CORS)
              try {
                const statusResponse = await fetch(
                  `/api/twitch/status?username=${encodeURIComponent(twitchUsernameLower)}`,
                  { 
                    signal: controller.signal,
                    cache: 'no-cache',
                    headers: {
                      'Cache-Control': 'no-cache'
                    }
                  }
                );
                
                if (statusResponse.ok) {
                  const statusText = await statusResponse.text();
                  const status = statusText.trim().toLowerCase();
                  console.log(`[Live] Status check for ${twitchUsername}: "${statusText}" -> "${status}"`);
                  
                  if (status === 'live') {
                    isLive = true;
                  }
                } else {
                  console.warn(`[Live] Status API returned ${statusResponse.status} for ${twitchUsername}`);
                }
              } catch (fetchError) {
                console.warn(`[Live] Failed to fetch status for ${twitchUsername}:`, fetchError);
              }
              
              // Method 2: If status didn't confirm live, try uptime endpoint as fallback
              // Uptime returns "offline" when not live, or a time string when live
              if (!isLive) {
                try {
                  const uptimeResponse = await fetch(
                    `/api/twitch/uptime?username=${encodeURIComponent(twitchUsernameLower)}`,
                    { 
                      signal: controller.signal,
                      cache: 'no-cache',
                      headers: {
                        'Cache-Control': 'no-cache'
                      }
                    }
                  );
                  
                  if (uptimeResponse.ok) {
                    const uptimeText = await uptimeResponse.text();
                    const uptime = uptimeText.trim().toLowerCase();
                    console.log(`[Live] Uptime check for ${twitchUsername}: "${uptimeText}"`);
                    
                    // If uptime is not "offline" and contains time info, stream is likely live
                    if (uptime !== 'offline' && uptime !== '' && !uptime.includes('error') && !uptime.includes('not found')) {
                      // Check if it looks like a time string (contains numbers and time units)
                      if (/\d/.test(uptime) && (uptime.includes('h') || uptime.includes('m') || uptime.includes('s') || uptime.includes(':'))) {
                        isLive = true;
                        console.log(`[Live] Stream confirmed live via uptime for ${twitchUsername}`);
                      }
                    }
                  }
                } catch (uptimeError) {
                  console.warn(`[Live] Failed to fetch uptime for ${twitchUsername}:`, uptimeError);
                }
              }
              
              clearTimeout(timeoutId);
              
              if (!isLive) {
                return null;
              }
              
              console.log(`[Live] Stream confirmed live for ${twitchUsername}`);
              
              // Stream is confirmed live - get viewer count
              let viewerCount: number | undefined;
              
              // Try to get viewer count (via proxy to avoid CORS)
              try {
                const viewerController = new AbortController();
                const viewerTimeoutId = setTimeout(() => viewerController.abort(), 8000);
                
                const viewerResponse = await fetch(
                  `/api/twitch/viewercount?username=${encodeURIComponent(twitchUsernameLower)}`,
                  { 
                    signal: viewerController.signal,
                    cache: 'no-cache',
                    headers: {
                      'Cache-Control': 'no-cache'
                    }
                  }
                );
                
                clearTimeout(viewerTimeoutId);
                
                if (viewerResponse.ok) {
                  const viewerText = await viewerResponse.text().trim();
                  // Handle empty responses or error messages
                  if (viewerText && 
                      viewerText !== '' && 
                      !viewerText.toLowerCase().includes('error') && 
                      !viewerText.toLowerCase().includes('not found') &&
                      !viewerText.toLowerCase().includes('offline') &&
                      !viewerText.toLowerCase().includes('null')) {
                    // Try to extract number from response (handle cases like "1,234" or "1234" or "1.234")
                    const cleanedText = viewerText.replace(/[^\d]/g, '');
                    if (cleanedText) {
                      const parsedViewers = parseInt(cleanedText, 10);
                      if (!isNaN(parsedViewers) && parsedViewers >= 0) {
                        viewerCount = parsedViewers;
                      }
                    }
                  }
                } else {
                  console.warn(`[Live] Viewercount API returned status ${viewerResponse.status} for ${twitchUsername}`);
                }
              } catch (viewerError) {
                // If viewercount fetch fails, log but continue without count
                console.warn(`[Live] Failed to fetch viewercount for ${twitchUsername}:`, viewerError);
              }

              // Return live runner with viewer count (even if count fetch failed)
              return {
                uid: player.uid,
                displayName: player.displayName,
                twitchUsername,
                nameColor: player.nameColor,
                profilePicture: player.profilePicture,
                viewerCount,
              };
            } catch (error) {
              // Skip on error
              console.warn(`[Live] Error checking stream status for ${player.twitchUsername}:`, error);
              return null;
            }
          })
        );

        const live = liveStatusChecks.filter((runner): runner is LiveRunner => runner !== null);
        console.log(`[Live] Found ${live.length} live streams:`, live.map(r => r.twitchUsername));
        setLiveRunners(live);
        setHasCheckedOnce(true);
      } catch (error) {
        console.error('[Live] Error checking live runners:', error);
        setLiveRunners([]);
        setHasCheckedOnce(true);
      } finally {
        setCheckingRunners(false);
      }
    };

    // Check immediately and then every 60 seconds
    checkLiveRunners();
    const interval = setInterval(checkLiveRunners, 60000);
    return () => clearInterval(interval);
  }, []);

  // Show skeleton while initializing or checking stream status
  const isLoading = !isLoaded || isLive === null;

  return (
    <div className="min-h-screen bg-[#1e1e2e] text-ctp-text py-8 overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full">
        {/* Stream and Chat Container */}
        {isLoading ? (
          <FadeIn className="grid grid-cols-1 lg:grid-cols-[1fr_280px] xl:grid-cols-[1fr_320px] gap-6 items-stretch">
            {/* Stream Player Skeleton */}
            <div className="w-full">
              <AnimatedCard className="bg-gradient-to-br from-[hsl(240,21%,16%)] to-[hsl(235,19%,13%)] border-[hsl(235,13%,30%)] shadow-2xl" hover={false}>
                <div className="relative" style={{ paddingBottom: '56.25%' /* 16:9 Aspect Ratio */ }}>
                  <Skeleton className="absolute top-0 left-0 w-full h-full rounded-none" />
                </div>
              </AnimatedCard>
              
              {/* Title below player skeleton */}
              <FadeIn delay={0.1} className="text-center mt-4">
                <Skeleton className="h-10 w-32 mx-auto rounded-none" />
                <Skeleton className="h-4 w-64 mx-auto mt-3 rounded-none" />
              </FadeIn>
            </div>

            {/* Chat Skeleton */}
            <div className="w-full hidden lg:block" style={{ height: '100%' }}>
              <AnimatedCard className="bg-gradient-to-br from-[hsl(240,21%,16%)] to-[hsl(235,19%,13%)] border-[hsl(235,13%,30%)] shadow-2xl h-full" hover={false}>
                <Skeleton className="w-full h-full rounded-none" />
              </AnimatedCard>
            </div>

            {/* Mobile Chat Indicator Skeleton */}
            <div className="lg:hidden w-full">
              <AnimatedCard className="bg-gradient-to-br from-[hsl(240,21%,16%)] to-[hsl(235,19%,13%)] border-[hsl(235,13%,30%)] shadow-xl" hover={false}>
                <CardContent className="p-6">
                  <Skeleton className="h-4 w-full rounded-none" />
                </CardContent>
              </AnimatedCard>
            </div>
          </FadeIn>
        ) : (
          <div className={`grid grid-cols-1 lg:grid-cols-[1fr_280px] xl:grid-cols-[1fr_320px] gap-6 items-stretch transition-all duration-1000 delay-500 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {/* Stream Player */}
            <div className="w-full">
              <div className="bg-gradient-to-br from-[hsl(240,21%,16%)] to-[hsl(235,19%,13%)] border border-[hsl(235,13%,30%)] rounded-none overflow-hidden shadow-2xl relative" style={{ paddingBottom: '56.25%' /* 16:9 Aspect Ratio */ }}>
                {parentDomain && (
                  <iframe
                    src={`https://player.twitch.tv/?channel=${channel}&parent=${parentDomain}&autoplay=false&muted=false`}
                    className="absolute top-0 left-0 w-full h-full"
                    title={`${channel} Twitch Stream`}
                    style={{ border: 'none' }}
                    allowFullScreen
                    allow="autoplay; fullscreen"
                  />
                )}
              </div>
              
              {/* Title below player */}
              <div className={`text-center mt-4 transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
                <Badge 
                  variant={isLive ? "default" : "secondary"}
                  className={`text-base font-medium px-4 py-2 transition-all duration-300 ${
                    isLive === null 
                      ? 'bg-[hsl(235,13%,25%)] text-[hsl(222,15%,70%)] border-[hsl(235,13%,30%)]' 
                      : isLive 
                      ? 'bg-gradient-to-r from-[#89b4fa] to-[#74c7ec] text-white border-0 hover:from-[#74c7ec] hover:to-[#89b4fa] shadow-lg shadow-[#89b4fa]/30 animate-pulse' 
                      : 'bg-[hsl(235,13%,25%)] text-[hsl(222,15%,60%)] border-[hsl(235,13%,30%)]'
                  }`}
                >
                  <Radio className={`h-4 w-4 mr-2 ${isLive ? 'animate-pulse' : ''}`} />
                  {isLive === null ? 'Checking...' : isLive ? 'Live' : 'Offline'}
                </Badge>
              </div>
            </div>

            {/* Chat */}
            <div className="w-full hidden lg:block" style={{ height: '100%' }}>
              <div className="bg-gradient-to-br from-[hsl(240,21%,16%)] to-[hsl(235,19%,13%)] border border-[hsl(235,13%,30%)] rounded-none overflow-hidden shadow-2xl relative h-full">
                {parentDomain && (
                  <iframe
                    src={`https://www.twitch.tv/embed/${channel}/chat?parent=${parentDomain}&darkpopout`}
                    className="absolute top-0 left-0 w-full h-full"
                    title={`${channel} Twitch Chat`}
                    style={{ border: 'none' }}
                    allow="autoplay; fullscreen"
                  />
                )}
              </div>
            </div>

            {/* Mobile Chat Indicator */}
            <div className="lg:hidden w-full">
              <Card className="bg-gradient-to-br from-[hsl(240,21%,16%)] to-[hsl(235,19%,13%)] border-[hsl(235,13%,30%)] shadow-xl">
                <CardContent className="p-6 text-center">
                  <p className="text-ctp-subtext1">
                    Chat is available on larger screens. View the stream on desktop to see the chat!
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Live Runners Section - Always show */}
        <FadeIn className="mt-8" delay={0.2}>
          <Card className="bg-gradient-to-br from-[hsl(240,21%,16%)] to-[hsl(235,19%,13%)] border-[hsl(235,13%,30%)] shadow-xl">
            <CardHeader className="bg-gradient-to-r from-[hsl(240,21%,18%)] to-[hsl(240,21%,15%)] border-b border-[hsl(235,13%,30%)]">
              <div className="flex items-center gap-2 text-xl text-[#f38ba8]">
                <Radio className="h-5 w-5" />
                <span>Community Streams</span>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {checkingRunners && !hasCheckedOnce ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                      <AnimatedCard 
                        key={i}
                        className="bg-gradient-to-br from-[hsl(240,21%,16%)] to-[hsl(235,19%,13%)] border-[hsl(235,13%,30%)]"
                        hover={false}
                        delay={i * 0.1}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
                            <div className="flex-1 min-w-0 space-y-2">
                              <Skeleton className="h-4 w-24 rounded-none" />
                              <Skeleton className="h-3 w-20 rounded-none" />
                            </div>
                          </div>
                          <div className="relative" style={{ paddingBottom: '56.25%' }}>
                            <Skeleton className="absolute top-0 left-0 w-full h-full rounded-none" />
                          </div>
                          <div className="mt-3 flex items-center justify-center">
                            <Skeleton className="h-6 w-16 rounded-none" />
                          </div>
                        </CardContent>
                      </AnimatedCard>
                    ))}
                  </div>
                ) : liveRunners.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {liveRunners.map((runner, index) => (
                      <AnimatedCard 
                        key={runner.uid} 
                        className="bg-gradient-to-br from-[hsl(240,21%,16%)] to-[hsl(235,19%,13%)] border-[hsl(235,13%,30%)] hover:border-[#f38ba8]/50 transition-all duration-300"
                        delay={index * 0.1}
                      >
                        <CardContent className="p-4">
                          <a 
                            href={`https://www.twitch.tv/${runner.twitchUsername}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block"
                          >
                            <div className="flex items-center gap-3 mb-3">
                              <Avatar className="h-10 w-10 flex-shrink-0">
                                <AvatarImage src={runner.profilePicture || `https://api.dicebear.com/7.x/lorelei-neutral/svg?seed=${runner.displayName}`} />
                                <AvatarFallback>{runner.displayName.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <Link
                                  to={`/player/${runner.uid}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="font-semibold text-base hover:opacity-80 transition-opacity block truncate"
                                  style={{ color: runner.nameColor || '#cba6f7' }}
                                >
                                  {runner.displayName}
                                </Link>
                                <p className="text-xs text-ctp-overlay0 truncate">@{runner.twitchUsername}</p>
                              </div>
                            </div>
                            <div className="relative group" style={{ paddingBottom: '56.25%' }}>
                              <img
                                src={`https://static-cdn.jtvnw.net/previews-ttv/live_user_${runner.twitchUsername}-640x360.jpg?t=${Date.now()}`}
                                alt={`${runner.displayName} stream thumbnail`}
                                className="absolute top-0 left-0 w-full h-full object-cover"
                                onError={(e) => {
                                  // Fallback to a placeholder or error image
                                  const target = e.target as HTMLImageElement;
                                  target.src = `https://via.placeholder.com/640x360/9147ff/ffffff?text=${encodeURIComponent(runner.displayName)}`;
                                }}
                              />
                              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                              <div className="absolute top-2 right-2">
                                <Badge variant="default" className="bg-red-600 text-white border-0 shadow-lg">
                                  <Radio className="h-3 w-3 mr-1.5 animate-pulse" />
                                  Live
                                </Badge>
                              </div>
                              {runner.viewerCount !== undefined && (
                                <div className="absolute bottom-2 left-2">
                                  <Badge variant="secondary" className="bg-black/70 text-white border-0 backdrop-blur-sm">
                                    <span className="text-xs">
                                      {runner.viewerCount.toLocaleString()} viewer{runner.viewerCount !== 1 ? 's' : ''}
                                    </span>
                                  </Badge>
                                </div>
                              )}
                            </div>
                            {runner.viewerCount !== undefined && (
                              <div className="mt-3 flex items-center justify-center">
                                <Badge variant="outline" className="text-xs border-[hsl(235,13%,30%)] bg-[hsl(235,13%,15%)]">
                                  <span className="font-semibold">{runner.viewerCount.toLocaleString()}</span>
                                  <span className="ml-1 text-ctp-subtext1">
                                    {runner.viewerCount === 1 ? 'viewer' : 'viewers'}
                                  </span>
                                </Badge>
                              </div>
                            )}
                          </a>
                        </CardContent>
                      </AnimatedCard>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <Radio className="h-12 w-12 text-ctp-subtext1 opacity-50" />
                      <div>
                        <h3 className="text-base font-semibold mb-1 text-ctp-text">No runners are live</h3>
                        <p className="text-sm text-ctp-subtext1">
                          Time to hit the start streaming button!
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </FadeIn>
      </div>
    </div>
  );
};

export default Live;
