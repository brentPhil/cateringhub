"use client";

import { useState, useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  ResponsiveContainer,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown } from "lucide-react";
import { BookingsTable } from "../../bookings/components/bookings-table";
import { WorkerProfilesTable } from "../../workers/components/worker-profiles-table";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import type { WorkerProfile } from "../../workers/hooks/use-worker-profiles";
import { useQueryState, parseAsStringLiteral } from "nuqs";
import { Database } from "@/types/supabase";

import { useCurrentMembership } from "@/hooks/use-membership";
import { useBookings } from "../../bookings/hooks/use-bookings";
import { useTeamMembers } from "../../team/hooks/use-team-members";
import { useWorkerProfiles } from "../../workers/hooks/use-worker-profiles";
import { useDashboardShifts } from "../../hooks/use-dashboard-shifts";
import { format } from "date-fns";
import {
  useDashboardAnalytics,
  useRecentExpenses,
  useDefaultDateRange,
} from "../../hooks/use-dashboard-analytics";

// Types
type Booking = Database["public"]["Tables"]["bookings"]["Row"];

export interface MetricItem {
  label: string;
  value: string | number;
  change?: string;
  trend?: "up" | "down";
  description?: string;
  format?: "currency" | "number" | "percentage";
}

export interface TrendDataPoint {
  month: string;
  bookings: number;
  revenue: number;
}

// New: Tab data types
export interface TeamStats {
  onShift: number;
  available: number;
  off: number;
}

export interface ShiftItem {
  id: string;
  date: string; // ISO or human readable
  role: string;
  assignee?: string;
  time: string; // e.g., "08:00–12:00"
  status?: "scheduled" | "filled" | "open";
}

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  date: string;
  author: string;
}

export interface ExpenseItem {
  id: string;
  category: string;
  amount: number;
  date: string;
  memo?: string;
}

export interface BudgetSummary {
  month: string;
  spent: number;
  budget: number;
}

export interface DashboardVisualizerProps {
  metrics: MetricItem[];
  trendData: TrendDataPoint[];
  // Bookings tab
  bookings?: Booking[];
  isLoadingBookings?: boolean;
  canEdit?: boolean;
  currentUserId?: string;
  providerId?: string;
  // Team tab
  teamStats?: TeamStats;
  upcomingShifts?: ShiftItem[];
  workerProfiles?: WorkerProfile[];
  isLoadingWorkers?: boolean;
  canManageWorkers?: boolean;
  workersError?: Error | null;
  // Notes tab
  notes?: NoteItem[];
  // Expenses tab
  expenses?: ExpenseItem[];
  budget?: BudgetSummary;
}

const chartConfig = {
  bookings: {
    label: "Bookings",
    color: "var(--primary)",
  },
} satisfies ChartConfig;

const TABS = ["bookings", "team", "notes", "expenses"] as const;

// Column definitions for DataTable
const shiftColumns: ColumnDef<ShiftItem>[] = [
  { accessorKey: "date", header: "Date" },
  { accessorKey: "role", header: "Role" },
  {
    accessorKey: "assignee",
    header: "Assignee",
    cell: ({ row }) => row.original.assignee || "Unassigned",
  },
  { accessorKey: "time", header: "Time" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <Badge variant="outline">{row.original.status}</Badge>,
  },
];

const noteColumns: ColumnDef<NoteItem>[] = [
  { accessorKey: "title", header: "Title" },
  { accessorKey: "author", header: "Author" },
  { accessorKey: "date", header: "Date" },
];

const expenseColumns: ColumnDef<ExpenseItem>[] = [
  { accessorKey: "category", header: "Category" },
  { accessorKey: "date", header: "Date" },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) => `$${row.original.amount.toLocaleString()}`,
  },
];

export function DashboardVisualizer() {
  // Membership
  const { data: membership } = useCurrentMembership();
  const providerId = membership?.providerId;

  // Default date range
  const { startDate, endDate } = useDefaultDateRange();

  // Analytics
  const { data: analytics } = useDashboardAnalytics({
    providerId,
    startDate,
    endDate,
    trendMonths: 6,
    enabled: !!providerId,
  });

  // Expenses
  const { data: recentExpenses = [] } = useRecentExpenses(providerId, 4);

  // Bookings
  const { data: bookingsData, isLoading: bookingsLoading } = useBookings(
    providerId,
    {}
  );

  // Team members and worker profiles
  const { data: teamMembers = [] } = useTeamMembers(providerId);
  const {
    data: workerProfiles = [],
    isLoading: workersLoading,
    error: workersError,
  } = useWorkerProfiles(providerId, { status: "active" });

  // Upcoming shifts for dashboard
  const { data: allShifts = [] } = useDashboardShifts(providerId);

  // Derived values
  const bookings = useMemo(
    () => bookingsData?.data || [],
    [bookingsData?.data]
  );
  const canEdit = bookingsData?.canEditBookings || false;
  const canManageWorkers = membership?.capabilities?.canInviteMembers || false;
  const currentUserId = membership?.userId;

  const metrics: MetricItem[] = useMemo(() => {
    if (!analytics) {
      return [
        { label: "Total bookings", value: 0, description: "Last 30 days" },
        { label: "Confirmed", value: 0, description: "Active bookings" },
        {
          label: "Pending requests",
          value: 0,
          description: "Awaiting confirmation",
        },
        {
          label: "Team members",
          value: teamMembers.length,
          description: "Active members",
        },
      ];
    }

    const revenueChange =
      analytics.revenue.previous_period_revenue > 0
        ? ((analytics.revenue.confirmed_revenue -
            analytics.revenue.previous_period_revenue) /
            analytics.revenue.previous_period_revenue) *
          100
        : 0;

    return [
      {
        label: "Total revenue",
        value: analytics.revenue.confirmed_revenue,
        description: `${revenueChange >= 0 ? "+" : ""}${revenueChange.toFixed(1)}% from last period`,
        format: "currency",
      },
      {
        label: "Total bookings",
        value: analytics.bookings.total_bookings,
        description: "Last 30 days",
      },
      {
        label: "Pending requests",
        value: analytics.bookings.pending_count,
        description: "Awaiting confirmation",
      },
      {
        label: "Team members",
        value: teamMembers.length,
        description: "Active members",
      },
    ];
  }, [analytics, teamMembers]);

  const trendData: TrendDataPoint[] = useMemo(() => {
    if (!analytics) {
      return [];
    }

    return analytics.trends.map((trend) => ({
      month: trend.month_short,
      bookings: trend.bookings,
      revenue: trend.revenue,
    }));
  }, [analytics]);

  const upcomingShifts: ShiftItem[] = useMemo(() => {
    return allShifts.slice(0, 5).map((shift) => ({
      id: shift.id,
      date: shift.scheduled_start
        ? format(new Date(shift.scheduled_start), "MMM dd")
        : "TBD",
      role: shift.role || "Staff",
      assignee: shift.full_name !== "Unassigned" ? shift.full_name : undefined,
      time:
        shift.scheduled_start && shift.scheduled_end
          ? `${format(new Date(shift.scheduled_start), "HH:mm")}–${format(new Date(shift.scheduled_end), "HH:mm")}`
          : "TBD",
      status:
        shift.status === "scheduled" && shift.full_name !== "Unassigned"
          ? ("filled" as const)
          : shift.status === "scheduled"
            ? ("open" as const)
            : ("scheduled" as const),
    }));
  }, [allShifts]);

  const teamStats = useMemo(() => {
    const activeMembers = teamMembers.filter((m) => m.status === "active");

    if (!analytics) {
      return {
        onShift: 0,
        available: activeMembers.length,
        off: teamMembers.filter((m) => m.status !== "active").length,
      };
    }

    const onShift = analytics.staff.checked_in_shifts;

    return {
      onShift,
      available: activeMembers.length - onShift,
      off: teamMembers.filter((m) => m.status !== "active").length,
    };
  }, [teamMembers, analytics]);

  // Notes not implemented yet
  const notes: NoteItem[] = [];

  const expenses: ExpenseItem[] = useMemo(() => {
    return recentExpenses.map((expense) => ({
      id: expense.id,
      category: expense.category,
      amount: expense.amount,
      date: expense.date,
    }));
  }, [recentExpenses]);

  const budget: BudgetSummary = useMemo(() => {
    if (!analytics) {
      return { month: "Current", spent: 0, budget: 0 };
    }

    const currentMonth = analytics.trends[analytics.trends.length - 1];

    return {
      month: currentMonth?.month || "Current",
      spent: analytics.expenses.total_expenses,
      budget: analytics.revenue.confirmed_revenue, // Using revenue as budget target
    };
  }, [analytics]);
  const [timeRange, setTimeRange] = useState("90d");
  const [activeTab, setActiveTab] = useQueryState(
    "tab",
    parseAsStringLiteral(TABS).withDefault("bookings")
  );

  // Wrapper to satisfy Tabs onValueChange typing
  const handleTabChange = (value: string) => {
    setActiveTab(value as (typeof TABS)[number]);
  };

  const filteredData = useMemo(() => {
    if (timeRange === "30d") return trendData.slice(-3);
    return trendData;
  }, [timeRange, trendData]);

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        {metrics.map((metric, index) => {
          // Format value based on format type
          const formattedValue =
            metric.format === "currency"
              ? new Intl.NumberFormat("en-PH", {
                  style: "currency",
                  currency: "PHP",
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                }).format(Number(metric.value))
              : metric.format === "percentage"
                ? `${Number(metric.value).toFixed(1)}%`
                : metric.value;

          return (
            <Card key={index}>
              <CardHeader>
                <CardDescription>{metric.label}</CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums">
                  {formattedValue}
                </CardTitle>
                {metric.change && (
                  <CardAction>
                    <Badge variant="outline">
                      {metric.trend === "up" ? (
                        <TrendingUp className="size-3" />
                      ) : metric.trend === "down" ? (
                        <TrendingDown className="size-3" />
                      ) : null}
                      {metric.change}
                    </Badge>
                  </CardAction>
                )}
              </CardHeader>
              {metric.description && (
                <CardFooter>
                  <div className="text-muted-foreground">
                    {metric.description}
                  </div>
                </CardFooter>
              )}
            </Card>
          );
        })}
      </div>

      {/* Interactive Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Bookings trend</CardTitle>
          <CardDescription>
            Total bookings for the last 3 months
          </CardDescription>
          <CardAction>
            <ToggleGroup
              type="single"
              value={timeRange}
              onValueChange={setTimeRange}
              variant="outline"
            >
              <ToggleGroupItem value="90d">Last 3 months</ToggleGroupItem>
              <ToggleGroupItem value="30d">Last 30 days</ToggleGroupItem>
            </ToggleGroup>
          </CardAction>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[250px] w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={filteredData}>
                <defs>
                  <linearGradient id="fillBookings" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="var(--color-bookings)"
                      stopOpacity={1.0}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--color-bookings)"
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) => value.slice(0, 3)}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="dot" hideLabel />}
                />
                <Area
                  dataKey="bookings"
                  type="natural"
                  fill="url(#fillBookings)"
                  fillOpacity={0.6}
                  stroke="var(--color-bookings)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Tabs Section */}
      <Tabs value={activeTab ?? "bookings"} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
        </TabsList>

        {/* Bookings Tab */}
        <TabsContent value="bookings">
          <BookingsTable
            bookings={bookings}
            isLoading={bookingsLoading}
            canEdit={canEdit}
            currentUserId={currentUserId}
            providerId={providerId}
          />
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="space-y-3">
          {/* Compact Staffing Metrics Bar */}
          <div className="grid grid-cols-3 gap-3 rounded-lg border bg-card p-3">
            <div className="flex flex-col">
              <div className="text-xl font-semibold tabular-nums">
                {teamStats?.onShift ?? 0}
              </div>
              <div className="text-muted-foreground text-xs">On shift</div>
            </div>
            <div className="flex flex-col border-l pl-3">
              <div className="text-xl font-semibold tabular-nums">
                {teamStats?.available ?? 0}
              </div>
              <div className="text-muted-foreground text-xs">Available</div>
            </div>
            <div className="flex flex-col border-l pl-3">
              <div className="text-xl font-semibold tabular-nums">
                {teamStats?.off ?? 0}
              </div>
              <div className="text-muted-foreground text-xs">Off</div>
            </div>
          </div>

          {/* Two Column Layout: Shifts + Workers */}
          <div className="grid gap-3 md:grid-cols-2">
            {/* Upcoming Shifts */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">
                  Upcoming shifts
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <DataTable columns={shiftColumns} data={upcomingShifts} />
              </CardContent>
            </Card>

            {/* Worker Profiles - Compact View */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">
                  Worker profiles
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <WorkerProfilesTable
                  workers={workerProfiles}
                  isLoading={workersLoading}
                  canManage={canManageWorkers}
                  onEdit={() => {}}
                  onDelete={() => {}}
                  error={workersError}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes">
          <Card>
            <CardHeader>
              <CardTitle>Recent notes</CardTitle>
              <CardDescription>Team updates and reminders</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable columns={noteColumns} data={notes} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Expenses Tab */}
        <TabsContent value="expenses">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Budget overview</CardTitle>
                <CardDescription>
                  {budget?.month || "This month"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <div className="text-2xl font-semibold tabular-nums">
                    ${(budget?.spent ?? 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    spent of ${(budget?.budget ?? 0).toLocaleString()}
                  </div>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary"
                    style={{
                      width: `${Math.min(100, Math.round(((budget?.spent ?? 0) / (budget?.budget || 1)) * 100))}%`,
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent expenses</CardTitle>
                <CardDescription>Last 5 entries</CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable columns={expenseColumns} data={expenses} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
