"use client";

import { useMemo } from "react";
import { useCurrentMembership } from "@/hooks/use-membership";
import { useBookings } from "./bookings/hooks/use-bookings";
import { useTeamMembers } from "./team/hooks/use-team-members";
import { useWorkerProfiles } from "./workers/hooks/use-worker-profiles";
import { createClient } from "@/lib/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format, startOfDay } from "date-fns";
import {
  DashboardVisualizer,
  type MetricItem,
  type TrendDataPoint,
  type ShiftItem,
  type NoteItem,
  type ExpenseItem,
  type BudgetSummary,
} from "./components/charts/dashboard-visualizer";
import type { ShiftWithAssignee } from "./bookings/hooks/use-shifts";

export default function DashboardPage() {
  // Get current user's membership
  const { data: membership, isLoading: membershipLoading } =
    useCurrentMembership();
  const providerId = membership?.providerId;

  // Fetch bookings data (no filters for dashboard overview)
  const { data: bookingsData, isLoading: bookingsLoading } = useBookings(
    providerId,
    {}
  );

  // Fetch team members
  const { data: teamMembers = [], isLoading: teamLoading } =
    useTeamMembers(providerId);

  // Fetch worker profiles (no filters for dashboard overview)
  const {
    data: workerProfiles = [],
    isLoading: workersLoading,
    error: workersError,
  } = useWorkerProfiles(providerId, { status: "active" });

  // Fetch all shifts for upcoming shifts display
  const { data: allShifts = [], isLoading: shiftsLoading } = useQuery<
    ShiftWithAssignee[]
  >({
    queryKey: ["dashboard-shifts", providerId],
    queryFn: async () => {
      if (!providerId) throw new Error("Provider ID is required");

      const supabase = createClient();

      // Fetch shifts scheduled for today or future
      const { data: shifts, error } = await supabase
        .from("shifts")
        .select("*")
        .gte("scheduled_start", startOfDay(new Date()).toISOString())
        .order("scheduled_start", { ascending: true })
        .limit(10);

      if (error) throw error;

      // Fetch user metadata for each shift
      const shiftsWithMetadata: ShiftWithAssignee[] = await Promise.all(
        (shifts || []).map(async (shift) => {
          if (shift.user_id) {
            // Fetch user metadata
            const { data: userData } = await supabase.auth.admin.getUserById(
              shift.user_id
            );

            return {
              ...shift,
              full_name:
                userData?.user?.user_metadata?.full_name || "Unknown User",
              email: userData?.user?.email,
              avatar_url: userData?.user?.user_metadata?.avatar_url,
              assignee_type: "team_member" as const,
            };
          } else if (shift.worker_profile_id) {
            // Fetch worker profile
            const { data: workerData } = await supabase
              .from("worker_profiles")
              .select("id, name, phone, role, hourly_rate")
              .eq("id", shift.worker_profile_id)
              .single();

            return {
              ...shift,
              full_name: workerData?.name || "Unknown Worker",
              assignee_type: "worker_profile" as const,
              worker_profile: workerData || undefined,
            };
          }

          return {
            ...shift,
            full_name: "Unassigned",
            assignee_type: "team_member" as const,
          };
        })
      );

      return shiftsWithMetadata;
    },
    enabled: !!providerId,
    staleTime: 30 * 1000,
  });

  const isLoading =
    membershipLoading ||
    bookingsLoading ||
    teamLoading ||
    shiftsLoading ||
    workersLoading;
  const bookings = bookingsData?.data || [];
  const canEdit = bookingsData?.canEditBookings || false;
  const canManageWorkers = membership?.capabilities?.canInviteMembers || false;

  // Calculate metrics from real data
  const metrics: MetricItem[] = useMemo(() => {
    const totalBookings = bookings.length;
    const pendingBookings = bookings.filter(
      (b) => b.status === "pending"
    ).length;
    const confirmedBookings = bookings.filter(
      (b) => b.status === "confirmed" || b.status === "in_progress"
    ).length;

    return [
      {
        label: "Total bookings",
        value: totalBookings,
        description: "All time",
      },
      {
        label: "Confirmed",
        value: confirmedBookings,
        description: "Active bookings",
      },
      {
        label: "Pending requests",
        value: pendingBookings,
        description: "Awaiting confirmation",
      },
      {
        label: "Team members",
        value: teamMembers.length,
        description: "Active members",
      },
    ];
  }, [bookings, teamMembers]);

  // Mock trend data (TODO: Calculate from real booking data with date ranges)
  const trendData: TrendDataPoint[] = [
    { month: "January", bookings: 12, revenue: 4200 },
    { month: "February", bookings: 22, revenue: 5600 },
    { month: "March", bookings: 18, revenue: 5100 },
    { month: "April", bookings: 30, revenue: 7300 },
    { month: "May", bookings: 26, revenue: 6800 },
    { month: "June", bookings: 20, revenue: 6400 },
  ];

  // Transform shifts data for dashboard display
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

  // Calculate team stats from team members
  const teamStats = useMemo(() => {
    const activeMembers = teamMembers.filter((m) => m.status === "active");
    // TODO: Calculate actual on-shift status from shifts data
    return {
      onShift: 0, // Would need real-time shift tracking
      available: activeMembers.length,
      off: teamMembers.filter((m) => m.status !== "active").length,
    };
  }, [teamMembers]);

  // Mock notes (no backend structure yet)
  const notes: NoteItem[] = [
    {
      id: "n1",
      title: "Confirm equipment for Saturday",
      content: "Need 3 chafing dishes and 2 induction burners for the gala.",
      date: "Jun 22",
      author: "Sarah K.",
    },
    {
      id: "n2",
      title: "Allergy reminder",
      content: "Wedding party has nut allergies. Double-check desserts list.",
      date: "Jun 21",
      author: "Eddie L.",
    },
    {
      id: "n3",
      title: "Menu change for corporate lunch",
      content: "Swap out beef sliders for grilled chicken skewers.",
      date: "Jun 20",
      author: "Jam",
    },
  ];

  // Mock expenses/budget (no backend structure yet)
  const expenses: ExpenseItem[] = [
    { id: "e1", category: "Ingredients", amount: 450, date: "Jun 20" },
    { id: "e2", category: "Fuel", amount: 120, date: "Jun 21" },
    { id: "e3", category: "Staff overtime", amount: 320, date: "Jun 22" },
    { id: "e4", category: "Equipment rental", amount: 260, date: "Jun 22" },
  ];
  const budget: BudgetSummary = { month: "June", spent: 12750, budget: 25000 };

  return (
    <div className="@container/main space-y-6">
      <DashboardVisualizer
        metrics={metrics}
        trendData={trendData}
        bookings={bookings}
        isLoadingBookings={isLoading}
        canEdit={canEdit}
        currentUserId={membership?.userId}
        providerId={providerId}
        teamStats={teamStats}
        upcomingShifts={upcomingShifts}
        workerProfiles={workerProfiles}
        isLoadingWorkers={workersLoading}
        canManageWorkers={canManageWorkers}
        workersError={workersError}
        notes={notes}
        expenses={expenses}
        budget={budget}
      />
    </div>
  );
}
