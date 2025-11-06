/**
 * Assign Booking Team API
 * PATCH /api/providers/[providerId]/bookings/[bookingId]/team - Set or clear team assignment
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleAPIError, APIErrors } from '@/lib/api/errors';
import { validateUUID } from '@/lib/api/validation';
import { requireCapability, getCurrentMembership } from '@/lib/api/membership';
import { createClient } from '@/lib/supabase/server';

interface RouteContext {
  params: Promise<{ providerId: string; bookingId: string }>;
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { providerId, bookingId } = await context.params;
    validateUUID(providerId, 'Provider ID');
    validateUUID(bookingId, 'Booking ID');

    // Require ability to assign bookings (owner/admin; supervisors are team-scoped via RLS)
    await requireCapability(providerId, 'canAssignBookings');

    const supabase = await createClient();
    const body = await request.json();
    const teamId = body?.team_id ?? null;

    if (teamId !== null) {
      validateUUID(teamId, 'Team ID');
    }

    // Ensure caller is a member of the same provider as the booking
    const membership = await getCurrentMembership(providerId);

    // Fetch booking to get event_date for capacity check
    const { data: booking, error: bookErr } = await supabase
      .from('bookings')
      .select('id, provider_id, event_date')
      .eq('id', bookingId)
      .eq('provider_id', membership.providerId)
      .single();
    if (bookErr || !booking) {
      throw APIErrors.NOT_FOUND('Booking');
    }

    // Capacity check: if teamId set and event_date present
    if (teamId && booking.event_date) {
      const { data: capacityOk, error: capErr } = await supabase.rpc(
        'can_team_accept_booking',
        { p_team_id: teamId, p_event_date: booking.event_date }
      );
      if (capErr) {
        throw APIErrors.INTERNAL('Failed to validate team capacity');
      }
      if (capacityOk === false) {
        return NextResponse.json(
          { error: { message: 'Selected team is at capacity for the event date' } },
          { status: 400 }
        );
      }
    }

    // Update booking's team
    const { data, error } = await supabase
      .from('bookings')
      .update({ team_id: teamId })
      .eq('id', bookingId)
      .eq('provider_id', membership.providerId)
      .select('id, team_id')
      .single();

    if (error) {
      throw APIErrors.INTERNAL('Failed to assign team to booking');
    }

    // Auto-assign shifts for all active team members (supervisor + staff)
    if (teamId) {
      // Fetch active team members
      const { data: members, error: memErr } = await supabase
        .from('provider_members')
        .select('user_id, role, status')
        .eq('provider_id', membership.providerId)
        .eq('team_id', teamId)
        .eq('status', 'active');
      if (!memErr && members && members.length > 0) {
        // Fetch existing shifts for this booking
        const { data: existingShifts } = await supabase
          .from('shifts')
          .select('user_id')
          .eq('booking_id', bookingId);
        const existingUserIds = new Set((existingShifts || []).map((s) => s.user_id));

        // Create shifts for missing members
        for (const m of members) {
          if (!m.user_id || existingUserIds.has(m.user_id)) continue;
          await supabase.from('shifts').insert({
            booking_id: bookingId,
            user_id: m.user_id,
            role: m.role === 'supervisor' ? 'Supervisor' : 'Staff',
            status: 'scheduled',
          });
        }
      }
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleAPIError(error);
  }
}
