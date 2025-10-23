"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Mail, Phone, Calendar, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import type { BookingDetailData } from "../../hooks/use-booking-detail";

interface CustomerInfoCardProps {
  booking: BookingDetailData;
}

export function CustomerInfoCard({ booking }: CustomerInfoCardProps) {
  const hasContactInfo = booking.customer_email || booking.customer_phone;
  const isRepeatCustomer = booking.relatedBookingsCount > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Customer</CardTitle>
          {isRepeatCustomer && (
            <Badge variant="secondary" className="gap-1 text-xs">
              <TrendingUp className="h-3 w-3" />
              Repeat
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3 text-sm">
        {/* Contact information - compact */}
        {hasContactInfo && (
          <div className="space-y-1.5">
            {booking.customer_email && (
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                <a
                  href={`mailto:${booking.customer_email}`}
                  className="text-sm font-medium hover:underline break-all"
                >
                  {booking.customer_email}
                </a>
              </div>
            )}
            {booking.customer_phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                <a
                  href={`tel:${booking.customer_phone}`}
                  className="text-sm font-medium hover:underline"
                >
                  {booking.customer_phone}
                </a>
              </div>
            )}
          </div>
        )}

        {/* Quick contact actions */}
        {hasContactInfo && (
          <div className="pt-3 border-t">
            <div className="grid grid-cols-2 gap-2">
              {booking.customer_email && (
                <Button variant="outline" size="sm" asChild className="gap-1.5">
                  <a href={`mailto:${booking.customer_email}`}>
                    <Mail className="h-3.5 w-3.5" />
                    Email
                  </a>
                </Button>
              )}
              {booking.customer_phone && (
                <Button variant="outline" size="sm" asChild className="gap-1.5">
                  <a href={`tel:${booking.customer_phone}`}>
                    <Phone className="h-3.5 w-3.5" />
                    Call
                  </a>
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Booking history - compact */}
        <Separator />
        <div className="space-y-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-3 w-3" />
            <span>
              First: {format(new Date(booking.created_at), "MMM dd, yyyy")}
            </span>
          </div>
          {isRepeatCustomer && (
            <div className="flex items-center gap-2">
              <TrendingUp className="h-3 w-3" />
              <span>
                Total: {booking.relatedBookingsCount + 1}{" "}
                {booking.relatedBookingsCount + 1 === 1
                  ? "booking"
                  : "bookings"}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
