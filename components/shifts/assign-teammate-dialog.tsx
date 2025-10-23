"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Users, UserCog } from "lucide-react";
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
import { useTeamMembers } from "@/app/(provider)/dashboard/team/hooks/use-team-members";
import { useWorkerProfiles } from "@/app/(provider)/dashboard/workers/hooks/use-worker-profiles";
import { useCreateShift } from "@/app/(provider)/dashboard/bookings/hooks/use-shifts";

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

  const { data: teamMembers = [], isLoading: loadingMembers } =
    useTeamMembers(providerId);
  const { data: workers = [], isLoading: loadingWorkers } = useWorkerProfiles(
    providerId,
    { status: "active" }
  );
  const createShiftMutation = useCreateShift(bookingId);

  const form = useForm<AssignTeammateFormData>({
    resolver: zodResolver(assignTeammateSchema),
    defaultValues: {
      userId: "",
      workerProfileId: "",
      role: "",
      scheduledStart: "",
      scheduledEnd: "",
      notes: "",
    },
  });

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

  // Filter out active members only
  const activeMembers = teamMembers.filter((m) => m.status === "active");

  // Prepare Combobox options for team members
  const teamMemberOptions: ComboboxOption[] = activeMembers.map((member) => ({
    value: member.user_id,
    label: member.full_name,
  }));

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
                          loadingMembers
                            ? "Loading..."
                            : activeMembers.length === 0
                              ? "No active team members found"
                              : "Select a team member"
                        }
                        disabled={loadingMembers}
                        emptyMessage="No active team members found"
                      />
                      <FormDescription>
                        Select a team member with login access
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
