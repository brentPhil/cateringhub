"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Typography } from "@/components/ui/typography";
import { ReactNode } from "react";

export interface MetricItem {
  label: string;
  value: string | number;
  change?: string;
  icon?: ReactNode;
  subtitle?: string; // Additional context like "41 out of 128 requests"
  trend?: "up" | "down" | "neutral";
}

interface MetricsCardsProps {
  items: MetricItem[];
}

export function MetricsCards({ items }: MetricsCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((m) => (
        <Card key={m.label}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Typography variant="mutedText">{m.label}</Typography>
            {m.icon}
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex items-baseline justify-between">
                <Typography variant="h3">{m.value}</Typography>
                {m.change ? (
                  <Badge variant="secondary" className="ml-2">
                    {m.change}
                  </Badge>
                ) : null}
              </div>
              {m.subtitle && (
                <Typography
                  variant="smallText"
                  className="text-muted-foreground"
                >
                  {m.subtitle}
                </Typography>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
