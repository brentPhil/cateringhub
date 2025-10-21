"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTeamMembers } from "@/app/(provider)/dashboard/team/hooks/use-team-members";
import { useCreateShift } from "@/app/(provider)/dashboard/bookings/hooks/use-shifts";

const assignTeammateSchema = z.object({
  userId: z.string().min(1, "Please select a team member"),
  role: z.string().optional(),
  scheduledStart: z.string().optional(),
  scheduledEnd: z.string().optional(),
  notes: z.string().optional(),
});

type AssignTeammateFormData = z.infer<typeof assignTeammateSchema>;

interface AssignTeammateDialogProps {
  bookingId: string;
  providerId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function AssignTeammateDialog({
  bookingId,
  providerId,
  open,
  onOpenChange,
}: AssignTeammateDialogProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  const { data: teamMembers = [], isLoading: loadingMembers } =
    useTeamMembers(providerId);
  const createShiftMutation = useCreateShift(bookingId);

  const form = useForm<AssignTeammateFormData>({
    resolver: zodResolver(assignTeammateSchema),
    defaultValues: {
      userId: "",
      role: "",
      scheduledStart: "",
      scheduledEnd: "",
      notes: "",
    },
  });

  const onSubmit = async (data: AssignTeammateFormData) => {
    createShiftMutation.mutate(
      {
        userId: data.userId,
        role: data.role || undefined,
        scheduledStart: data.scheduledStart || undefined,
        scheduledEnd: data.scheduledEnd || undefined,
        notes: data.notes || undefined,
      },
      {
        onSuccess: () => {
          form.reset();
          setSelectedUserId("");
          onOpenChange(false);
        },
      }
    );
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      form.reset();
      setSelectedUserId("");
    }
    onOpenChange(newOpen);
  };

  // Filter out active members only
  const activeMembers = teamMembers.filter((m) => m.status === "active");

  const selectedMember = activeMembers.find((m) => m.user_id === selectedUserId);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Assign team member</DialogTitle>
          <DialogDescription>
            Assign a team member to this booking and set their shift details.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Team member selection */}
            <FormField
              control={form.control}
              name="userId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Team member</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      setSelectedUserId(value);
                    }}
                    value={field.value}
                    disabled={loadingMembers}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a team member" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {loadingMembers ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      ) : activeMembers.length === 0 ? (
                        <div className="py-4 text-center text-sm text-muted-foreground">
                          No active team members found
                        </div>
                      ) : (
                        activeMembers.map((member) => (
                          <SelectItem key={member.user_id} value={member.user_id}>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage
                                  src={member.avatar_url}
                                  alt={member.full_name}
                                />
                                <AvatarFallback className="text-xs">
                                  {getInitials(member.full_name)}
                                </AvatarFallback>
                              </Avatar>
                              <span>{member.full_name}</span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Select the team member to assign to this booking
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                Assign team member
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

