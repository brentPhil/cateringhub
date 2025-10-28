"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getDashboardAnalytics,
  getRecentExpenses,
  type DashboardAnalytics,
} from "../actions";
import { subDays } from "date-fns";

export interface UseDashboardAnalyticsOptions {
  providerId?: string;
  startDate?: Date;
  endDate?: Date;
  trendMonths?: number;
  enabled?: boolean;
}

export interface ExpenseItem {
  id: string;
  category: string;
  amount: number;
  date: string;
}

export interface BudgetSummary {
  month: string;
  spent: number;
  budget: number;
}

/**
 * Hook to fetch dashboard analytics data
 */
export function useDashboardAnalytics(options: UseDashboardAnalyticsOptions) {
  const {
    providerId,
    startDate,
    endDate,
    trendMonths = 6,
    enabled = true,
  } = options;

  // Memoize the date strings to prevent infinite re-renders
  // Extract getTime() to separate variables for stable comparison
  const startDateTime = startDate?.getTime();
  const endDateTime = endDate?.getTime();

  const startDateStr = useMemo(
    () =>
      startDateTime !== undefined
        ? new Date(startDateTime).toISOString().split("T")[0]
        : undefined,
    [startDateTime]
  );
  const endDateStr = useMemo(
    () =>
      endDateTime !== undefined
        ? new Date(endDateTime).toISOString().split("T")[0]
        : undefined,
    [endDateTime]
  );

  return useQuery({
    queryKey: [
      "dashboard-analytics",
      providerId,
      startDateStr,
      endDateStr,
      trendMonths,
    ],
    queryFn: async () => {
      if (!providerId) {
        throw new Error("Provider ID is required");
      }

      const result = await getDashboardAnalytics(
        providerId,
        startDateStr,
        endDateStr,
        trendMonths
      );

      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to fetch dashboard analytics");
      }

      return result.data;
    },
    enabled: enabled && !!providerId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to fetch recent expenses
 */
export function useRecentExpenses(providerId?: string, limit: number = 5) {
  return useQuery({
    queryKey: ["recent-expenses", providerId, limit],
    queryFn: async () => {
      if (!providerId) {
        throw new Error("Provider ID is required");
      }

      const result = await getRecentExpenses(providerId, limit);

      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to fetch recent expenses");
      }

      // Transform to ExpenseItem format
      return result.data.map((expense) => ({
        id: expense.id,
        category: formatCategory(expense.category),
        amount: expense.amount,
        date: new Date(expense.expense_date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
      }));
    },
    enabled: !!providerId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: false, // Disable retries to prevent infinite loop
    refetchOnWindowFocus: false, // Prevent refetch on window focus
    refetchOnMount: false, // Prevent refetch on mount after initial load
  });
}

/**
 * Helper function to format expense category
 */
function formatCategory(category: string): string {
  return category
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Hook to get default date range (last 30 days)
 */
export function useDefaultDateRange() {
  return useMemo(() => {
    const endDate = new Date();
    const startDate = subDays(endDate, 30);
    return { startDate, endDate };
  }, []); // Empty deps - only calculate once on mount
}

/**
 * Transform dashboard analytics to component-friendly format
 */
export function transformAnalyticsData(data: DashboardAnalytics) {
  // Transform trend data for charts
  const trendData = data.trends.map((trend) => ({
    month: trend.month_short,
    bookings: trend.bookings,
    revenue: trend.revenue,
  }));

  // Calculate revenue change percentage
  const revenueChange =
    data.revenue.previous_period_revenue > 0
      ? ((data.revenue.confirmed_revenue -
          data.revenue.previous_period_revenue) /
          data.revenue.previous_period_revenue) *
        100
      : 0;

  // Calculate budget summary from current month
  const currentMonth = data.trends[data.trends.length - 1];
  const budget: BudgetSummary = {
    month: currentMonth?.month || "Current",
    spent: currentMonth?.expenses || 0,
    budget: currentMonth?.revenue || 0, // Could be a separate budget field in the future
  };

  return {
    trendData,
    revenueChange,
    budget,
  };
}
