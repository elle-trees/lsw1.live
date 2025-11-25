"use client";

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface TwitchEmbedProps {
  channel: string;
}

const TwitchEmbed: React.FC<TwitchEmbedProps> = ({ channel }) => {
  const { t } = useTranslation();
  // Get the current hostname for the 'parent' parameter required by Twitch embeds
  const parentDomain = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

  return (
    <Card className="w-full h-full bg-gradient-to-br from-[hsl(240,21%,16%)] to-[hsl(235,19%,13%)] border-[hsl(235,13%,30%)] shadow-xl overflow-hidden flex flex-col rounded-none">
      <div className="relative flex-shrink-0" style={{ paddingBottom: '56.25%' /* 16:9 Aspect Ratio */ }}>
        <iframe
          src={`https://player.twitch.tv/?channel=${channel}&parent=${parentDomain}&autoplay=false&muted=true`}
          height="100%"
          width="100%"
          allowFullScreen
          allow="fullscreen"
          className="absolute top-0 left-0 w-full h-full"
          title={`${channel} Twitch Stream`}
        ></iframe>
      </div>
      <CardContent className="p-2 sm:p-3 lg:p-3 text-center space-y-1 flex-shrink-0">
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <p className="text-sm sm:text-base font-semibold text-[hsl(220,17%,92%)]">
            {t("twitchEmbed.watchLive", { channel })}
          </p>
          <Badge variant="outline" className="border-[#9147ff] bg-[#9147ff]/10 text-[#9147ff] text-xs">
            <ExternalLink className="h-3 w-3 mr-1" />
            <a href={`https://twitch.tv/${channel}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
              {t("twitchEmbed.viewOnTwitch")}
            </a>
          </Badge>
        </div>
        <p className="text-[10px] sm:text-xs text-[hsl(222,15%,60%)]">
          {t("twitchEmbed.streamMutedInfo")}
        </p>
      </CardContent>
    </Card>
  );
};

export default TwitchEmbed;