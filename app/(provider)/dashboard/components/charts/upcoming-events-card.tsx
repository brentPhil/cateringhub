"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Typography } from "@/components/ui/typography";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin } from "lucide-react";

export interface UpcomingEvent {
  id: string | number;
  date: string;
  clientName: string;
  serviceType: string;
  location?: string;
  status: "confirmed" | "pending" | "tentative";
}

interface UpcomingEventsCardProps {
  title?: string;
  subtitle?: string;
  events: UpcomingEvent[];
}

const statusColors = {
  confirmed: "default",
  pending: "secondary",
  tentative: "outline",
} as const;

export function UpcomingEventsCard({
  title = "Upcoming events",
  subtitle = "Next 7 days",
  events,
}: UpcomingEventsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <Typography variant="mutedText">{subtitle}</Typography>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <Typography variant="mutedText" className="text-center py-4">
            No upcoming events
          </Typography>
        ) : (
          <ul className="space-y-3">
            {events.map((event) => (
              <li key={event.id} className="flex items-start gap-3 pb-3 border-b last:border-0 last:pb-0">
                <Calendar className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <Typography className="font-medium truncate">{event.clientName}</Typography>
                    <Badge variant={statusColors[event.status]} className="flex-shrink-0">
                      {event.status}
                    </Badge>
                  </div>
                  <Typography variant="smallText" className="text-muted-foreground">
                    {event.date} • {event.serviceType}
                  </Typography>
                  {event.location && (
                    <div className="flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <Typography variant="smallText" className="text-muted-foreground truncate">
                        {event.location}
                      </Typography>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

