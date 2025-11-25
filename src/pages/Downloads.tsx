"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink } from "lucide-react";
import { getDownloadEntries, getDownloadCategories } from "@/lib/db";
import { DownloadEntry } from "@/types/database";
import { FadeIn } from "@/components/ui/fade-in";
import { AnimatedCard } from "@/components/ui/animated-card";
import { useTranslation } from "react-i18next";
import { getCategoryTranslation } from "@/lib/i18n/entity-translations";

const Downloads = () => {
  const { t } = useTranslation();
  const [downloadEntries, setDownloadEntries] = useState<DownloadEntry[]>([]);
  const [downloadCategories, setDownloadCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [entries, categories] = await Promise.all([
          getDownloadEntries(),
          getDownloadCategories()
        ]);
        setDownloadEntries(entries);
        setDownloadCategories(categories);
      } catch (_error) {
        // Error fetching download entries
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Group downloads by category
  const downloadsByCategory = useMemo(() => {
    const grouped: Record<string, DownloadEntry[]> = {};
    
    downloadEntries.forEach((entry) => {
      const categoryId = entry.category;
      if (!grouped[categoryId]) {
        grouped[categoryId] = [];
      }
      grouped[categoryId].push(entry);
    });

    // Sort categories by their order in downloadCategories array
    const sortedCategories = downloadCategories
      .filter(cat => grouped[cat.id] && grouped[cat.id].length > 0)
      .map(cat => ({
        id: cat.id,
        name: getCategoryTranslation(cat.id, cat.name),
        downloads: grouped[cat.id]
      }));

    // Also include any categories that exist in downloads but not in the categories list
    Object.keys(grouped).forEach(categoryId => {
      if (!downloadCategories.find(cat => cat.id === categoryId)) {
        sortedCategories.push({
          id: categoryId,
          name: categoryId, // Fallback to category ID if name not found
          downloads: grouped[categoryId]
        });
      }
    });

    return sortedCategories;
  }, [downloadEntries, downloadCategories]);

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
              <p className="text-ctp-subtext1 text-lg">{t("downloads.noDownloadEntries")}</p>
            </CardContent>
          </AnimatedCard>
        ) : (
          <div className="space-y-8">
            {downloadsByCategory.map((category, categoryIndex) => (
              <Card
                key={category.id}
                className="bg-gradient-to-br from-ctp-base to-ctp-mantle border-ctp-surface1 shadow-xl rounded-none overflow-hidden"
              >
                <CardHeader className="bg-gradient-to-r from-ctp-mantle to-ctp-base border-b border-ctp-surface1">
                  <CardTitle className="text-2xl font-semibold text-ctp-text">
                    {category.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {category.downloads.map((entry) => (
                      <Card
                        key={entry.id}
                        className="bg-gradient-to-br from-ctp-crust to-ctp-mantle border-ctp-surface1 shadow-lg rounded-none overflow-hidden hover:border-ctp-surface2 transition-colors duration-200 flex flex-col"
                      >
                        <CardContent className="p-6 flex flex-col flex-grow">
                          {entry.imageUrl && (
                            <div className="relative w-full h-64 rounded-none overflow-hidden mb-4 border border-ctp-surface1">
                              <img 
                                src={entry.imageUrl} 
                                alt={entry.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <CardTitle className="text-lg font-semibold mb-3 text-ctp-text">
                            {entry.name}
                          </CardTitle>
                          <p className="text-ctp-subtext1 text-sm mb-6 leading-relaxed flex-grow">
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
                              <span>{entry.fileUrl ? t("downloads.download") : t("downloads.view")}</span>
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