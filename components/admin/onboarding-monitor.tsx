"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
} from "lucide-react";

interface OnboardingMetrics {
  totalProviders: number;
  completedOnboarding: number;
  incompleteOnboarding: number;
  recentCompletions: number;
  averageCompletionTime: number;
  errorRate: number;
  abandonmentRate: number;
}

interface OnboardingIssue {
  id: string;
  type: "validation" | "database" | "performance" | "error";
  message: string;
  timestamp: Date;
  severity: "low" | "medium" | "high";
}

export function OnboardingMonitor() {
  const supabase = createClient();

  // Fetch onboarding metrics
  const {
    data: metrics,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["onboarding-metrics"],
    queryFn: async (): Promise<OnboardingMetrics> => {
      // Get provider counts
      const { data: providerCounts, error: countError } = await supabase
        .from("providers")
        .select("onboarding_completed, created_at")
        .order("created_at", { ascending: false });

      if (countError) throw countError;

      const totalProviders = providerCounts?.length || 0;
      const completedOnboarding =
        providerCounts?.filter((p) => p.onboarding_completed).length || 0;
      const incompleteOnboarding = totalProviders - completedOnboarding;

      // Get recent completions (last 24 hours)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const recentCompletions =
        providerCounts?.filter(
          (p) => p.onboarding_completed && new Date(p.created_at) > yesterday
        ).length || 0;

      // Calculate metrics
      const completionRate =
        totalProviders > 0 ? (completedOnboarding / totalProviders) * 100 : 0;
      const abandonmentRate = 100 - completionRate;

      return {
        totalProviders,
        completedOnboarding,
        incompleteOnboarding,
        recentCompletions,
        averageCompletionTime: 0, // Would need additional tracking
        errorRate: 0, // Would need error logging
        abandonmentRate,
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Mock issues for demonstration (in real app, these would come from error logging)
  const [issues] = React.useState<OnboardingIssue[]>([
    {
      id: "1",
      type: "performance",
      message: "Form validation taking longer than expected",
      timestamp: new Date(),
      severity: "medium",
    },
    {
      id: "2",
      type: "validation",
      message: "High rate of mobile number validation failures",
      timestamp: new Date(Date.now() - 3600000),
      severity: "low",
    },
  ]);

  const getSeverityColor = (severity: OnboardingIssue["severity"]) => {
    switch (severity) {
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "default";
    }
  };

  const getTypeIcon = (type: OnboardingIssue["type"]) => {
    switch (type) {
      case "validation":
        return <AlertTriangle className="h-4 w-4" />;
      case "database":
        return <AlertTriangle className="h-4 w-4" />;
      case "performance":
        return <Clock className="h-4 w-4" />;
      case "error":
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Onboarding Monitor</h2>
          <Button disabled>
            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            Loading...
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Onboarding Monitor</h2>
          <Button onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
              <p>Failed to load onboarding metrics</p>
              <p className="text-sm text-gray-500 mt-1">
                {error instanceof Error ? error.message : "Unknown error"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Onboarding Monitor</h2>
        <Button onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Providers
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.totalProviders || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              All registered providers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {metrics?.completedOnboarding || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Successfully onboarded
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Incomplete</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {metrics?.incompleteOnboarding || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              In progress or abandoned
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent (24h)</CardTitle>
            <RefreshCw className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {metrics?.recentCompletions || 0}
            </div>
            <p className="text-xs text-muted-foreground">Completed today</p>
          </CardContent>
        </Card>
      </div>

      {/* Success Rate */}
      <Card>
        <CardHeader>
          <CardTitle>Success Metrics</CardTitle>
          <CardDescription>
            Onboarding completion and abandonment rates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Completion Rate</span>
                <span>
                  {metrics?.totalProviders
                    ? (
                        (metrics.completedOnboarding / metrics.totalProviders) *
                        100
                      ).toFixed(1)
                    : 0}
                  %
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{
                    width: `${
                      metrics?.totalProviders
                        ? (metrics.completedOnboarding /
                            metrics.totalProviders) *
                          100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Abandonment Rate</span>
                <span>{metrics?.abandonmentRate?.toFixed(1) || 0}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-red-600 h-2 rounded-full"
                  style={{ width: `${metrics?.abandonmentRate || 0}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Issues */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Issues</CardTitle>
          <CardDescription>
            Monitoring alerts and performance issues
          </CardDescription>
        </CardHeader>
        <CardContent>
          {issues.length === 0 ? (
            <div className="text-center py-4 text-green-600">
              <CheckCircle className="h-8 w-8 mx-auto mb-2" />
              <p>No issues detected</p>
            </div>
          ) : (
            <div className="space-y-3">
              {issues.map((issue) => (
                <div
                  key={issue.id}
                  className="flex items-start space-x-3 p-3 border rounded-lg"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {getTypeIcon(issue.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium">{issue.message}</p>
                      <Badge variant={getSeverityColor(issue.severity)}>
                        {issue.severity}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {issue.timestamp.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
