import { differenceInDays, differenceInHours, differenceInMinutes, isPast } from "date-fns";
import type { Database } from "@/types/supabase";
import type { StatusTimeline, ProviderConstraints, BookingDetailCapabilities } from "../../hooks/use-booking-detail";

type BookingStatus = Database['public']['Enums']['booking_status'];

/**
 * Timeline event for status progression
 */
export interface TimelineEvent {
  label: string;
  timestamp: string | null;
  status: 'completed' | 'current' | 'pending';
  description?: string;
}

/**
 * Build status timeline from booking timestamps
 */
export function buildStatusTimeline(
  statusTimeline: StatusTimeline,
  currentStatus: BookingStatus
): TimelineEvent[] {
  const events: TimelineEvent[] = [
    {
      label: 'Created',
      timestamp: statusTimeline.created,
      status: 'completed',
      description: 'Booking request received',
    },
    {
      label: 'Confirmed',
      timestamp: statusTimeline.confirmed,
      status: statusTimeline.confirmed
        ? 'completed'
        : currentStatus === 'confirmed' || currentStatus === 'in_progress' || currentStatus === 'completed'
        ? 'current'
        : 'pending',
      description: 'Booking confirmed by provider',
    },
    {
      label: 'In progress',
      timestamp: null, // No specific timestamp for in_progress
      status: currentStatus === 'in_progress'
        ? 'current'
        : currentStatus === 'completed'
        ? 'completed'
        : 'pending',
      description: 'Event is currently happening',
    },
    {
      label: 'Completed',
      timestamp: statusTimeline.completed,
      status: statusTimeline.completed
        ? 'completed'
        : currentStatus === 'completed'
        ? 'current'
        : 'pending',
      description: 'Event successfully completed',
    },
  ];

  // Handle cancelled status
  if (statusTimeline.cancelled) {
    return [
      events[0], // Created
      {
        label: 'Cancelled',
        timestamp: statusTimeline.cancelled,
        status: 'completed',
        description: 'Booking was cancelled',
      },
    ];
  }

  return events;
}

/**
 * Calculate countdown to event
 */
export interface EventCountdown {
  isPast: boolean;
  isFuture: boolean;
  days: number;
  hours: number;
  minutes: number;
  label: string;
}

export function calculateEventCountdown(
  eventDate: string,
  eventTime?: string | null
): EventCountdown {
  const eventDateTime = eventTime
    ? new Date(`${eventDate}T${eventTime}`)
    : new Date(eventDate);

  const now = new Date();
  const isEventPast = isPast(eventDateTime);

  if (isEventPast) {
    const daysSince = Math.abs(differenceInDays(now, eventDateTime));
    return {
      isPast: true,
      isFuture: false,
      days: daysSince,
      hours: 0,
      minutes: 0,
      label: daysSince === 0 ? 'Today' : daysSince === 1 ? 'Yesterday' : `${daysSince} days ago`,
    };
  }

  const daysUntil = differenceInDays(eventDateTime, now);
  const hoursUntil = differenceInHours(eventDateTime, now) % 24;
  const minutesUntil = differenceInMinutes(eventDateTime, now) % 60;

  let label = '';
  if (daysUntil === 0) {
    label = hoursUntil === 0 ? `In ${minutesUntil} minutes` : `In ${hoursUntil} hours`;
  } else if (daysUntil === 1) {
    label = 'Tomorrow';
  } else {
    label = `In ${daysUntil} days`;
  }

  return {
    isPast: false,
    isFuture: true,
    days: daysUntil,
    hours: hoursUntil,
    minutes: minutesUntil,
    label,
  };
}

/**
 * Check if user can reassign booking
 */
export function canReassignBooking(
  capabilities: BookingDetailCapabilities,
  bookingStatus: BookingStatus
): boolean {
  // Can only reassign if user has assign capability and booking is not completed or cancelled
  return (
    capabilities.canAssign &&
    bookingStatus !== 'completed' &&
    bookingStatus !== 'cancelled'
  );
}

/**
 * Check if user can edit booking logistics
 */
export function canEditLogistics(
  capabilities: BookingDetailCapabilities,
  bookingStatus: BookingStatus
): boolean {
  // Can only edit if user has edit capability and booking is not completed or cancelled
  return (
    capabilities.canEdit &&
    bookingStatus !== 'completed' &&
    bookingStatus !== 'cancelled'
  );
}

/**
 * Check constraint violations
 */
export interface ConstraintViolation {
  type: 'advance_booking' | 'service_radius' | 'daily_capacity';
  severity: 'warning' | 'error';
  message: string;
}

export function checkConstraintViolations(
  eventDate: string,
  createdAt: string,
  constraints: ProviderConstraints
): ConstraintViolation[] {
  const violations: ConstraintViolation[] = [];

  // Check advance booking days
  if (constraints.advanceBookingDays) {
    const bookingDate = new Date(createdAt);
    const eventDateObj = new Date(eventDate);
    const daysInAdvance = differenceInDays(eventDateObj, bookingDate);

    if (daysInAdvance < constraints.advanceBookingDays) {
      violations.push({
        type: 'advance_booking',
        severity: 'warning',
        message: `Booking made with ${daysInAdvance} days notice. Minimum required: ${constraints.advanceBookingDays} days.`,
      });
    }
  }

  // Note: Service radius and daily capacity checks would require additional data
  // (venue location, other bookings on same day) which should be added in future phases

  return violations;
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) {
    return '—';
  }

  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Calculate estimated labor cost from shifts
 */
export function calculateLaborCost(
  estimatedHours: number,
  averageHourlyRate: number = 150
): number {
  return estimatedHours * averageHourlyRate;
}

/**
 * Get status badge variant
 */
export function getStatusBadgeVariant(
  status: BookingStatus
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'confirmed':
      return 'default';
    case 'in_progress':
      return 'secondary';
    case 'completed':
      return 'outline';
    case 'cancelled':
      return 'destructive';
    default:
      return 'outline';
  }
}

/**
 * Format status for display
 */
export function formatStatus(status: BookingStatus): string {
  return status.replace('_', ' ');
}

