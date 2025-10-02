"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Typography } from "@/components/ui/typography";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingUp } from "lucide-react";

export interface ClientInsight {
  newCustomers: number;
  repeatCustomers: number;
  topClients: Array<{
    name: string;
    bookings: number;
    revenue: number;
  }>;
}

interface ClientInsightsCardProps {
  title?: string;
  subtitle?: string;
  data: ClientInsight;
}

export function ClientInsightsCard({
  title = "Client insights",
  subtitle = "Customer breakdown",
  data,
}: ClientInsightsCardProps) {
  const total = data.newCustomers + data.repeatCustomers;
  const repeatPercentage = total > 0 ? Math.round((data.repeatCustomers / total) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <Typography variant="mutedText">{subtitle}</Typography>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Customer breakdown */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <Typography variant="smallText" className="text-muted-foreground">
                New customers
              </Typography>
            </div>
            <Typography variant="h4">{data.newCustomers}</Typography>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <Typography variant="smallText" className="text-muted-foreground">
                Repeat customers
              </Typography>
            </div>
            <div className="flex items-baseline gap-2">
              <Typography variant="h4">{data.repeatCustomers}</Typography>
              <Badge variant="secondary">{repeatPercentage}%</Badge>
            </div>
          </div>
        </div>

        {/* Top clients */}
        {data.topClients.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <Typography variant="smallText" className="font-medium">
              Top clients
            </Typography>
            <ul className="space-y-2">
              {data.topClients.map((client, idx) => (
                <li key={idx} className="flex items-center justify-between">
                  <Typography variant="smallText" className="truncate flex-1">
                    {client.name}
                  </Typography>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Typography variant="smallText" className="text-muted-foreground">
                      {client.bookings} bookings
                    </Typography>
                    <Typography variant="smallText" className="font-medium">
                      ${client.revenue.toLocaleString()}
                    </Typography>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

