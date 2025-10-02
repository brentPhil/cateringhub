"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Typography } from "@/components/ui/typography";
import { Badge } from "@/components/ui/badge";

export interface FunnelStage {
  label: string;
  count: number;
  color: string;
}

interface RequestsFunnelCardProps {
  title?: string;
  subtitle?: string;
  stages: FunnelStage[];
  totalRequests: number;
  conversions: number;
}

export function RequestsFunnelCard({
  title = "Requests funnel",
  subtitle = "Booking pipeline",
  stages,
  totalRequests,
  conversions,
}: RequestsFunnelCardProps) {
  const conversionRate = totalRequests > 0 ? Math.round((conversions / totalRequests) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <Typography variant="mutedText">{subtitle}</Typography>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Conversion summary */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
          <Typography variant="smallText">
            <span className="font-medium">{conversions}</span> out of{" "}
            <span className="font-medium">{totalRequests}</span> requests converted
          </Typography>
          <Badge variant="default">{conversionRate}%</Badge>
        </div>

        {/* Funnel stages */}
        <div className="space-y-2">
          {stages.map((stage, idx) => {
            const percentage = totalRequests > 0 ? (stage.count / totalRequests) * 100 : 0;
            const width = Math.max(percentage, 10); // Minimum 10% width for visibility

            return (
              <div key={stage.label} className="space-y-1">
                <div className="flex items-center justify-between">
                  <Typography variant="smallText" className="font-medium">
                    {stage.label}
                  </Typography>
                  <Typography variant="smallText" className="text-muted-foreground">
                    {stage.count}
                  </Typography>
                </div>
                <div className="relative h-8 bg-muted/30 rounded overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 flex items-center justify-center transition-all"
                    style={{
                      width: `${width}%`,
                      backgroundColor: stage.color,
                    }}
                  >
                    <Typography variant="smallText" className="text-white font-medium">
                      {Math.round(percentage)}%
                    </Typography>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

