/**
 * Booking Detail API
 * GET /api/providers/[providerId]/bookings/[bookingId] - Fetch single booking with enriched data
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentMembership } from '@/lib/api/membership';
import { handleAPIError, APIErrors } from '@/lib/api/errors';
import { validateUUID } from '@/lib/api/validation';
import { verifyProviderExists } from '@/lib/api/auth';

interface RouteContext {
  params: Promise<{ providerId: string; bookingId: string }>;
}

/**
 * GET /api/providers/[providerId]/bookings/[bookingId]
 * Fetch single booking with enriched metadata
 * 
 * Returns:
 * - Booking data
 * - Status timestamps (created_at, confirmed_at, completed_at, cancelled_at)
 * - Assigned team member info
 * - Shift aggregates (count, total hours)
 * - Provider constraints (advance_booking_days, service_radius, daily_capacity)
 * - Related bookings count (same customer)
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    // Get and validate IDs
    const { providerId, bookingId } = await context.params;
    validateUUID(providerId, 'Provider ID');
    validateUUID(bookingId, 'Booking ID');

    // Verify provider exists
    await verifyProviderExists(providerId);

    // Get current user's membership with capabilities
    const membership = await getCurrentMembership(providerId);

    const supabase = await createClient();

    // Fetch booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .eq('provider_id', providerId)
      .single();

    if (bookingError || !booking) {
      throw APIErrors.NOT_FOUND('Booking');
    }

    // Apply role-based access control
    // Staff can only see bookings assigned to them
    if (!membership.capabilities.canViewAllBookings) {
      if (booking.assigned_to !== membership.userId) {
        throw APIErrors.FORBIDDEN('You do not have permission to view this booking');
      }
    }

    // Fetch assigned team member info if assigned
    let assignedMember = null;
    if (booking.assigned_to) {
      const { data: memberData } = await supabase
        .from('provider_members')
        .select(`
          id,
          role,
          user_id,
          profiles:user_id (
            full_name,
            avatar_url
          )
        `)
        .eq('user_id', booking.assigned_to)
        .eq('provider_id', providerId)
        .eq('status', 'active')
        .single();

      if (memberData) {
        const profile = memberData.profiles as { full_name?: string; avatar_url?: string | null } | null;
        assignedMember = {
          id: memberData.id,
          userId: memberData.user_id,
          role: memberData.role,
          fullName: profile?.full_name || 'Unknown',
          avatarUrl: profile?.avatar_url || null,
        };
      }
    }

    // Fetch shift aggregates
    const { data: shifts } = await supabase
      .from('shifts')
      .select('id, scheduled_start, scheduled_end, actual_start, actual_end, status')
      .eq('booking_id', bookingId);

    const shiftAggregates = {
      totalShifts: shifts?.length || 0,
      scheduledShifts: shifts?.filter(s => s.status === 'scheduled').length || 0,
      checkedInShifts: shifts?.filter(s => s.status === 'checked_in').length || 0,
      completedShifts: shifts?.filter(s => s.status === 'checked_out').length || 0,
      estimatedHours: shifts?.reduce((acc, shift) => {
        if (shift.scheduled_start && shift.scheduled_end) {
          const start = new Date(shift.scheduled_start);
          const end = new Date(shift.scheduled_end);
          const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
          return acc + hours;
        }
        return acc;
      }, 0) || 0,
      actualHours: shifts?.reduce((acc, shift) => {
        if (shift.actual_start && shift.actual_end) {
          const start = new Date(shift.actual_start);
          const end = new Date(shift.actual_end);
          const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
          return acc + hours;
        }
        return acc;
      }, 0) || 0,
    };

    // Fetch provider constraints
    const { data: provider } = await supabase
      .from('providers')
      .select('advance_booking_days, service_radius, daily_capacity, available_days')
      .eq('id', providerId)
      .single();

    const providerConstraints = {
      advanceBookingDays: provider?.advance_booking_days || null,
      serviceRadius: provider?.service_radius || null,
      dailyCapacity: provider?.daily_capacity || null,
      availableDays: provider?.available_days || [],
    };

    // Count related bookings (same customer)
    let relatedBookingsCount = 0;
    if (booking.customer_id) {
      const { count } = await supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('provider_id', providerId)
        .eq('customer_id', booking.customer_id)
        .neq('id', bookingId);

      relatedBookingsCount = count || 0;
    }

    // Build status timeline
    const statusTimeline = {
      created: booking.created_at,
      confirmed: booking.confirmed_at,
      completed: booking.completed_at,
      cancelled: booking.cancelled_at,
      lastUpdated: booking.updated_at,
    };

    return NextResponse.json({
      success: true,
      data: {
        ...booking,
        assignedMember,
        shiftAggregates,
        providerConstraints,
        relatedBookingsCount,
        statusTimeline,
      },
      userRole: membership.role,
      capabilities: {
        canEdit: membership.capabilities.canEditAllBookings,
        canAssign: membership.capabilities.canAssignBookings,
        canManageBilling: membership.capabilities.canManageBilling,
      },
    });
  } catch (error) {
    return handleAPIError(error);
  }
}

