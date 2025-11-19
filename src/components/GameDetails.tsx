import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { GameDetailsConfig } from "@/types/database";
import { getGameDetailsConfig } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface GameDetailsProps {
  className?: string;
}

export function GameDetails({ className }: GameDetailsProps) {
  const [config, setConfig] = useState<GameDetailsConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const gameConfig = await getGameDetailsConfig();
        setConfig(gameConfig);
      } catch (error) {
        console.error("Error fetching game details config:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  // Don't render if loading, disabled, or not visible on current page
  if (loading || !config || !config.enabled) {
    return null;
  }

  // Check if component should be visible on current page
  const currentPath = location.pathname;
  const isVisible = config.visibleOnPages.some(page => {
    if (page === "/") {
      return currentPath === "/";
    }
    return currentPath.startsWith(page);
  });

  if (!isVisible) {
    return null;
  }

  // Sort platforms by order
  const sortedPlatforms = [...config.platforms].sort((a, b) => {
    const orderA = a.order ?? Infinity;
    const orderB = b.order ?? Infinity;
    return orderA - orderB;
  });

  return (
    <div className={`bg-[#1e1e2e] border-b border-ctp-surface1 ${className || ""}`}>
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Game Cover Image */}
          {config.coverImageUrl && (
            <div className="flex-shrink-0">
              <img
                src={config.coverImageUrl}
                alt={config.title}
                className="w-32 h-40 sm:w-40 sm:h-52 object-cover rounded-none border border-ctp-surface1"
              />
            </div>
          )}

          {/* Main Content */}
          <div className="flex-1 min-w-0 w-full">
            {/* Title and Categories */}
            <div className="mb-4">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-ctp-text mb-2">
                {config.title}
                {config.subtitle && (
                  <span className="text-ctp-subtext1 font-normal"> ({config.subtitle})</span>
                )}
              </h1>
              {config.categories.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {config.categories.map((category, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="bg-ctp-surface0 text-ctp-text border-ctp-surface1 text-xs sm:text-sm"
                    >
                      {category}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Platform Buttons and Discord */}
            <div className="flex flex-wrap gap-2">
              {sortedPlatforms.map((platform) => (
                <Button
                  key={platform.id}
                  variant="outline"
                  className="bg-ctp-surface0 text-ctp-text border-ctp-surface1 hover:bg-ctp-surface1 hover:border-ctp-mauve/50 rounded-none text-xs sm:text-sm px-3 py-1.5 h-auto"
                >
                  {platform.label}
                </Button>
              ))}
              {config.discordUrl && (
                <Button
                  variant="outline"
                  asChild
                  className="bg-ctp-surface0 text-ctp-text border-ctp-surface1 hover:bg-ctp-surface1 hover:border-[#5865F2]/50 rounded-none text-xs sm:text-sm px-3 py-1.5 h-auto"
                >
                  <a
                    href={config.discordUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5"
                  >
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                    </svg>
                    <span>Discord</span>
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

