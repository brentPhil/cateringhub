import { getUserRole } from "@/app/auth/actions";
import { type MetricItem } from "./components/charts/metrics-cards";
import { type ActivityItem } from "./components/charts/recent-activity-card";
import { type UpcomingEvent } from "./components/charts/upcoming-events-card";
import { type ClientInsight } from "./components/charts/client-insights-card";
import { type ServicePerformance } from "./components/charts/service-performance-card";
import { type FunnelStage } from "./components/charts/requests-funnel-card";
import { type TrendDataPoint } from "./components/charts/combined-trend-chart";
import { type OperationalMetrics } from "./components/charts/operational-metrics-card";
import { type Notification } from "./components/charts/notifications-panel";
import { DashboardVisualizer } from "./components/charts/dashboard-visualizer";
import {
  CalendarDays,
  CircleDollarSign,
  Clock,
  TrendingUp,
} from "lucide-react";

export default async function DashboardPage() {
  // Get user role to determine if admin
  const userRoleData = await getUserRole();
  const isAdmin = userRoleData?.role === "admin";

  // Mock dashboard data (visualization only)
  const metrics: MetricItem[] = [
    {
      label: "Total bookings",
      value: 128,
      change: "+12%",
      icon: <CalendarDays className="h-4 w-4" />,
    },
    {
      label: "Revenue",
      value: "$42.7k",
      change: "+8%",
      icon: <CircleDollarSign className="h-4 w-4" />,
    },
    {
      label: "Pending requests",
      value: 9,
      change: "-2",
      icon: <Clock className="h-4 w-4" />,
    },
    {
      label: "Conversion",
      value: "32%",
      change: "+3%",
      subtitle: "41 out of 128 requests",
      icon: <TrendingUp className="h-4 w-4" />,
    },
  ];

  const trendData: TrendDataPoint[] = [
    { month: "Jan", bookings: 12, revenue: 4200 },
    { month: "Feb", bookings: 22, revenue: 5600 },
    { month: "Mar", bookings: 18, revenue: 5100 },
    { month: "Apr", bookings: 30, revenue: 7300 },
    { month: "May", bookings: 26, revenue: 6800 },
    { month: "Jun", bookings: 20, revenue: 6400 },
  ];

  const services: ServicePerformance[] = [
    { name: "Weddings", bookings: 56, avgRevenue: 3200, percentage: 44 },
    { name: "Corporate", bookings: 36, avgRevenue: 1800, percentage: 28 },
    { name: "Birthdays", bookings: 20, avgRevenue: 950, percentage: 16 },
    { name: "Others", bookings: 16, avgRevenue: 750, percentage: 12 },
  ];

  const recentActivity: ActivityItem[] = [
    {
      id: 1,
      text: "New booking request from ACME Corp.",
      time: "2h ago",
      type: "booking",
      status: "pending",
    },
    {
      id: 2,
      text: "Proposal sent to Sarah’s wedding.",
      time: "5h ago",
      type: "proposal",
      status: "sent",
    },
    {
      id: 3,
      text: "Menu updated: added seafood options.",
      time: "Yesterday",
      type: "update",
    },
    {
      id: 4,
      text: "Invoice paid: Johnson family reunion.",
      time: "2 days ago",
      type: "payment",
      status: "paid",
    },
  ];

  const upcomingEvents: UpcomingEvent[] = [
    {
      id: 1,
      date: "Oct 15, 2025",
      clientName: "ACME Corp",
      serviceType: "Corporate lunch",
      location: "Downtown Office",
      status: "confirmed",
    },
    {
      id: 2,
      date: "Oct 18, 2025",
      clientName: "Sarah & John",
      serviceType: "Wedding reception",
      location: "Grand Hotel",
      status: "confirmed",
    },
    {
      id: 3,
      date: "Oct 20, 2025",
      clientName: "Tech Startup Inc",
      serviceType: "Team building",
      status: "tentative",
    },
  ];

  const clientInsights: ClientInsight = {
    newCustomers: 45,
    repeatCustomers: 83,
    topClients: [
      { name: "ACME Corp", bookings: 12, revenue: 18500 },
      { name: "Tech Startup Inc", bookings: 8, revenue: 14200 },
      { name: "Grand Hotel", bookings: 6, revenue: 19800 },
    ],
  };

  const funnelStages: FunnelStage[] = [
    { label: "Pending", count: 9, color: "hsl(var(--chart-3))" },
    { label: "Approved", count: 87, color: "hsl(var(--chart-1))" },
    { label: "Completed", count: 41, color: "hsl(var(--chart-2))" },
    { label: "Canceled", count: 32, color: "hsl(var(--muted))" },
  ];

  // Operational metrics (admin only)
  const operationalMetrics: OperationalMetrics = {
    onboardingCompletion: 85,
    avgResponseTime: 3.5,
    cancellationRate: 8,
  };

  // Notifications
  const notifications: Notification[] = [
    {
      id: 1,
      title: "New booking request",
      message: "ACME Corp requested catering for Oct 25",
      type: "info",
      time: "10 min ago",
      isRead: false,
    },
    {
      id: 2,
      title: "Payment received",
      message: "Johnson family reunion payment confirmed",
      type: "success",
      time: "2h ago",
      isRead: false,
    },
    {
      id: 3,
      title: "Overdue invoice",
      message: "Invoice #1234 is 5 days overdue",
      type: "warning",
      time: "1 day ago",
      isRead: true,
    },
  ];

  // Previous period metrics for comparison
  const previousPeriodMetrics: MetricItem[] = [
    { label: "Total bookings", value: 114 },
    { label: "Revenue", value: "$39.2k" },
    { label: "Pending requests", value: 11 },
    { label: "Conversion", value: "29%" },
  ];

  return (
    <div className="space-y-6">
      <DashboardVisualizer
        metrics={metrics}
        trendData={trendData}
        services={services}
        activity={recentActivity}
        upcomingEvents={upcomingEvents}
        clientInsights={clientInsights}
        funnelStages={funnelStages}
        totalRequests={128}
        conversions={41}
        operationalMetrics={operationalMetrics}
        notifications={notifications}
        isAdmin={isAdmin}
        previousPeriodMetrics={previousPeriodMetrics}
      />
    </div>
  );
}
