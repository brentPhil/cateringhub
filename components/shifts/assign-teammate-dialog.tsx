"use client";

import { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import {
  Loader2,
  Users,
  UserCog,
  AlertCircle,
  Building2,
  UsersRound,
  AlertTriangle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useTeamMembers } from "@/app/(provider)/dashboard/team/hooks/use-team-members";
import { useWorkerProfiles } from "@/app/(provider)/dashboard/workers/hooks/use-worker-profiles";
import {
  useCreateShift,
  useCreateBulkShifts,
} from "@/app/(provider)/dashboard/bookings/hooks/use-shifts";
import { useBookingDetail } from "@/app/(provider)/dashboard/bookings/hooks/use-booking-detail";

const assignTeammateSchema = z
  .object({
    userId: z.string().optional(),
    workerProfileId: z.string().optional(),
    role: z.string().optional(),
    scheduledStart: z.string().optional(),
    scheduledEnd: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine((data) => data.userId || data.workerProfileId, {
    message: "Please select a team member or worker",
    path: ["userId"],
  });

type AssignTeammateFormData = z.infer<typeof assignTeammateSchema>;

interface AssignTeammateDialogProps {
  bookingId: string;
  providerId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssignTeammateDialog({
  bookingId,
  providerId,
  open,
  onOpenChange,
}: AssignTeammateDialogProps) {
  const [assigneeType, setAssigneeType] = useState<"team_member" | "worker">(
    "team_member"
  );

  // Fetch booking details to get the assigned team
  const { data: bookingResponse, isLoading: loadingBooking } = useBookingDetail(
    providerId,
    bookingId
  );
  const booking = bookingResponse?.data;

  // Fetch team capacity info if team is assigned
  const { data: capacityInfo, isLoading: loadingCapacity } = useQuery({
    queryKey: ["team-capacity", booking?.team?.id, booking?.event_date],
    queryFn: async () => {
      if (!booking?.team?.id || !booking?.event_date) return null;

      const supabase = createClient();
      const { data, error } = await supabase.rpc("get_team_capacity_info", {
        p_team_id: booking.team.id,
        p_event_date: booking.event_date,
      });

      if (error) {
        console.error("[AssignTeammateDialog] Error fetching capacity:", error);
        return null;
      }

      return data?.[0] || null;
    },
    enabled: !!booking?.team?.id && !!booking?.event_date,
  });

  const { data: teamMembers = [], isLoading: loadingMembers } =
    useTeamMembers(providerId);
  const { data: workers = [], isLoading: loadingWorkers } = useWorkerProfiles(
    providerId,
    { status: "active" }
  );
  const createShiftMutation = useCreateShift(bookingId);
  const createBulkShiftsMutation = useCreateBulkShifts(bookingId);

  // Calculate smart defaults for shift times based on booking event date/time
  const smartDefaults = useMemo(() => {
    if (!booking?.event_date) return { scheduledStart: "", scheduledEnd: "" };

    const eventDate = booking.event_date; // Format: YYYY-MM-DD
    const eventTime = booking.event_time || "09:00:00"; // Format: HH:MM:SS

    // Combine date and time for start (1 hour before event)
    const eventDateTime = new Date(`${eventDate}T${eventTime}`);
    const startTime = new Date(eventDateTime.getTime() - 60 * 60 * 1000); // 1 hour before
    const endTime = new Date(eventDateTime.getTime() + 4 * 60 * 60 * 1000); // 4 hours after event

    // Format for datetime-local input: YYYY-MM-DDTHH:MM
    const formatForInput = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    return {
      scheduledStart: formatForInput(startTime),
      scheduledEnd: formatForInput(endTime),
    };
  }, [booking?.event_date, booking?.event_time]);

  const form = useForm<AssignTeammateFormData>({
    resolver: zodResolver(assignTeammateSchema),
    defaultValues: {
      userId: "",
      workerProfileId: "",
      role: "",
      scheduledStart: smartDefaults.scheduledStart,
      scheduledEnd: smartDefaults.scheduledEnd,
      notes: "",
    },
  });

  // Update form when smart defaults change (when booking loads)
  useEffect(() => {
    if (smartDefaults.scheduledStart && smartDefaults.scheduledEnd) {
      form.setValue("scheduledStart", smartDefaults.scheduledStart);
      form.setValue("scheduledEnd", smartDefaults.scheduledEnd);
    }
  }, [smartDefaults.scheduledStart, smartDefaults.scheduledEnd, form]);

  const onSubmit = async (data: AssignTeammateFormData) => {
    createShiftMutation.mutate(
      {
        userId: data.userId || undefined,
        workerProfileId: data.workerProfileId || undefined,
        role: data.role || undefined,
        scheduledStart: data.scheduledStart || undefined,
        scheduledEnd: data.scheduledEnd || undefined,
        notes: data.notes || undefined,
      },
      {
        onSuccess: () => {
          form.reset();
          onOpenChange(false);
        },
      }
    );
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      form.reset();
    }
    onOpenChange(newOpen);
  };

  const handleTabChange = (value: string) => {
    setAssigneeType(value as "team_member" | "worker");
    // Clear the other field when switching tabs
    if (value === "team_member") {
      form.setValue("workerProfileId", "");
    } else {
      form.setValue("userId", "");
    }
  };

  const handleBulkAssign = () => {
    if (!booking?.team?.id) return;

    const formData = form.getValues();

    createBulkShiftsMutation.mutate(
      {
        teamId: booking.team.id,
        role: formData.role || undefined,
        scheduledStart: formData.scheduledStart || undefined,
        scheduledEnd: formData.scheduledEnd || undefined,
        notes: formData.notes || undefined,
      },
      {
        onSuccess: () => {
          form.reset();
          onOpenChange(false);
        },
      }
    );
  };

  // Filter team members based on booking's assigned team
  const { eligibleMembers, showingAllMembers } = useMemo(() => {
    const activeMembers = teamMembers.filter((m) => m.status === "active");

    // If booking has a team assigned, filter to only show members of that team
    if (booking?.team?.id) {
      const filtered = activeMembers.filter(
        (m) => m.team_id === booking?.team?.id
      );
      return {
        eligibleMembers: filtered,
        showingAllMembers: false,
      };
    }

    // If no team assigned to booking, show all active members
    return {
      eligibleMembers: activeMembers,
      showingAllMembers: true,
    };
  }, [teamMembers, booking?.team?.id]);

  // Prepare Combobox options for team members
  const teamMemberOptions: ComboboxOption[] = eligibleMembers.map((member) => {
    // Show team badge if displaying all members
    const teamBadge =
      showingAllMembers && member.team?.name ? ` (${member.team.name})` : "";
    return {
      value: member.user_id,
      label: `${member.full_name}${teamBadge}`,
    };
  });

  // Prepare Combobox options for workers
  const workerOptions: ComboboxOption[] = workers.map((worker) => ({
    value: worker.id,
    label: worker.role ? `${worker.name} (${worker.role})` : worker.name,
  }));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Assign to shift</DialogTitle>
          <DialogDescription>
            Assign a team member or worker to this booking and set their shift
            details.
          </DialogDescription>
        </DialogHeader>

        {/* Team Context Display */}
        {loadingBooking ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading booking details...
          </div>
        ) : booking?.team ? (
          <div className="space-y-3">
            <Alert>
              <Building2 className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Assigned team:</span>
                  <Badge variant="secondary">{booking.team.name}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Showing only members from this team
                </p>
              </AlertDescription>
            </Alert>

            {/* Bulk assignment button */}
            {eligibleMembers.length > 0 && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleBulkAssign}
                disabled={createBulkShiftsMutation.isPending || loadingMembers}
              >
                {createBulkShiftsMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Assigning team...
                  </>
                ) : (
                  <>
                    <UsersRound className="mr-2 h-4 w-4" />
                    Assign entire team ({eligibleMembers.length} members)
                  </>
                )}
              </Button>
            )}

            {/* Capacity warning */}
            {!loadingCapacity && capacityInfo && (
              <Alert
                variant={
                  capacityInfo.remaining_capacity !== null &&
                  capacityInfo.remaining_capacity < 0
                    ? "destructive"
                    : "default"
                }
              >
                {capacityInfo.remaining_capacity !== null &&
                capacityInfo.remaining_capacity < 0 ? (
                  <AlertTriangle className="h-4 w-4" />
                ) : (
                  <Building2 className="h-4 w-4" />
                )}
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-medium">
                      {capacityInfo.daily_capacity !== null
                        ? `Team capacity: ${capacityInfo.bookings_on_date}/${capacityInfo.daily_capacity} bookings`
                        : "No capacity limit set"}
                    </p>
                    {capacityInfo.remaining_capacity !== null && (
                      <p className="text-xs text-muted-foreground">
                        {capacityInfo.remaining_capacity > 0
                          ? `${capacityInfo.remaining_capacity} slots remaining for this date`
                          : capacityInfo.remaining_capacity === 0
                            ? "Team is at full capacity for this date"
                            : `Team is over capacity by ${Math.abs(capacityInfo.remaining_capacity)} bookings`}
                      </p>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        ) : (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-medium">No team assigned to this booking</p>
              <p className="text-xs text-muted-foreground mt-1">
                Showing all active team members. Consider assigning a team to
                this booking first.
              </p>
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Assignee selection with tabs */}
            <Tabs value={assigneeType} onValueChange={handleTabChange}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="team_member">
                  <Users className="mr-2 h-4 w-4" />
                  Team members
                </TabsTrigger>
                <TabsTrigger value="worker">
                  <UserCog className="mr-2 h-4 w-4" />
                  Workers
                </TabsTrigger>
              </TabsList>

              <TabsContent value="team_member" className="mt-4">
                <FormField
                  control={form.control}
                  name="userId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Team member</FormLabel>
                      <Combobox
                        options={teamMemberOptions}
                        value={field.value || ""}
                        onValueChange={(value) => {
                          field.onChange(value);
                        }}
                        placeholder={
                          loadingMembers || loadingBooking
                            ? "Loading..."
                            : eligibleMembers.length === 0
                              ? booking?.team
                                ? "No members in this team"
                                : "No active team members found"
                              : "Select a team member"
                        }
                        disabled={loadingMembers || loadingBooking}
                        emptyMessage={
                          booking?.team
                            ? "No members found in this team"
                            : "No active team members found"
                        }
                      />
                      <FormDescription>
                        Select a team member with login access
                        {booking?.team && eligibleMembers.length > 0 && (
                          <span className="block text-xs mt-1">
                            {eligibleMembers.length} member
                            {eligibleMembers.length !== 1 ? "s" : ""} available
                            from {booking.team.name}
                          </span>
                        )}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="worker" className="mt-4">
                <FormField
                  control={form.control}
                  name="workerProfileId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Worker</FormLabel>
                      <Combobox
                        options={workerOptions}
                        value={field.value || ""}
                        onValueChange={(value) => {
                          field.onChange(value);
                        }}
                        placeholder={
                          loadingWorkers
                            ? "Loading..."
                            : workers.length === 0
                              ? "No active workers found"
                              : "Select a worker"
                        }
                        disabled={loadingWorkers}
                        emptyMessage="No active workers found"
                      />
                      <FormDescription>
                        Select a worker profile (no login access)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>

            {/* Role */}
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role (optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Server, Chef, Coordinator"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Specify the role or position for this shift
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Scheduled start time */}
            <FormField
              control={form.control}
              name="scheduledStart"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Scheduled start (optional)</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormDescription>
                    When should this team member start their shift?
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Scheduled end time */}
            <FormField
              control={form.control}
              name="scheduledEnd"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Scheduled end (optional)</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormDescription>
                    When should this team member end their shift?
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any special instructions or notes..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={createShiftMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createShiftMutation.isPending}>
                {createShiftMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Assign to shift
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
