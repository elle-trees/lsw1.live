import { Suspense } from "react";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { LeaderboardEntry } from "@/types/database";
import { formatTime, formatSecondsToTime } from "@/lib/utils";
import { getCategoryName, getPlatformName, getLevelName } from "@/lib/dataValidation";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Brush } from "recharts";
import { useTranslation } from "react-i18next";

interface WRProgressionChartProps {
  data: Array<{ date: string; time: number; timeString: string; run: LeaderboardEntry }>;
  categories: Array<{ id: string; name: string }>;
  platforms: Array<{ id: string; name: string }>;
  levels: Array<{ id: string; name: string }>;
  chartConfig: {
    count: {
      label: string;
      color: string;
    };
  };
}

// Category name overrides for stats page
const CATEGORY_NAME_OVERRIDES: Record<string, string> = {
  'GdR0b0zs2ZFVVvjsglIL': 'Story IL',
  'zRhqEIO8iXYUiHoW5qIp': 'Free Play IL',
};

const getCategoryNameWithOverride = (
  categoryId: string | undefined | null,
  categories: Array<{ id: string; name: string }>,
  srcCategoryName?: string | null
): string => {
  if (categoryId && CATEGORY_NAME_OVERRIDES[categoryId]) {
    return CATEGORY_NAME_OVERRIDES[categoryId];
  }
  return getCategoryName(categoryId, categories, srcCategoryName);
};

export const WRProgressionChart = ({ data, categories, platforms, levels, chartConfig }: WRProgressionChartProps) => {
  const { t } = useTranslation();
  return (
    <ChartContainer config={chartConfig} className="h-[600px] w-full [&_.recharts-brush]:fill-[hsl(var(--muted))] [&_.recharts-brush]:stroke-[hsl(var(--border))] [&_.recharts-brush-slide]:fill-[hsl(var(--muted))] [&_.recharts-brush-traveller]:fill-[hsl(var(--muted))] [&_.recharts-brush-traveller]:stroke-[hsl(var(--border))]">
      <LineChart 
        data={data}
        margin={{ top: 10, right: 30, left: 0, bottom: 60 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="date" 
          tickFormatter={(value) => {
            const date = new Date(value);
            return `${date.getMonth() + 1}/${date.getFullYear()}`;
          }}
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis 
          domain={['auto', 'auto']}
          tickFormatter={(value) => {
            return formatTime(formatSecondsToTime(value));
          }}
          reversed={false}
        />
        <ChartTooltip 
          content={({ active, payload }: any) => {
            if (active && payload && payload.length) {
              const data = payload[0].payload;
              const date = new Date(data.date);
              const run = data.run as LeaderboardEntry;
              
              if (!run) return null;
              
              const categoryName = getCategoryNameWithOverride(run.category, categories);
              const platformName = getPlatformName(run.platform, platforms);
              const levelName = run.level ? getLevelName(run.level, levels) : null;
              
              return (
                <div className="rounded-none border bg-background p-3 shadow-lg max-w-md">
                  <div className="grid gap-3">
                    <div className="flex items-center justify-between gap-4 border-b pb-2">
                      <span className="text-sm font-medium">{t("wrProgression.date")}</span>
                      <span className="text-sm font-semibold">{date.toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 border-b pb-2">
                      <span className="text-sm font-medium">{t("wrProgression.worldRecordTime")}</span>
                      <span className="text-sm font-bold font-mono">{formatTime(data.timeString)}</span>
                    </div>
                    <div className="mt-2">
                      <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                        WR Holder
                      </div>
                      <div className="text-xs border rounded p-2 bg-muted/30">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold" style={{ color: run.nameColor || 'inherit' }}>
                            {run.playerName}
                            {run.player2Name && ` & ${run.player2Name}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap text-muted-foreground">
                          <span>{categoryName}</span>
                          {levelName && <span>• {levelName}</span>}
                          <span>• {platformName}</span>
                          <span>• {run.runType === 'co-op' ? 'Co-op' : 'Solo'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          }}
        />
        <Line 
          type="monotone" 
          dataKey="time" 
          stroke="var(--color-count)" 
          strokeWidth={2}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
        />
        <Brush 
          dataKey="date"
          height={30}
          tickFormatter={(value) => {
            const date = new Date(value);
            return `${date.getMonth() + 1}/${date.getFullYear()}`;
          }}
          fill="hsl(var(--muted))"
          stroke="hsl(var(--border))"
        />
      </LineChart>
    </ChartContainer>
  );
};

