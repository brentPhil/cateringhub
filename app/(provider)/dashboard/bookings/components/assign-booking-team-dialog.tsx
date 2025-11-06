"use client";

import { useEffect, useMemo } from "react";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2 } from "lucide-react";
import { useTeams } from "../../teams/hooks/use-teams";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { useAssignBookingTeam } from "../hooks/use-assign-booking-team";

const assignBookingTeamSchema = z.object({
  team_id: z.string().optional(),
});

type AssignBookingTeamForm = z.infer<typeof assignBookingTeamSchema>;

interface AssignBookingTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  providerId: string;
  bookingId: string;
  serviceLocationId?: string | null;
  initialTeamId?: string | null;
  eventDate?: string | null;
}

export function AssignBookingTeamDialog({
  open,
  onOpenChange,
  providerId,
  bookingId,
  serviceLocationId,
  initialTeamId,
  eventDate,
}: AssignBookingTeamDialogProps) {
  const { data: teams = [], isLoading } = useTeams(providerId, {
    status: "active",
    service_location_id: serviceLocationId || undefined,
  });

  const form = useForm<AssignBookingTeamForm>({
    resolver: zodResolver(assignBookingTeamSchema),
    defaultValues: {
      team_id: initialTeamId || "",
    },
  });

  // Sync default selected team when dialog opens or initialTeamId changes
  useEffect(() => {
    const next = initialTeamId || "";
    // Avoid setState during render; update within effect only
    form.setValue("team_id", next, { shouldDirty: false, shouldTouch: false });
  }, [initialTeamId, open]);

  const assignMutation = useAssignBookingTeam(providerId, bookingId);

  const teamOptions: ComboboxOption[] = useMemo(() => {
    const base: ComboboxOption[] = [{ value: "", label: "No team (unassigned)" }];
    teams.forEach((t) => {
      const capacityBits: string[] = [];
      if (t.daily_capacity) capacityBits.push(`${t.daily_capacity}/day`);
      if (t.max_concurrent_events) capacityBits.push(`${t.max_concurrent_events} concurrent`);
      const meta = capacityBits.length ? ` • ${capacityBits.join(" • ")}` : "";
      base.push({ value: t.id, label: `${t.name}${meta}` });
    });
    return base;
  }, [teams]);

  const onSubmit = async (values: AssignBookingTeamForm) => {
    await assignMutation.mutateAsync({ teamId: values.team_id || null });
    onOpenChange(false);
  };

  const isSubmitting = assignMutation.isPending;

  // Capacity info for selected team (if any)
  type CapacityInfo = {
    team_id: string;
    team_name: string;
    daily_capacity: number | null;
    max_concurrent_events: number | null;
    bookings_on_date: number;
    remaining_capacity: number | null;
  } | null;

  const selectedTeamId = form.watch("team_id") || initialTeamId || "";
  const { data: capacityInfo } = useQuery<CapacityInfo>({
    queryKey: [
      "booking-team-capacity",
      selectedTeamId,
      eventDate || null,
      open,
    ],
    queryFn: async () => {
      if (!selectedTeamId || !eventDate) return null;
      const supabase = createClient();
      const { data, error } = await supabase.rpc(
        "get_team_capacity_info",
        {
          p_team_id: selectedTeamId,
          p_event_date: eventDate,
        }
      );
      if (error) return null;
      const first = (data as unknown as CapacityInfo[] | null)?.[0] || null;
      return first;
    },
    enabled: !!selectedTeamId && !!eventDate && open,
    staleTime: 10_000,
  });

  const atCapacity = Boolean(
    selectedTeamId &&
    capacityInfo &&
    capacityInfo.remaining_capacity !== null &&
    capacityInfo.remaining_capacity <= 0
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Assign team</DialogTitle>
          <DialogDescription>
            Choose a team to handle this booking. Teams are filtered by the booking's service location.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="team_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Team</FormLabel>
                  <FormControl>
                    <Combobox
                      options={teamOptions}
                      value={field.value || ""}
                      onValueChange={field.onChange}
                      placeholder={
                        isLoading
                          ? "Loading teams..."
                          : serviceLocationId
                          ? "Select a team"
                          : "Select a service location first"
                      }
                      disabled={!serviceLocationId || isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedTeamId && capacityInfo && (
              capacityInfo.remaining_capacity !== null &&
              capacityInfo.daily_capacity !== null && (
                <Alert
                  variant={
                    capacityInfo.remaining_capacity <= 0 ? "destructive" : "default"
                  }
                >
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {capacityInfo.team_name}: {capacityInfo.bookings_on_date} / {capacityInfo.daily_capacity} events booked on {eventDate}.
                    {" "}
                    {capacityInfo.remaining_capacity <= 0 ? (
                      <Badge variant="destructive" className="ml-2">At capacity</Badge>
                    ) : (
                      <Badge variant="secondary" className="ml-2">{capacityInfo.remaining_capacity} remaining</Badge>
                    )}
                  </AlertDescription>
                </Alert>
              )
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || atCapacity}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? "Assigning..." : "Assign team"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
