/**
 * Bookings API
 * GET /api/providers/[providerId]/bookings - Fetch bookings with role-based filtering
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentMembership } from '@/lib/api/membership';
import { handleAPIError, APIErrors } from '@/lib/api/errors';
import { validateUUID } from '@/lib/api/validation';
import { verifyProviderExists } from '@/lib/api/auth';

interface RouteContext {
  params: Promise<{ providerId: string }>;
}

/**
 * GET /api/providers/[providerId]/bookings
 * Fetch bookings with role-based filtering
 *
 * Query Parameters:
 * - search: Search by customer name, email, or event type
 * - status: Filter by booking status
 * - source: Filter by booking source (manual/auto)
 * - team: Filter by team ID or 'no-team'
 * - my_team: Filter to only bookings for current user's team (true/false)
 * - page: Page number (default: 1)
 * - page_size: Items per page (default: 10)
 * - sort_by: Field to sort by (default: event_date)
 * - sort_order: Sort order (asc/desc, default: asc)
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    // Get and validate provider ID
    const { providerId } = await context.params;
    validateUUID(providerId, 'Provider ID');

    // Verify provider exists
    await verifyProviderExists(providerId);

    // Get current user's membership with capabilities
    const membership = await getCurrentMembership(providerId);

    const supabase = await createClient();

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const source = searchParams.get('source') || '';
    const team = searchParams.get('team') || '';
    const myTeam = searchParams.get('my_team') === 'true';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('page_size') || '10', 10);
    const sortBy = searchParams.get('sort_by') || 'event_date';
    const sortOrder = (searchParams.get('sort_order') || 'asc') as 'asc' | 'desc';

    // Build base query with team information
    let query = supabase
      .from('bookings')
      .select(`
        *,
        team:teams(
          id,
          name,
          status
        )
      `, { count: 'exact' })
      .eq('provider_id', providerId);

    // Apply role-based filtering
    // Staff: See only bookings for their team
    // Manager/Admin/Owner: See all bookings
    // Viewer: See all bookings (read-only enforced in UI)
    if (!membership.capabilities.canViewAllBookings) {
      // Staff role - only see team bookings
      if (membership.teamId) {
        query = query.eq('team_id', membership.teamId);
      }
      // Note: Staff not assigned to a team will see no bookings
      // This encourages proper team assignment for all staff members
    }

    // Apply "my team" filter if requested (works for all roles)
    if (myTeam && membership.teamId) {
      query = query.eq('team_id', membership.teamId);
    }

    // Apply search filter
    if (search) {
      query = query.or(
        `customer_name.ilike.%${search}%,customer_email.ilike.%${search}%,event_type.ilike.%${search}%`
      );
    }

    // Apply status filter
    if (status) {
      query = query.eq('status', status);
    }

    // Apply source filter
    if (source) {
      query = query.eq('source', source);
    }

    // Apply team filter
    if (team) {
      if (team === 'no-team') {
        query = query.is('team_id', null);
      } else {
        query = query.eq('team_id', team);
      }
    }

    // Apply sorting
    const validSortFields = [
      'event_date',
      'created_at',
      'customer_name',
      'status',
      'guest_count',
    ];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'event_date';
    query = query.order(sortField, { ascending: sortOrder === 'asc' });

    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    // Execute query
    const { data: bookings, error: bookingsError, count } = await query;

    if (bookingsError) {
      throw APIErrors.INTERNAL('Failed to fetch bookings');
    }

    // Calculate pagination metadata
    const totalPages = count ? Math.ceil(count / pageSize) : 0;

    return NextResponse.json({
      success: true,
      data: bookings || [],
      pagination: {
        page,
        pageSize,
        totalItems: count || 0,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      filters: {
        search,
        status,
        source,
        myTeam,
        sortBy: sortField,
        sortOrder,
      },
      userRole: membership.role,
      canEditBookings: membership.capabilities.canEditAllBookings,
    });
  } catch (error) {
    return handleAPIError(error);
  }
}

