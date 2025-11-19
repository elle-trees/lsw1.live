import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { AnimatedCard } from "@/components/ui/animated-card";
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { GameDetails as GameDetailsType } from "@/types/database";
import { getGameDetails } from "@/lib/db";
import { ExternalLink } from "lucide-react";

export function GameDetails() {
  const [details, setDetails] = useState<GameDetailsType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const data = await getGameDetails();
        setDetails(data);
      } catch (error) {
        console.error("Failed to fetch game details", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, []);

  if (loading) {
    return (
      <div className="w-full h-64 bg-ctp-surface0/20 animate-pulse rounded-lg mb-8" />
    );
  }

  if (!details) return null;

  return (
    <AnimatedCard 
        className="glass shadow-colored border-ctp-surface1/50 w-full overflow-hidden relative mb-8 rounded-xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
    >
        <div className="flex flex-col md:flex-row">
            {details.coverImage && (
                <div className="w-full md:w-1/3 lg:w-1/4 h-64 md:h-auto relative overflow-hidden">
                    <img 
                        src={details.coverImage} 
                        alt={details.title} 
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-ctp-base via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:to-ctp-base/80" />
                </div>
            )}
            <CardContent className="flex-1 p-6 md:p-8 flex flex-col justify-center relative z-10 bg-ctp-base/40 backdrop-blur-sm">
                <h1 className="text-3xl md:text-4xl font-bold text-ctp-text mb-4 bg-clip-text text-transparent bg-gradient-to-r from-ctp-blue to-ctp-mauve w-fit">
                    {details.title}
                </h1>
                <p className="text-ctp-subtext1 text-lg mb-8 leading-relaxed max-w-3xl">
                    {details.description}
                </p>
                
                <div className="flex flex-wrap gap-4">
                    {details.buttons
                        .sort((a, b) => a.order - b.order)
                        .map((button) => {
                            const isExternal = button.url.startsWith('http');
                            return (
                                <Button
                                    key={button.id}
                                    asChild
                                    variant="outline"
                                    className="border-ctp-surface1 hover:bg-ctp-blue/10 hover:border-ctp-blue text-ctp-text hover:text-ctp-blue transition-all duration-300 hover:scale-105 min-w-[100px]"
                                >
                                    {isExternal ? (
                                        <a href={button.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                                            {button.label}
                                            <ExternalLink className="h-3 w-3" />
                                        </a>
                                    ) : (
                                        <Link to={button.url}>
                                            {button.label}
                                        </Link>
                                    )}
                                </Button>
                            );
                        })
                    }
                </div>
            </CardContent>
        </div>
    </AnimatedCard>
  );
}

