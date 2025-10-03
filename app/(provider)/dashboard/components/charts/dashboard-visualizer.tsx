"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import { Badge } from "@/components/ui/badge";
import { MetricsCards, type MetricItem } from "./metrics-cards";
import { RecentActivityCard, type ActivityItem } from "./recent-activity-card";
import { UpcomingEventsCard, type UpcomingEvent } from "./upcoming-events-card";
import { ClientInsightsCard, type ClientInsight } from "./client-insights-card";
import { RequestsFunnelCard, type FunnelStage } from "./requests-funnel-card";
import {
  CombinedTrendChart,
  type TrendDataPoint,
} from "./combined-trend-chart";
import {
  ServicePerformance,
  ServicePerformanceCard,
} from "./service-performance-card";
import {
  OperationalMetricsCard,
  type OperationalMetrics,
} from "./operational-metrics-card";
import { NotificationsPanel, type Notification } from "./notifications-panel";
import { ExportControls } from "./export-controls";

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
  operationalMetrics?: OperationalMetrics;
  notifications?: Notification[];
  isAdmin?: boolean;
  previousPeriodMetrics?: MetricItem[];
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
  operationalMetrics,
  notifications = [],
  isAdmin = false,
  previousPeriodMetrics,
}: DashboardVisualizerProps) {
  const [range, setRange] = useState<Range>("6m");
  const [showComparison, setShowComparison] = useState(false);

  const filteredTrendData = useMemo(
    () => (range === "3m" ? trendData.slice(-3) : trendData),
    [range, trendData]
  );

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Typography variant="h5">Overview</Typography>
        <div className="flex flex-wrap items-center gap-2">
          {previousPeriodMetrics && (
            <Button
              size="sm"
              variant={showComparison ? "default" : "outline"}
              onClick={() => setShowComparison(!showComparison)}
            >
              {showComparison ? "Hide" : "Show"} comparison
            </Button>
          )}
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
          <ExportControls />
        </div>
      </div>

      {/* Metrics */}
      <MetricsCards items={metrics} />

      {/* Comparison metrics (if enabled) */}
      {showComparison && previousPeriodMetrics && (
        <div className="p-4 bg-muted/30 rounded-lg border border-border">
          <div className="flex items-center justify-between mb-3">
            <Typography variant="smallText" className="font-medium">
              Previous period comparison
            </Typography>
            <Badge variant="outline">
              Last {range === "3m" ? "3" : "6"} months
            </Badge>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {previousPeriodMetrics.map((metric, idx) => (
              <div key={idx} className="space-y-1">
                <Typography
                  variant="smallText"
                  className="text-muted-foreground"
                >
                  {metric.label}
                </Typography>
                <Typography variant="h4">{metric.value}</Typography>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notifications (if any) */}
      {notifications.length > 0 && (
        <NotificationsPanel notifications={notifications} />
      )}

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

      {/* Row 4: Operational metrics (admin only) */}
      {operationalMetrics && (
        <OperationalMetricsCard data={operationalMetrics} isAdmin={isAdmin} />
      )}
    </div>
  );
}
