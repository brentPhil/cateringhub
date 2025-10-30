"use client";

import { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { useUpdateTeam, type Team } from "../hooks/use-teams";
import { useProviderProfile } from "../../profile/hooks/use-provider-profile";

const editTeamSchema = z.object({
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
  status: z.enum(["active", "inactive", "archived"]),
});

type EditTeamFormData = z.infer<typeof editTeamSchema>;

interface EditTeamDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  providerId: string;
  team: Team;
}

export function EditTeamDrawer({
  open,
  onOpenChange,
  providerId,
  team,
}: EditTeamDrawerProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch service locations for the provider
  const { data: profileData } = useProviderProfile();
  const serviceLocations = profileData?.profile?.service_locations || [];

  const updateTeamMutation = useUpdateTeam(providerId, team.id);

  const form = useForm<EditTeamFormData>({
    resolver: zodResolver(editTeamSchema),
    defaultValues: {
      service_location_id: team.service_location_id || "",
      name: team.name,
      description: team.description || "",
      daily_capacity: (team.daily_capacity || "") as unknown as number,
      max_concurrent_events: (team.max_concurrent_events || "") as unknown as number,
      status: team.status as "active" | "inactive" | "archived",
    },
  });

  // Reset form when team changes
  useEffect(() => {
    form.reset({
      service_location_id: team.service_location_id || "",
      name: team.name,
      description: team.description || "",
      daily_capacity: (team.daily_capacity || "") as unknown as number,
      max_concurrent_events: (team.max_concurrent_events || "") as unknown as number,
      status: team.status as "active" | "inactive" | "archived",
    });
  }, [team, form]);

  const handleSubmit = async (data: EditTeamFormData) => {
    setIsSubmitting(true);
    try {
      await updateTeamMutation.mutateAsync({
        service_location_id: data.service_location_id,
        name: data.name,
        description: data.description || undefined,
        daily_capacity: data.daily_capacity || undefined,
        max_concurrent_events: data.max_concurrent_events || undefined,
        status: data.status,
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating team:", error);
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

  // Status options
  const statusOptions: ComboboxOption[] = [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
    { value: "archived", label: "Archived" },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit team</SheetTitle>
          <SheetDescription>
            Update team details, capacity settings, and status
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 mt-6">
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
                      emptyMessage="No locations found"
                    />
                  </FormControl>
                  <FormDescription>
                    The location where this team operates
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

            {/* Status */}
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <FormControl>
                    <Combobox
                      options={statusOptions}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder="Select status"
                    />
                  </FormControl>
                  <FormDescription>
                    Active teams can be assigned to bookings
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <SheetFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || updateTeamMutation.isPending}>
                {isSubmitting || updateTeamMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save changes"
                )}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

