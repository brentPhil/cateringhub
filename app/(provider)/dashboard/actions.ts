"use server";

import { createClient } from "@/lib/supabase/server";

// Types for dashboard analytics
export interface RevenueMetrics {
  total_revenue: number;
  confirmed_revenue: number;
  completed_revenue: number;
  previous_period_revenue: number;
  average_booking_value: number;
  period_start: string;
  period_end: string;
}

export interface BookingStatistics {
  total_bookings: number;
  pending_count: number;
  confirmed_count: number;
  in_progress_count: number;
  completed_count: number;
  cancelled_count: number;
  upcoming_bookings: number;
  total_guests: number;
  average_guests: number;
  period_start: string;
  period_end: string;
}

export interface StaffUtilization {
  total_shifts: number;
  scheduled_shifts: number;
  checked_in_shifts: number;
  completed_shifts: number;
  cancelled_shifts: number;
  total_scheduled_hours: number;
  total_actual_hours: number;
  unique_staff_count: number;
  team_member_shifts: number;
  worker_profile_shifts: number;
  period_start: string;
  period_end: string;
}

export interface ExpenseSummary {
  total_expenses: number;
  expense_count: number;
  average_expense: number;
  category_breakdown: Array<{
    category: string;
    total: number;
    count: number;
  }>;
  period_start: string;
  period_end: string;
}

export interface MonthlyTrendData {
  month: string;
  month_short: string;
  year: number;
  bookings: number;
  revenue: number;
  expenses: number;
  net: number;
}

export interface DashboardAnalytics {
  revenue: RevenueMetrics;
  bookings: BookingStatistics;
  staff: StaffUtilization;
  expenses: ExpenseSummary;
  trends: MonthlyTrendData[];
}

/**
 * Get revenue metrics for a provider within a date range
 */
export async function getRevenueMetrics(
  providerId: string,
  startDate?: string,
  endDate?: string
): Promise<{ success: boolean; data?: RevenueMetrics; error?: string }> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc("get_revenue_metrics", {
      p_provider_id: providerId,
      p_start_date: startDate || null,
      p_end_date: endDate || null,
    });

    if (error) {
      console.error("Error fetching revenue metrics:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error in getRevenueMetrics:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get booking statistics for a provider within a date range
 */
export async function getBookingStatistics(
  providerId: string,
  startDate?: string,
  endDate?: string
): Promise<{ success: boolean; data?: BookingStatistics; error?: string }> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc("get_booking_statistics", {
      p_provider_id: providerId,
      p_start_date: startDate || null,
      p_end_date: endDate || null,
    });

    if (error) {
      console.error("Error fetching booking statistics:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error in getBookingStatistics:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get staff utilization metrics for a provider within a date range
 */
export async function getStaffUtilization(
  providerId: string,
  startDate?: string,
  endDate?: string
): Promise<{ success: boolean; data?: StaffUtilization; error?: string }> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc("get_staff_utilization", {
      p_provider_id: providerId,
      p_start_date: startDate || null,
      p_end_date: endDate || null,
    });

    if (error) {
      console.error("Error fetching staff utilization:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error in getStaffUtilization:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get expense summary for a provider within a date range
 */
export async function getExpenseSummary(
  providerId: string,
  startDate?: string,
  endDate?: string
): Promise<{ success: boolean; data?: ExpenseSummary; error?: string }> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc("get_expense_summary", {
      p_provider_id: providerId,
      p_start_date: startDate || null,
      p_end_date: endDate || null,
    });

    if (error) {
      console.error("Error fetching expense summary:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error in getExpenseSummary:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get monthly trend data for a provider
 */
export async function getMonthlyTrendData(
  providerId: string,
  months: number = 6
): Promise<{ success: boolean; data?: MonthlyTrendData[]; error?: string }> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc("get_monthly_trend_data", {
      p_provider_id: providerId,
      p_months: months,
    });

    if (error) {
      console.error("Error fetching monthly trend data:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error in getMonthlyTrendData:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get all dashboard analytics in a single call
 */
export async function getDashboardAnalytics(
  providerId: string,
  startDate?: string,
  endDate?: string,
  trendMonths: number = 6
): Promise<{ success: boolean; data?: DashboardAnalytics; error?: string }> {
  try {
    console.log("[getDashboardAnalytics] Called with:", { providerId, startDate, endDate, trendMonths });

    // Fetch all analytics in parallel
    const [revenue, bookings, staff, expenses, trends] = await Promise.all([
      getRevenueMetrics(providerId, startDate, endDate),
      getBookingStatistics(providerId, startDate, endDate),
      getStaffUtilization(providerId, startDate, endDate),
      getExpenseSummary(providerId, startDate, endDate),
      getMonthlyTrendData(providerId, trendMonths),
    ]);

    console.log("[getDashboardAnalytics] Results:", {
      revenue: revenue.success,
      bookings: bookings.success,
      staff: staff.success,
      expenses: expenses.success,
      trends: trends.success,
    });

    // Check for errors
    if (!revenue.success) {
      console.error("[getDashboardAnalytics] Revenue failed:", revenue.error);
      return { success: false, error: `Revenue: ${revenue.error}` };
    }
    if (!bookings.success) {
      console.error("[getDashboardAnalytics] Bookings failed:", bookings.error);
      return { success: false, error: `Bookings: ${bookings.error}` };
    }
    if (!staff.success) {
      console.error("[getDashboardAnalytics] Staff failed:", staff.error);
      return { success: false, error: `Staff: ${staff.error}` };
    }
    if (!expenses.success) {
      console.error("[getDashboardAnalytics] Expenses failed:", expenses.error);
      return { success: false, error: `Expenses: ${expenses.error}` };
    }
    if (!trends.success) {
      console.error("[getDashboardAnalytics] Trends failed:", trends.error);
      return { success: false, error: `Trends: ${trends.error}` };
    }

    console.log("[getDashboardAnalytics] Success!");
    return {
      success: true,
      data: {
        revenue: revenue.data!,
        bookings: bookings.data!,
        staff: staff.data!,
        expenses: expenses.data!,
        trends: trends.data!,
      },
    };
  } catch (error) {
    console.error("[getDashboardAnalytics] Exception:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get recent expenses for display
 */
export async function getRecentExpenses(
  providerId: string,
  limit: number = 5
): Promise<{
  success: boolean;
  data?: Array<{
    id: string;
    category: string;
    amount: number;
    expense_date: string;
    description: string;
  }>;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("expenses")
      .select("id, category, amount, expense_date, description")
      .eq("provider_id", providerId)
      .order("expense_date", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching recent expenses:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error("Error in getRecentExpenses:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

