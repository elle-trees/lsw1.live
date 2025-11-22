"use client";

import React, { useState, useEffect } from 'react';
import { Radio } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getPlayersWithTwitchUsernames } from '@/lib/db';

interface LiveRunner {
  uid: string;
  displayName: string;
  twitchUsername: string;
  nameColor?: string;
  profilePicture?: string;
}

const Live = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [parentDomain, setParentDomain] = useState<string>('localhost');
  const [isLive, setIsLive] = useState<boolean | null>(null);
  const [liveRunners, setLiveRunners] = useState<LiveRunner[]>([]);
  const [checkingRunners, setCheckingRunners] = useState(false);
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
        // Use decapi.me status endpoint which returns "live" or "offline"
        const response = await fetch(`https://decapi.me/twitch/status/${channel}`);
        
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
    // Check for live runners when official stream is offline
    const checkLiveRunners = async () => {
      if (isLive === true) {
        // Official stream is live, don't check runners
        setLiveRunners([]);
        return;
      }

      setCheckingRunners(true);
      try {
        // Fetch all players with Twitch usernames
        const players = await getPlayersWithTwitchUsernames();
        
        if (players.length === 0) {
          setLiveRunners([]);
          setCheckingRunners(false);
          return;
        }

        // Check each player's Twitch stream status
        const liveStatusChecks = await Promise.all(
          players.map(async (player) => {
            try {
              const response = await fetch(`https://decapi.me/twitch/status/${player.twitchUsername}`);
              if (response.ok) {
                const data = await response.text();
                const trimmedData = data.trim().toLowerCase();
                return trimmedData === 'live' ? player : null;
              }
              return null;
            } catch (_error) {
              return null;
            }
          })
        );

        const live = liveStatusChecks.filter((runner): runner is LiveRunner => runner !== null);
        setLiveRunners(live);
      } catch (_error) {
        setLiveRunners([]);
      } finally {
        setCheckingRunners(false);
      }
    };

    // Only check when we know the official stream status
    if (isLive !== null) {
      checkLiveRunners();
      // Check every 60 seconds
      const interval = setInterval(checkLiveRunners, 60000);
      return () => clearInterval(interval);
    }
  }, [isLive]);

  return (
    <div className="min-h-screen bg-[#1e1e2e] text-ctp-text py-8 overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full">
        {/* Page Title */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Radio className="h-6 w-6 text-[#f38ba8]" />
            <h1 className="text-3xl md:text-4xl font-bold text-[#f38ba8]">
              Live
            </h1>
          </div>
          <p className="text-base text-ctp-subtext1 max-w-3xl mx-auto animate-fade-in-delay">
            Watch our community live on twitch!
          </p>
        </div>
        {/* Stream and Chat Container */}
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
              {isLive === false && liveRunners.length === 0 && !checkingRunners && (
                <p className="text-sm text-ctp-subtext1 mt-3">
                  No runners are live, time to hit the start streaming button!
                </p>
              )}
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

        {/* Live Runners Section - Only show when official stream is offline */}
        {isLive === false && liveRunners.length > 0 && (
          <div className="mt-8 animate-fade-in">
            <Card className="bg-gradient-to-br from-[hsl(240,21%,16%)] to-[hsl(235,19%,13%)] border-[hsl(235,13%,30%)] shadow-xl">
              <CardHeader className="bg-gradient-to-r from-[hsl(240,21%,18%)] to-[hsl(240,21%,15%)] border-b border-[hsl(235,13%,30%)]">
                <div className="flex items-center gap-2 text-xl text-[#f38ba8]">
                  <Radio className="h-5 w-5" />
                  <span>Community Streams</span>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {liveRunners.map((runner) => (
                    <Card 
                      key={runner.uid} 
                      className="bg-gradient-to-br from-[hsl(240,21%,16%)] to-[hsl(235,19%,13%)] border-[hsl(235,13%,30%)] hover:border-[#f38ba8]/50 transition-all duration-300"
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
                          <div className="relative" style={{ paddingBottom: '56.25%' }}>
                            <iframe
                              src={`https://player.twitch.tv/?channel=${runner.twitchUsername}&parent=${parentDomain}&autoplay=false&muted=true`}
                              className="absolute top-0 left-0 w-full h-full"
                              title={`${runner.displayName} Twitch Stream`}
                              style={{ border: 'none' }}
                              allowFullScreen
                              allow="autoplay; fullscreen"
                            />
                          </div>
                          <div className="mt-3 flex items-center justify-center">
                            <Badge variant="default" className="bg-gradient-to-r from-[#89b4fa] to-[#74c7ec] text-white border-0">
                              <Radio className="h-3 w-3 mr-1.5 animate-pulse" />
                              Live
                            </Badge>
                          </div>
                        </a>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Live;
