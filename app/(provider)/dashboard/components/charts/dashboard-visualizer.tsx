"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import { MetricsCards, type MetricItem } from "./metrics-cards";
import { RecentActivityCard, type ActivityItem } from "./recent-activity-card";
import { UpcomingEventsCard, type UpcomingEvent } from "./upcoming-events-card";
import { ClientInsightsCard, type ClientInsight } from "./client-insights-card";
import {
  ServicePerformanceCard,
  type ServicePerformance,
} from "./service-performance-card";
import { RequestsFunnelCard, type FunnelStage } from "./requests-funnel-card";
import {
  CombinedTrendChart,
  type TrendDataPoint,
} from "./combined-trend-chart";

export interface DashboardVisualizerProps {
  metrics: MetricItem[];
  trendData: TrendDataPoint[];
  services: ServicePerformance[];
  activity: ActivityItem[];
  upcomingEvents: UpcomingEvent[];
  clientInsights: ClientInsight;
  funnelStages: FunnelStage[];
  totalRequests: number;
  conversions: number;
}

type Range = "3m" | "6m";

export function DashboardVisualizer({
  metrics,
  trendData,
  services,
  activity,
  upcomingEvents,
  clientInsights,
  funnelStages,
  totalRequests,
  conversions,
}: DashboardVisualizerProps) {
  const [range, setRange] = useState<Range>("6m");

  const filteredTrendData = useMemo(
    () => (range === "3m" ? trendData.slice(-3) : trendData),
    [range, trendData]
  );

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <Typography variant="h5">Overview</Typography>
        <div className="flex items-center gap-2">
          <Typography variant="smallText" className="text-muted-foreground">
            Range
          </Typography>
          <div className="flex rounded-md border border-border p-1">
            <Button
              size="sm"
              variant={range === "3m" ? "default" : "ghost"}
              onClick={() => setRange("3m")}
            >
              3 months
            </Button>
            <Button
              size="sm"
              variant={range === "6m" ? "default" : "ghost"}
              onClick={() => setRange("6m")}
            >
              6 months
            </Button>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <MetricsCards items={metrics} />

      {/* Row 1: Upcoming events + Client insights */}
      <div className="grid gap-4 lg:grid-cols-2">
        <UpcomingEventsCard events={upcomingEvents} />
        <ClientInsightsCard data={clientInsights} />
      </div>

      {/* Row 2: Combined trend chart + Requests funnel */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CombinedTrendChart data={filteredTrendData} />
        </div>
        <RequestsFunnelCard
          stages={funnelStages}
          totalRequests={totalRequests}
          conversions={conversions}
        />
      </div>

      {/* Row 3: Service performance + Recent activity */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ServicePerformanceCard services={services} />
        </div>
        <RecentActivityCard items={activity} />
      </div>
    </div>
  );
}
