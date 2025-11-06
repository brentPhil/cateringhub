"use client";

import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Loader2 } from "lucide-react";
import { useCreateTeam } from "../hooks/use-teams";
import { useProviderProfile } from "../../profile/hooks/use-provider-profile";
import { useQuery } from "@tanstack/react-query";

const createTeamSchema = z.object({
  service_location_id: z.string().min(1, "Service location is required"),
  name: z.string().min(1, "Team name is required").max(100, "Team name is too long"),
  description: z.string().max(500, "Description must be less than 500 characters").optional(),
  daily_capacity: z.coerce
    .number()
    .int()
    .positive("Daily capacity must be greater than zero")
    .optional()
    .or(z.literal("")),
  max_concurrent_events: z.coerce
    .number()
    .int()
    .positive("Max concurrent events must be greater than zero")
    .optional()
    .or(z.literal("")),
  supervisor_member_id: z.string().min(1, "Supervisor is required"),
});

type CreateTeamFormData = z.infer<typeof createTeamSchema>;

interface CreateTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  providerId: string;
}

export function CreateTeamDialog({
  open,
  onOpenChange,
  providerId,
}: CreateTeamDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch service locations for the provider
  const { data: profileData } = useProviderProfile();
  const serviceLocations = profileData?.profile?.service_locations || [];

  const createTeamMutation = useCreateTeam(providerId);

  const form = useForm<CreateTeamFormData>({
    resolver: zodResolver(createTeamSchema),
    defaultValues: {
      service_location_id: "",
      name: "",
      description: "",
      daily_capacity: "" as unknown as number,
      max_concurrent_events: "" as unknown as number,
      supervisor_member_id: "",
    },
  });

  const handleSubmit = async (data: CreateTeamFormData) => {
    setIsSubmitting(true);
    try {
      await createTeamMutation.mutateAsync({
        service_location_id: data.service_location_id,
        name: data.name,
        description: data.description || undefined,
        daily_capacity: data.daily_capacity || undefined,
        max_concurrent_events: data.max_concurrent_events || undefined,
        supervisor_member_id: data.supervisor_member_id,
      });
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating team:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Location options for Combobox
  const locationOptions: ComboboxOption[] = useMemo(() => {
    return serviceLocations.map((location) => {
      const parts = [
        location.barangay,
        location.city,
        location.province,
      ].filter(Boolean);
      const label = parts.join(", ") || "Unknown location";
      
      return {
        value: location.id,
        label: location.is_primary ? `${label} (Primary)` : label,
      };
    });
  }, [serviceLocations]);

  // Fetch provider members for supervisor selection
  const { data: members = [] } = useQuery({
    queryKey: ["provider-members", providerId],
    queryFn: async () => {
      const res = await fetch(`/api/providers/${providerId}/members`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || "Failed to fetch members");
      }
      const json = await res.json();
      return (json.data || []) as Array<{
        id: string;
        role: import("@/lib/roles").ProviderRole;
        status: "pending" | "active" | "suspended";
        full_name: string;
        email: string;
      }>;
    },
  });

  const supervisorOptions: ComboboxOption[] = useMemo(() => {
    return members
      .filter((m) => m.status === "active" && (m.role === "staff" || m.role === "supervisor"))
      .map((m) => ({ value: m.id, label: `${m.full_name} (${m.email})` }));
  }, [members]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create team</DialogTitle>
          <DialogDescription>
            Create a new operational team for a service location. Teams help organize staff and manage capacity.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Service Location */}
            <FormField
              control={form.control}
              name="service_location_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service location</FormLabel>
                  <FormControl>
                    <Combobox
                      options={locationOptions}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder="Select location"
                      emptyMessage="No locations found. Add a service location in your profile first."
                    />
                  </FormControl>
                  <FormDescription>
                    The location where this team will operate
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Supervisor */}
            <FormField
              control={form.control}
              name="supervisor_member_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Supervisor</FormLabel>
                  <FormControl>
                    <Combobox
                      options={supervisorOptions}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder="Select a supervisor"
                      emptyMessage="No eligible members found"
                    />
                  </FormControl>
                  <FormDescription>
                    Choose an active staff member to supervise this team
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Team Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Team name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., Main Team, Weekend Crew"
                    />
                  </FormControl>
                  <FormDescription>
                    A descriptive name for this team
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Brief description of the team's role or specialization"
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Daily Capacity */}
            <FormField
              control={form.control}
              name="daily_capacity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Daily capacity (optional)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      min="1"
                      placeholder="e.g., 5"
                    />
                  </FormControl>
                  <FormDescription>
                    Maximum events this team can handle per day
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Max Concurrent Events */}
            <FormField
              control={form.control}
              name="max_concurrent_events"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max concurrent events (optional)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      min="1"
                      placeholder="e.g., 2"
                    />
                  </FormControl>
                  <FormDescription>
                    Maximum events this team can handle at the same time
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || createTeamMutation.isPending}>
                {isSubmitting || createTeamMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create team"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
