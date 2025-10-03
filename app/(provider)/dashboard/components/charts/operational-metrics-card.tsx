"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Typography } from "@/components/ui/typography";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Clock, CheckCircle, XCircle } from "lucide-react";

export interface OperationalMetrics {
  onboardingCompletion: number; // percentage
  avgResponseTime: number; // in hours
  cancellationRate: number; // percentage
}

interface OperationalMetricsCardProps {
  title?: string;
  subtitle?: string;
  data: OperationalMetrics;
  isAdmin?: boolean;
}

export function OperationalMetricsCard({
  title = "Operational metrics",
  subtitle = "Performance indicators",
  data,
  isAdmin = false,
}: OperationalMetricsCardProps) {
  // Only show to admins
  if (!isAdmin) return null;

  const getResponseTimeBadge = (hours: number) => {
    if (hours <= 2) return { variant: "default" as const, label: "Excellent" };
    if (hours <= 6) return { variant: "secondary" as const, label: "Good" };
    return { variant: "outline" as const, label: "Needs improvement" };
  };

  const getCancellationBadge = (rate: number) => {
    if (rate <= 5) return { variant: "default" as const, label: "Low" };
    if (rate <= 15) return { variant: "secondary" as const, label: "Moderate" };
    return { variant: "outline" as const, label: "High" };
  };

  const responseTimeBadge = getResponseTimeBadge(data.avgResponseTime);
  const cancellationBadge = getCancellationBadge(data.cancellationRate);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <Typography variant="mutedText">{subtitle}</Typography>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Onboarding completion */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
              <Typography variant="smallText" className="font-medium">
                Onboarding completion
              </Typography>
            </div>
            <Typography variant="smallText" className="font-medium">
              {data.onboardingCompletion}%
            </Typography>
          </div>
          <Progress value={data.onboardingCompletion} className="h-2" />
        </div>

        {/* Average response time */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Typography variant="smallText" className="font-medium">
                Avg response time
              </Typography>
            </div>
            <Badge variant={responseTimeBadge.variant}>{responseTimeBadge.label}</Badge>
          </div>
          <Typography variant="smallText" className="text-muted-foreground">
            {data.avgResponseTime} hours
          </Typography>
        </div>

        {/* Cancellation rate */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-muted-foreground" />
              <Typography variant="smallText" className="font-medium">
                Cancellation rate
              </Typography>
            </div>
            <Badge variant={cancellationBadge.variant}>{cancellationBadge.label}</Badge>
          </div>
          <Typography variant="smallText" className="text-muted-foreground">
            {data.cancellationRate}% of bookings
          </Typography>
        </div>
      </CardContent>
    </Card>
  );
}

