"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Calendar,
  Clock,
  MapPin,
  Users as UsersIcon,
  AlertCircle,
  UserPlus,
} from "lucide-react";
import { format } from "date-fns";
import type {
  BookingDetailData,
  BookingDetailCapabilities,
} from "../../hooks/use-booking-detail";
import {
  calculateEventCountdown,
  getStatusBadgeVariant,
  formatStatus,
  canReassignBooking,
  canEditLogistics,
} from "../utils/booking-utils";

interface BookingHeroCardProps {
  booking: BookingDetailData;
  capabilities: BookingDetailCapabilities;
}

export function BookingHeroCard({
  booking,
  capabilities,
}: BookingHeroCardProps) {
  const countdown = calculateEventCountdown(
    booking.event_date,
    booking.event_time
  );
  const statusVariant = getStatusBadgeVariant(booking.status);
  const statusLabel = formatStatus(booking.status);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-2xl font-bold">
                {booking.event_type || "Event"}
              </h2>
              <Badge variant={statusVariant}>{statusLabel}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Booking #{booking.id.slice(0, 8)}
            </p>
          </div>
          {countdown.isFuture && (
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Event in</div>
              <div className="text-lg font-bold">{countdown.label}</div>
            </div>
          )}
          {countdown.isPast && (
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Event was</div>
              <div className="text-base font-semibold">{countdown.label}</div>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        {/* Key information grid */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center gap-2">
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
            <div className="truncate text-base font-semibold">
              {booking.customer_name}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div className="text-base font-semibold">
              {format(new Date(booking.event_date), "MMM dd, yyyy")}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div className="text-base font-semibold">
              {booking.event_time ?? "—"}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
            <div className="text-base font-semibold">
              {booking.guest_count ? `${booking.guest_count} guests` : "—"}
            </div>
          </div>
        </div>

        {/* Venue, Assigned, Special requests - compact */}
        {(booking.venue_name ||
          booking.assignedMember ||
          booking.special_requests) && (
          <>
            <Separator />
            <div className="space-y-2 text-sm">
              {booking.venue_name && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">{booking.venue_name}</span>
                    {booking.venue_address && (
                      <span className="text-muted-foreground">
                        {" "}
                        • {booking.venue_address}
                      </span>
                    )}
                  </div>
                </div>
              )}
              {booking.assignedMember && (
                <div className="flex items-center gap-2">
                  <UserPlus className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-medium">
                    {booking.assignedMember.fullName}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {booking.assignedMember.role}
                  </Badge>
                </div>
              )}
              {booking.special_requests && (
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                  <div className="flex-1 min-w-0 text-muted-foreground">
                    {booking.special_requests}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
