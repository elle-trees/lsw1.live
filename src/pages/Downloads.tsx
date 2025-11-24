"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink } from "lucide-react";
import { getDownloadEntries } from "@/lib/db";
import { DownloadEntry } from "@/types/database";
import { FadeIn } from "@/components/ui/fade-in";
import { AnimatedCard } from "@/components/ui/animated-card";

const Downloads = () => {
  const [downloadEntries, setDownloadEntries] = useState<DownloadEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await getDownloadEntries();
        setDownloadEntries(data);
      } catch (_error) {
        // Error fetching download entries
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <FadeIn className="min-h-screen bg-[#1e1e2e] text-ctp-text py-4 sm:py-6 overflow-x-hidden">
      <div className="max-w-[1920px] mx-auto px-2 sm:px-4 lg:px-6 w-full">
        {loading ? (
          <div className="flex justify-center items-center py-16" />
        ) : downloadEntries.length === 0 ? (
          <AnimatedCard 
            className="bg-gradient-to-br from-ctp-base to-ctp-mantle border-ctp-surface1 shadow-xl rounded-none overflow-hidden"
            delay={0.1}
            hover={false}
          >
            <CardContent className="p-12 text-center">
              <Download className="h-16 w-16 text-ctp-subtext1 opacity-50 mx-auto mb-4" />
              <p className="text-ctp-subtext1 text-lg">No download entries available yet.</p>
            </CardContent>
          </AnimatedCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {downloadEntries.map((entry) => (
              <Card
                key={entry.id}
                className="bg-gradient-to-br from-ctp-base to-ctp-mantle border-ctp-surface1 shadow-xl rounded-none overflow-hidden hover:border-ctp-surface2 transition-colors duration-200"
              >
                <CardContent className="p-6">
                  {entry.imageUrl && (
                    <div className="relative w-full h-48 rounded-none overflow-hidden mb-4 border border-ctp-surface1">
                      <img 
                        src={entry.imageUrl} 
                        alt={entry.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardTitle className="text-xl font-semibold mb-3 text-ctp-text">
                    {entry.name}
                  </CardTitle>
                  <p className="text-ctp-subtext1 text-sm mb-6 leading-relaxed">
                    {entry.description}
                  </p>
                  <Button 
                    asChild 
                    className="w-full bg-ctp-mauve hover:bg-ctp-mauve/90 text-ctp-base font-semibold rounded-none transition-colors duration-200"
                  >
                    <a 
                      href={entry.fileUrl || entry.url || "#"} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="flex items-center justify-center gap-2"
                    >
                      <span>{entry.fileUrl ? "Download" : "View"}</span>
                      {entry.fileUrl ? (
                        <Download className="h-4 w-4" />
                      ) : (
                        <ExternalLink className="h-4 w-4" />
                      )}
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </FadeIn>
  );
};

export default Downloads;