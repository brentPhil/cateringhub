"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Users, MapPin, Gauge, Calendar } from "lucide-react";
import type { BookingDetailData } from "../../hooks/use-booking-detail";

interface TeamLocationCardProps {
  booking: BookingDetailData;
}

export function TeamLocationCard({ booking }: TeamLocationCardProps) {
  const { team } = booking;

  // If no team assigned, show empty state
  if (!team) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Team & location</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No team assigned to this booking
        </CardContent>
      </Card>
    );
  }

  const location = team.service_location;

  // Format location display
  const locationParts = [
    location?.barangay,
    location?.city,
    location?.province,
  ].filter(Boolean);
  const locationDisplay = locationParts.length > 0 
    ? locationParts.join(", ") 
    : "No location specified";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Team & location</CardTitle>
      </CardHeader>

      <CardContent className="space-y-3 text-sm">
        {/* Team information */}
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <Users className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium">{team.name}</span>
                {team.status !== "active" && (
                  <Badge variant="outline" className="text-xs">
                    {team.status}
                  </Badge>
                )}
              </div>
              {team.description && (
                <p className="text-xs text-muted-foreground mt-1">
                  {team.description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Team capacity info */}
        {(team.daily_capacity || team.max_concurrent_events) && (
          <>
            <Separator />
            <div className="space-y-2">
              {team.daily_capacity && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    Daily capacity:
                  </span>
                  <span className="text-xs font-medium">
                    {team.daily_capacity} events
                  </span>
                </div>
              )}
              {team.max_concurrent_events && (
                <div className="flex items-center gap-2">
                  <Gauge className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    Max concurrent:
                  </span>
                  <span className="text-xs font-medium">
                    {team.max_concurrent_events} events
                  </span>
                </div>
              )}
            </div>
          </>
        )}

        {/* Service location */}
        {location && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-xs">Service area</span>
                    {location.is_primary && (
                      <Badge variant="secondary" className="text-xs">
                        Primary
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {locationDisplay}
                  </p>
                  {location.street_address && (
                    <p className="text-xs text-muted-foreground">
                      {location.street_address}
                    </p>
                  )}
                  {location.landmark && (
                    <p className="text-xs text-muted-foreground">
                      Near {location.landmark}
                    </p>
                  )}
                </div>
              </div>

              {/* Service radius */}
              {location.service_radius && (
                <div className="rounded-lg bg-muted/50 p-2">
                  <div className="flex items-center gap-2">
                    <Gauge className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Service radius:
                    </span>
                    <span className="text-xs font-medium">
                      {location.service_radius} km
                    </span>
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

