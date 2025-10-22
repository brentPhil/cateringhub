"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { TablesInsert, TablesUpdate, Tables, Json } from "@/database.types";

export type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

/**
 * Create a new worker profile
 */
export async function createWorkerProfile(params: {
  providerId: string;
  name: string;
  phone?: string;
  role?: string;
  tags?: string[];
  certifications?: string[];
  hourlyRate?: number;
  availability?: Json;
  notes?: string;
  status?: "active" | "inactive";
}): Promise<ActionResult<Tables<"worker_profiles">>> {
  try {
    console.log("[createWorkerProfile] Starting with params:", params);

    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("[createWorkerProfile] Auth error:", authError);
      return {
        success: false,
        error: "You must be logged in to create worker profiles",
      };
    }

    // Verify user is a member of the provider
    const { data: membership, error: membershipError } = await supabase
      .from("provider_members")
      .select("id, role, status")
      .eq("provider_id", params.providerId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (membershipError || !membership) {
      console.error("[createWorkerProfile] Membership error:", membershipError);
      return {
        success: false,
        error: "You don't have access to this provider",
      };
    }

    // Create the worker profile
    const workerData: TablesInsert<"worker_profiles"> = {
      provider_id: params.providerId,
      name: params.name,
      phone: params.phone || null,
      role: params.role || null,
      tags: params.tags || [],
      certifications: params.certifications || [],
      hourly_rate: params.hourlyRate || null,
      availability: params.availability || null,
      notes: params.notes || null,
      status: params.status || "active",
    };

    console.log("[createWorkerProfile] Creating worker with data:", workerData);

    const { data: worker, error: insertError } = await supabase
      .from("worker_profiles")
      .insert(workerData)
      .select()
      .single<Tables<"worker_profiles">>();

    if (insertError) {
      console.error("[createWorkerProfile] Insert error:", insertError);
      return {
        success: false,
        error: "Failed to create worker profile. Please try again.",
      };
    }

    console.log("[createWorkerProfile] Worker created successfully:", worker);

    // Revalidate the workers page
    revalidatePath("/dashboard/workers");

    return {
      success: true,
      data: worker,
    };
  } catch (error) {
    console.error("[createWorkerProfile] Error:", error);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

/**
 * Update an existing worker profile
 */
export async function updateWorkerProfile(params: {
  workerId: string;
  name?: string;
  phone?: string;
  role?: string;
  tags?: string[];
  certifications?: string[];
  hourlyRate?: number;
  availability?: Json;
  notes?: string;
  status?: "active" | "inactive";
}): Promise<ActionResult<Tables<"worker_profiles">>> {
  try {
    console.log("[updateWorkerProfile] Starting with params:", params);

    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("[updateWorkerProfile] Auth error:", authError);
      return {
        success: false,
        error: "You must be logged in to update worker profiles",
      };
    }

    // Get the worker profile to verify access
    const { data: worker, error: workerError } = await supabase
      .from("worker_profiles")
      .select("id, provider_id")
      .eq("id", params.workerId)
      .single();

    if (workerError || !worker) {
      console.error("[updateWorkerProfile] Worker not found:", workerError);
      return {
        success: false,
        error: "Worker profile not found",
      };
    }

    // Verify user is a member of the provider
    const { data: membership, error: membershipError } = await supabase
      .from("provider_members")
      .select("id, role, status")
      .eq("provider_id", worker.provider_id)
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (membershipError || !membership) {
      console.error("[updateWorkerProfile] Membership error:", membershipError);
      return {
        success: false,
        error: "You don't have access to this worker profile",
      };
    }

    // Build update data (only include provided fields)
    const updateData: TablesUpdate<"worker_profiles"> = {};
    if (params.name !== undefined) updateData.name = params.name;
    if (params.phone !== undefined) updateData.phone = params.phone || null;
    if (params.role !== undefined) updateData.role = params.role || null;
    if (params.tags !== undefined) updateData.tags = params.tags;
    if (params.certifications !== undefined)
      updateData.certifications = params.certifications;
    if (params.hourlyRate !== undefined)
      updateData.hourly_rate = params.hourlyRate || null;
    if (params.availability !== undefined)
      updateData.availability = params.availability || null;
    if (params.notes !== undefined) updateData.notes = params.notes || null;
    if (params.status !== undefined) updateData.status = params.status;

    console.log("[updateWorkerProfile] Updating worker with data:", updateData);

    const { data: updatedWorker, error: updateError } = await supabase
      .from("worker_profiles")
      .update(updateData)
      .eq("id", params.workerId)
      .select()
      .single<Tables<"worker_profiles">>();

    if (updateError) {
      console.error("[updateWorkerProfile] Update error:", updateError);
      return {
        success: false,
        error: "Failed to update worker profile. Please try again.",
      };
    }

    console.log(
      "[updateWorkerProfile] Worker updated successfully:",
      updatedWorker
    );

    // Revalidate the workers page
    revalidatePath("/dashboard/workers");

    return {
      success: true,
      data: updatedWorker,
    };
  } catch (error) {
    console.error("[updateWorkerProfile] Error:", error);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

/**
 * Delete a worker profile
 */
export async function deleteWorkerProfile(
  workerId: string
): Promise<ActionResult<void>> {
  try {
    console.log("[deleteWorkerProfile] Starting with workerId:", workerId);

    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("[deleteWorkerProfile] Auth error:", authError);
      return {
        success: false,
        error: "You must be logged in to delete worker profiles",
      };
    }

    // Get the worker profile to verify access
    const { data: worker, error: workerError } = await supabase
      .from("worker_profiles")
      .select("id, provider_id, name")
      .eq("id", workerId)
      .single();

    if (workerError || !worker) {
      console.error("[deleteWorkerProfile] Worker not found:", workerError);
      return {
        success: false,
        error: "Worker profile not found",
      };
    }

    // Verify user is a member of the provider
    const { data: membership, error: membershipError } = await supabase
      .from("provider_members")
      .select("id, role, status")
      .eq("provider_id", worker.provider_id)
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (membershipError || !membership) {
      console.error("[deleteWorkerProfile] Membership error:", membershipError);
      return {
        success: false,
        error: "You don't have access to this worker profile",
      };
    }

    // Delete the worker profile
    const { error: deleteError } = await supabase
      .from("worker_profiles")
      .delete()
      .eq("id", workerId);

    if (deleteError) {
      console.error("[deleteWorkerProfile] Delete error:", deleteError);
      return {
        success: false,
        error: "Failed to delete worker profile. Please try again.",
      };
    }

    console.log("[deleteWorkerProfile] Worker deleted successfully");

    // Revalidate the workers page
    revalidatePath("/dashboard/workers");

    return {
      success: true,
    };
  } catch (error) {
    console.error("[deleteWorkerProfile] Error:", error);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

