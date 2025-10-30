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
import { Button } from "@/components/ui/button";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Loader2 } from "lucide-react";
import { useAssignMemberToTeam } from "../../teams/hooks/use-teams";
import { useTeams } from "../../teams/hooks/use-teams";
import type { TeamMemberWithUser } from "../hooks/use-team-members";

const assignTeamSchema = z.object({
  team_id: z.string().optional(),
});

type AssignTeamFormData = z.infer<typeof assignTeamSchema>;

interface AssignTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: TeamMemberWithUser | null;
  providerId: string;
}

export function AssignTeamDialog({
  open,
  onOpenChange,
  member,
  providerId,
}: AssignTeamDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch active teams for the provider
  const { data: teams = [] } = useTeams(providerId, { status: "active" });

  const assignTeamMutation = useAssignMemberToTeam(providerId);

  const form = useForm<AssignTeamFormData>({
    resolver: zodResolver(assignTeamSchema),
    defaultValues: {
      team_id: member?.team_id || "",
    },
  });

  // Reset form when member changes
  useMemo(() => {
    if (member) {
      form.reset({
        team_id: member.team_id || "",
      });
    }
  }, [member, form]);

  const handleSubmit = async (data: AssignTeamFormData) => {
    if (!member) return;

    setIsSubmitting(true);
    try {
      await assignTeamMutation.mutateAsync({
        memberId: member.id,
        teamId: data.team_id || null,
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Error assigning team:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Team options for Combobox
  const teamOptions: ComboboxOption[] = useMemo(() => {
    const options: ComboboxOption[] = [
      { value: "", label: "No team (remove assignment)" },
    ];

    teams.forEach((team) => {
      options.push({ value: team.id, label: team.name });
    });

    return options;
  }, [teams]);

  if (!member) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Assign team</DialogTitle>
          <DialogDescription>
            Assign {member.full_name} to an operational team or remove their
            current team assignment.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Current team info */}
            {member.team && (
              <div className="rounded-md bg-muted p-3">
                <p className="text-sm text-muted-foreground">
                  Currently assigned to:{" "}
                  <span className="font-medium text-foreground">
                    {member.team.name}
                  </span>
                </p>
              </div>
            )}

            {/* Team selection */}
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
                      placeholder="Select a team"
                      className="w-full"
                    />
                  </FormControl>
                  <FormDescription>
                    Select a team to assign this member to, or choose "No team"
                    to remove their current assignment.
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
              <Button type="submit" disabled={isSubmitting}>
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

