"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Typography } from "@/components/ui/typography";
import { Progress } from "@/components/ui/progress";

export interface ServicePerformance {
  name: string;
  bookings: number;
  avgRevenue: number;
  percentage: number;
}

interface ServicePerformanceCardProps {
  title?: string;
  subtitle?: string;
  services: ServicePerformance[];
}

export function ServicePerformanceCard({
  title = "Service performance",
  subtitle = "Revenue per service type",
  services,
}: ServicePerformanceCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <Typography variant="mutedText">{subtitle}</Typography>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4">
          {services.map((service) => (
            <li key={service.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <Typography variant="smallText" className="font-medium">
                  {service.name}
                </Typography>
                <Typography variant="smallText" className="text-muted-foreground">
                  {service.percentage}%
                </Typography>
              </div>
              <Progress value={service.percentage} className="h-2" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{service.bookings} bookings</span>
                <span>${service.avgRevenue.toLocaleString()} avg</span>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

