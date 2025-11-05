import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Timer, Calendar, Gamepad2 } from "lucide-react";

interface PlayerStats {
  totalRuns: number;
  bestRank: number;
  favoriteCategory: string;
  favoritePlatform: string;
}

interface PlayerProfileProps {
  playerName: string;
  joinDate: string;
  stats: PlayerStats;
  nameColor?: string; // Added nameColor prop
  profilePicture?: string; // URL to the player's profile picture
  bio?: string; // Bio/description for the player
  pronouns?: string; // Pronouns for the player
}

export function PlayerProfile({ playerName, joinDate, stats, nameColor, profilePicture, bio, pronouns }: PlayerProfileProps) {
  return (
    <Card className="bg-[hsl(240,21%,15%)] border-[hsl(235,13%,30%)]">
      <CardHeader>
        <CardTitle className="flex items-start gap-3">
          <Avatar className="h-12 w-12 flex-shrink-0">
            <AvatarImage src={profilePicture || `https://api.dicebear.com/7.x/lorelei-neutral/svg?seed=${playerName}`} />
            <AvatarFallback>{playerName.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h2 className="text-2xl" style={{ color: nameColor || 'inherit' }}>{playerName}</h2>
              {pronouns && (
                <Badge variant="outline" className="border-ctp-surface1 text-ctp-subtext1 text-xs">
                  {pronouns}
                </Badge>
              )}
            </div>
            <p className="text-sm text-ctp-overlay0 flex items-center gap-1 mb-2">
              <Calendar className="h-4 w-4" />
              Joined {joinDate}
            </p>
            {bio && (
              <p className="text-sm text-ctp-subtext1 mt-2 leading-relaxed">
                {bio}
              </p>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* The stats cards have been removed from here */}
      </CardContent>
    </Card>
  );
}