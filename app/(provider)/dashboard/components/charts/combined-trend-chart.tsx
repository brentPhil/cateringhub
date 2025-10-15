"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  Tooltip,
  ResponsiveContainer,
  Bar,
  BarChart,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Typography } from "@/components/ui/typography";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

export interface TrendDataPoint {
  month: string;
  bookings: number;
  revenue: number;
}

interface CombinedTrendChartProps {
  title?: string;
  subtitle?: string;
  data: TrendDataPoint[];
}

type ViewMode = "bookings" | "revenue";
type ChartType = "area" | "bar";

const bookingsConfig: ChartConfig = {
  bookings: {
    label: "Bookings",
    color: "hsl(var(--chart-1))",
  },
};

const revenueConfig: ChartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(var(--chart-2))",
  },
};

export function CombinedTrendChart({
  title = "Trends",
  subtitle = "Last 6 months",
  data,
}: CombinedTrendChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("bookings");
  const [chartType, setChartType] = useState<ChartType>("area");

  const config = viewMode === "bookings" ? bookingsConfig : revenueConfig;
  const dataKey = viewMode;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <Typography variant="mutedText">{subtitle}</Typography>
          </div>
          <div className="flex gap-2">
            <div className="flex rounded-md border border-border p-1">
              <Button
                size="sm"
                variant={viewMode === "bookings" ? "default" : "ghost"}
                onClick={() => setViewMode("bookings")}
              >
                Bookings
              </Button>
              <Button
                size="sm"
                variant={viewMode === "revenue" ? "default" : "ghost"}
                onClick={() => setViewMode("revenue")}
              >
                Revenue
              </Button>
            </div>
            <div className="flex rounded-md border border-border p-1">
              <Button
                size="sm"
                variant={chartType === "area" ? "default" : "ghost"}
                onClick={() => setChartType("area")}
              >
                Area
              </Button>
              <Button
                size="sm"
                variant={chartType === "bar" ? "default" : "ghost"}
                onClick={() => setChartType("bar")}
              >
                Bar
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === "area" ? (
              <AreaChart data={data} margin={{ left: 12, right: 12 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <Tooltip content={<ChartTooltipContent indicator="line" />} />
                <ChartTooltip cursor={false} />
                <Area
                  dataKey={dataKey}
                  type="monotone"
                  stroke={`var(--color-${dataKey})`}
                  fill={`var(--color-${dataKey})`}
                  fillOpacity={0.2}
                  strokeWidth={2}
                  dot={false}
                />
              </AreaChart>
            ) : (
              <BarChart data={data} margin={{ left: 12, right: 12 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <Tooltip content={<ChartTooltipContent />} />
                <ChartTooltip cursor={false} />
                <Bar
                  dataKey={dataKey}
                  fill={`var(--color-${dataKey})`}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
