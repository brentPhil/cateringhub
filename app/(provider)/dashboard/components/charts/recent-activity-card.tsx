"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Typography } from "@/components/ui/typography";
import { Badge } from "@/components/ui/badge";
import {
  Mail,
  FileText,
  DollarSign,
  Calendar,
  CheckCircle,
} from "lucide-react";

export interface ActivityItem {
  id: string | number;
  text: string;
  time: string;
  type?: "booking" | "proposal" | "payment" | "update" | "completed";
  status?: "paid" | "pending" | "sent" | "confirmed";
}

const activityIcons = {
  booking: Mail,
  proposal: FileText,
  payment: DollarSign,
  update: Calendar,
  completed: CheckCircle,
};

const statusColors = {
  paid: "default",
  pending: "secondary",
  sent: "outline",
  confirmed: "default",
} as const;

interface RecentActivityCardProps {
  title?: string;
  subtitle?: string;
  items: ActivityItem[];
}

export function RecentActivityCard({
  title = "Recent activity",
  subtitle = "Latest updates",
  items,
}: RecentActivityCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <Typography variant="mutedText">{subtitle}</Typography>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {items.map((a) => {
            const Icon = a.type ? activityIcons[a.type] : Mail;

            return (
              <li
                key={a.id}
                className="flex items-start gap-3 pb-3 border-b last:border-0 last:pb-0"
              >
                <Icon className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <Typography className="flex-1">{a.text}</Typography>
                    {a.status && (
                      <Badge
                        variant={statusColors[a.status]}
                        className="flex-shrink-0"
                      >
                        {a.status}
                      </Badge>
                    )}
                  </div>
                  <Typography
                    variant="smallText"
                    className="text-muted-foreground"
                  >
                    {a.time}
                  </Typography>
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
