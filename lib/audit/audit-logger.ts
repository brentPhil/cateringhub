/**
 * Centralized Audit Logging Utility
 * 
 * Provides a consistent interface for logging all team management actions
 * to the audit_logs table for compliance and security monitoring.
 * 
 * Usage:
 * ```typescript
 * import { AuditLogger } from '@/lib/audit/audit-logger';
 * 
 * await AuditLogger.logMembershipChange({
 *   providerId: 'uuid',
 *   userId: 'uuid',
 *   actionType: 'member_invited',
 *   metadata: { email: 'user@example.com', role: 'staff' }
 * });
 * ```
 */

import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/supabase';

type AuditLogAction = Database['public']['Tables']['audit_logs']['Row']['action'];
type AuditLogResourceType = Database['public']['Tables']['audit_logs']['Row']['resource_type'];

/**
 * Base audit log entry structure
 */
export interface AuditLogEntry {
  providerId: string;
  userId: string;
  action: AuditLogAction;
  resourceType: AuditLogResourceType;
  resourceId?: string | null;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Membership change metadata
 */
export interface MembershipChangeMetadata {
  targetUserId?: string;
  email?: string;
  role?: string;
  oldRole?: string;
  newRole?: string;
  oldStatus?: string;
  newStatus?: string;
  reason?: string;
}

/**
 * Invitation metadata
 */
export interface InvitationMetadata {
  invitationId: string;
  email: string;
  role: string;
  expiresAt?: string;
  previousExpiration?: string;
  newExpiration?: string;
}

/**
 * Role change metadata
 */
export interface RoleChangeMetadata {
  targetUserId: string;
  targetMemberId: string;
  oldRole: string;
  newRole: string;
}

/**
 * Suspension metadata
 */
export interface SuspensionMetadata {
  targetUserId: string;
  targetMemberId: string;
  reason?: string;
  previousStatus: string;
  newStatus: string;
}

/**
 * Booking assignment metadata
 */
export interface AssignmentMetadata {
  bookingId: string;
  assignedToUserId: string;
  assignedToMemberId: string;
  previousAssignee?: string;
  eventDate?: string;
  customerName?: string;
}

/**
 * Profile update metadata
 */
export interface ProfileUpdateMetadata {
  fields: string[];
  changes?: Record<string, { old: unknown; new: unknown }>;
}

/**
 * Centralized audit logger class
 */
export class AuditLogger {
  /**
   * Log a generic audit entry
   */
  static async log(entry: AuditLogEntry): Promise<void> {
    try {
      const supabase = await createClient();
      
      const { error } = await supabase.from('audit_logs').insert({
        provider_id: entry.providerId,
        user_id: entry.userId,
        action: entry.action,
        resource_type: entry.resourceType,
        resource_id: entry.resourceId,
        details: entry.details,
        ip_address: entry.ipAddress,
        user_agent: entry.userAgent,
      });

      if (error) {
        console.error('[AUDIT LOG ERROR]', error);
        // Don't throw - audit logging should never break the main flow
      }
    } catch (error) {
      console.error('[AUDIT LOG EXCEPTION]', error);
      // Don't throw - audit logging should never break the main flow
    }
  }

  /**
   * Log membership changes (invite, accept, remove, etc.)
   */
  static async logMembershipChange(params: {
    providerId: string;
    userId: string;
    actionType: 'member_invited' | 'member_accepted' | 'member_removed' | 'member_suspended' | 'member_activated';
    metadata: MembershipChangeMetadata;
    resourceId?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await this.log({
      providerId: params.providerId,
      userId: params.userId,
      action: params.actionType,
      resourceType: 'member',
      resourceId: params.resourceId,
      details: params.metadata,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  }

  /**
   * Log invitation actions (sent, resent, accepted, rejected)
   */
  static async logInvitation(params: {
    providerId: string;
    userId: string;
    actionType: 'invitation_sent' | 'invitation_resent' | 'invitation_accepted' | 'invitation_rejected' | 'invitation_expired';
    metadata: InvitationMetadata;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await this.log({
      providerId: params.providerId,
      userId: params.userId,
      action: params.actionType,
      resourceType: 'invitation',
      resourceId: params.metadata.invitationId,
      details: params.metadata,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  }

  /**
   * Log role changes
   */
  static async logRoleChange(params: {
    providerId: string;
    userId: string;
    metadata: RoleChangeMetadata;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await this.log({
      providerId: params.providerId,
      userId: params.userId,
      action: 'role_changed',
      resourceType: 'member',
      resourceId: params.metadata.targetMemberId,
      details: params.metadata,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  }

  /**
   * Log suspension/reactivation
   */
  static async logSuspension(params: {
    providerId: string;
    userId: string;
    actionType: 'member_suspended' | 'member_activated';
    metadata: SuspensionMetadata;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await this.log({
      providerId: params.providerId,
      userId: params.userId,
      action: params.actionType,
      resourceType: 'member',
      resourceId: params.metadata.targetMemberId,
      details: params.metadata,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  }

  /**
   * Log booking assignments
   */
  static async logAssignment(params: {
    providerId: string;
    userId: string;
    actionType: 'booking_assigned' | 'booking_unassigned';
    metadata: AssignmentMetadata;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await this.log({
      providerId: params.providerId,
      userId: params.userId,
      action: params.actionType,
      resourceType: 'booking',
      resourceId: params.metadata.bookingId,
      details: params.metadata,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  }

  /**
   * Log profile updates
   */
  static async logProfileUpdate(params: {
    providerId: string;
    userId: string;
    metadata: ProfileUpdateMetadata;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await this.log({
      providerId: params.providerId,
      userId: params.userId,
      action: 'profile_updated',
      resourceType: 'provider',
      resourceId: params.providerId,
      details: params.metadata,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  }

  /**
   * Log gallery image actions
   */
  static async logGalleryAction(params: {
    providerId: string;
    userId: string;
    actionType: 'gallery_image_added' | 'gallery_image_removed' | 'gallery_image_reordered' | 'featured_image_updated';
    metadata: {
      imageId?: string;
      imageUrl?: string;
      displayOrder?: number;
      totalImages?: number;
    };
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await this.log({
      providerId: params.providerId,
      userId: params.userId,
      action: params.actionType,
      resourceType: 'gallery',
      resourceId: params.metadata.imageId,
      details: params.metadata,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  }

  /**
   * Log service location actions
   */
  static async logServiceLocationAction(params: {
    providerId: string;
    userId: string;
    actionType: 'service_location_added' | 'service_location_updated' | 'service_location_removed' | 'primary_location_changed';
    metadata: {
      locationId?: string;
      city?: string;
      province?: string;
      isPrimary?: boolean;
    };
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await this.log({
      providerId: params.providerId,
      userId: params.userId,
      action: params.actionType,
      resourceType: 'service_location',
      resourceId: params.metadata.locationId,
      details: params.metadata,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  }
}

