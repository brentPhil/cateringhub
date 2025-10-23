"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Clock, Edit } from "lucide-react";
import { format } from "date-fns";
import type { BookingDetailData } from "../../hooks/use-booking-detail";
import {
  buildStatusTimeline,
  type TimelineEvent,
} from "../utils/booking-utils";

interface CommunicationsTimelineProps {
  booking: BookingDetailData;
}

// Icon mapping for timeline events
const getTimelineIcon = (status: TimelineEvent["status"]) => {
  switch (status) {
    case "completed":
      return CheckCircle;
    case "current":
      return Clock;
    case "pending":
      return Clock;
    default:
      return Clock;
  }
};

// Color mapping for timeline events
const getTimelineColor = (status: TimelineEvent["status"]) => {
  switch (status) {
    case "completed":
      return "text-primary";
    case "current":
      return "text-primary";
    case "pending":
      return "text-muted-foreground";
    default:
      return "text-muted-foreground";
  }
};

// Background color for timeline icons
const getTimelineBgColor = (status: TimelineEvent["status"]) => {
  switch (status) {
    case "completed":
      return "bg-primary/10";
    case "current":
      return "bg-primary/10";
    case "pending":
      return "bg-muted";
    default:
      return "bg-muted";
  }
};

export function CommunicationsTimeline({
  booking,
}: CommunicationsTimelineProps) {
  const timeline = buildStatusTimeline(booking.statusTimeline, booking.status);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Status timeline</CardTitle>
          <Badge variant="outline" className="text-xs capitalize">
            {booking.status.replace("_", " ")}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-3">
          {timeline.map((event, index) => {
            const Icon = getTimelineIcon(event.status);
            const isLast = index === timeline.length - 1;

            return (
              <div key={event.label} className="relative">
                {/* Timeline connector line */}
                {!isLast && (
                  <div
                    className="absolute left-[13px] top-7 bottom-0 w-0.5 bg-border"
                    aria-hidden="true"
                  />
                )}

                {/* Timeline event - compact */}
                <div className="flex items-start gap-2">
                  <span
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${getTimelineBgColor(event.status)}`}
                  >
                    <Icon
                      className={`h-3.5 w-3.5 ${getTimelineColor(event.status)}`}
                    />
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-sm font-medium">{event.label}</div>
                      {event.timestamp && (
                        <div className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(event.timestamp), "MMM dd, h:mm a")}
                        </div>
                      )}
                    </div>
                    {event.description && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {event.description}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Last updated timestamp */}
          {booking.statusTimeline.lastUpdated && (
            <>
              <Separator className="my-2" />
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Edit className="h-3 w-3" />
                <span>
                  Updated{" "}
                  {format(
                    new Date(booking.statusTimeline.lastUpdated),
                    "MMM dd, h:mm a"
                  )}
                </span>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
