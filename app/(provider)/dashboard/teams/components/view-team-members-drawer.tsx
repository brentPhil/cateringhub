"use client";

import { useMemo, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  AlertCircle,
  Users2,
  UserCircle,
  Briefcase,
  Mail,
  Phone,
  DollarSign,
  Tag,
  X,
  UserPlus,
} from "lucide-react";
import { useTeamMembers, type TeamMember, teamsKeys } from "../hooks/use-teams";
import { useAssignMemberToTeam } from "../hooks/use-teams";
import { useAssignWorkerToTeam, useWorkerProfiles } from "../../workers/hooks/use-worker-profiles";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface ViewTeamMembersDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string | null;
  teamName: string | null;
  providerId: string;
}

export function ViewTeamMembersDrawer({
  open,
  onOpenChange,
  teamId,
  teamName,
  providerId,
}: ViewTeamMembersDrawerProps) {
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [addStaffOpen, setAddStaffOpen] = useState(false);
  const [addWorkerOpen, setAddWorkerOpen] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [selectedWorkerId, setSelectedWorkerId] = useState("");
  const queryClient = useQueryClient();

  // Fetch team members
  const {
    data: teamMembersData,
    isLoading,
    error,
  } = useTeamMembers(providerId, teamId || undefined);

  const assignMemberMutation = useAssignMemberToTeam(providerId);
  const assignWorkerMutation = useAssignWorkerToTeam();

  const handleRemoveMember = async (member: TeamMember) => {
    if (
      !confirm(
        `Are you sure you want to remove ${member.name} from this team?`
      )
    ) {
      return;
    }

    setRemovingMemberId(member.id);
    try {
      if (member.member_type === "staff") {
        await assignMemberMutation.mutateAsync({
          memberId: member.id,
          teamId: null,
        });
      } else {
        await assignWorkerMutation.mutateAsync({
          workerId: member.id,
          teamId: null,
        });
      }
      toast.success(`${member.name} removed from team successfully`);
    } catch (error) {
      console.error("Error removing member:", error);
      const message = error instanceof Error ? error.message : "Failed to remove member";
      toast.error(message);
    } finally {
      setRemovingMemberId(null);
    }
  };

  const renderMemberCard = (member: TeamMember) => {
    const isRemoving = removingMemberId === member.id;

    return (
      <div
        key={member.id}
        className="flex items-start justify-between gap-4 rounded-lg border p-4"
      >
        <div className="flex-1 space-y-2">
          {/* Name and type */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              {member.member_type === "staff" ? (
                <UserCircle className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Briefcase className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="font-medium">{member.name}</span>
            </div>
            <Badge variant={member.member_type === "staff" ? "default" : "secondary"}>
              {member.member_type}
            </Badge>
            <Badge variant={member.status === "active" ? "default" : "secondary"}>
              {member.status}
            </Badge>
          </div>

          {/* Role */}
          {member.role && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Briefcase className="h-3 w-3" />
              <span>{member.role}</span>
            </div>
          )}

          {/* Email (staff only) */}
          {member.email && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-3 w-3" />
              <span>{member.email}</span>
            </div>
          )}

          {/* Phone (workers only) */}
          {member.phone && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-3 w-3" />
              <span>{member.phone}</span>
            </div>
          )}

          {/* Hourly rate (workers only) */}
          {member.hourly_rate && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="h-3 w-3" />
              <span>₱{member.hourly_rate.toFixed(2)}/hr</span>
            </div>
          )}

          {/* Tags (workers only) */}
          {member.tags && member.tags.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <Tag className="h-3 w-3 text-muted-foreground" />
              <div className="flex flex-wrap gap-1">
                {member.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Remove button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleRemoveMember(member)}
          disabled={isRemoving}
          className="text-destructive hover:text-destructive"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Users2 className="h-5 w-5" />
            Team members
          </SheetTitle>
          <SheetDescription>
            {teamName ? `Members of ${teamName}` : "View and manage team members"}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Actions: Add staff/worker */}
          {teamId && (
            <div className="flex items-center gap-2 justify-end">
              <Button size="sm" onClick={() => setAddStaffOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" /> Add staff
              </Button>
              <Button size="sm" variant="outline" onClick={() => setAddWorkerOpen(true)}>
                <Users2 className="mr-2 h-4 w-4" /> Add worker
              </Button>
            </div>
          )}
          {/* Loading state */}
          {isLoading && (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <AlertCircle className="h-12 w-12 text-muted-foreground" />
              <div className="text-center">
                <h3 className="font-semibold">Failed to load team members</h3>
                <p className="text-sm text-muted-foreground">
                  {error instanceof Error ? error.message : "An error occurred"}
                </p>
              </div>
            </div>
          )}

          {/* Members list */}
          {!isLoading && !error && teamMembersData && (
            <>
              {/* Summary */}
              <div className="flex items-center justify-between rounded-lg bg-muted p-4">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {teamMembersData.counts.total}
                    </div>
                    <div className="text-xs text-muted-foreground">Total</div>
                  </div>
                  <Separator orientation="vertical" className="h-10" />
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {teamMembersData.counts.staff}
                    </div>
                    <div className="text-xs text-muted-foreground">Staff</div>
                  </div>
                  <Separator orientation="vertical" className="h-10" />
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {teamMembersData.counts.workers}
                    </div>
                    <div className="text-xs text-muted-foreground">Workers</div>
                  </div>
                </div>
              </div>

              {/* Members list */}
              {teamMembersData.members.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <Users2 className="h-12 w-12 text-muted-foreground" />
                  <div className="text-center">
                    <h3 className="font-semibold">No members assigned</h3>
                    <p className="text-sm text-muted-foreground">
                      This team doesn't have any members yet. Assign staff or
                      workers to this team to get started.
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Assign members
                  </Button>
                </div>
              ) : (
                <ScrollArea className="h-[calc(100vh-300px)]">
                  <div className="space-y-3">
                    {teamMembersData.members.map((member) =>
                      renderMemberCard(member)
                    )}
                  </div>
                </ScrollArea>
              )}
            </>
          )}
        </div>

        {/* Add staff dialog */}
        {teamId && (
          <AddStaffDialog
            open={addStaffOpen}
            onOpenChange={setAddStaffOpen}
            providerId={providerId}
            teamId={teamId}
            onAssigned={() => {
              queryClient.invalidateQueries({ queryKey: teamsKeys.members(providerId, teamId) });
              setSelectedStaffId("");
            }}
            selectedStaffId={selectedStaffId}
            onSelectedStaffId={setSelectedStaffId}
          />
        )}

        {/* Add worker dialog */}
        {teamId && (
          <AddWorkerDialog
            open={addWorkerOpen}
            onOpenChange={setAddWorkerOpen}
            providerId={providerId}
            teamId={teamId}
            onAssigned={() => {
              queryClient.invalidateQueries({ queryKey: teamsKeys.members(providerId, teamId) });
              setSelectedWorkerId("");
            }}
            selectedWorkerId={selectedWorkerId}
            onSelectedWorkerId={setSelectedWorkerId}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

// Inline dialogs
function AddStaffDialog({
  open,
  onOpenChange,
  providerId,
  teamId,
  onAssigned,
  selectedStaffId,
  onSelectedStaffId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  providerId: string;
  teamId: string;
  onAssigned: () => void;
  selectedStaffId: string;
  onSelectedStaffId: (val: string) => void;
}) {
  const assignMemberMutation = useAssignMemberToTeam(providerId);
  const { data: providerMembers = [] } = useQuery({
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
        team_id?: string | null;
        full_name: string;
        email: string;
      }>;
    },
  });

  const staffOptions: ComboboxOption[] = useMemo(() => {
    const eligible = providerMembers.filter(
      (m) => m.status === "active" && (m.role === "staff" || m.role === "supervisor") && m.team_id !== teamId
    );
    return eligible.map((m) => ({ value: m.id, label: `${m.full_name} (${m.email})` }));
  }, [providerMembers, teamId]);

  const onAdd = async () => {
    if (!selectedStaffId) return;
    await assignMemberMutation.mutateAsync({ memberId: selectedStaffId, teamId });
    onAssigned();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Add staff</DialogTitle>
          <DialogDescription>Assign a staff member to this team</DialogDescription>
        </DialogHeader>
        <Combobox
          options={staffOptions}
          value={selectedStaffId}
          onValueChange={onSelectedStaffId}
          placeholder="Select staff"
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onAdd} disabled={!selectedStaffId}>Add staff</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddWorkerDialog({
  open,
  onOpenChange,
  providerId,
  teamId,
  onAssigned,
  selectedWorkerId,
  onSelectedWorkerId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  providerId: string;
  teamId: string;
  onAssigned: () => void;
  selectedWorkerId: string;
  onSelectedWorkerId: (val: string) => void;
}) {
  const assignWorkerMutation = useAssignWorkerToTeam();
  const { data: workers = [] } = useWorkerProfiles(providerId, { status: "active" });

  const workerOptions: ComboboxOption[] = useMemo(() => {
    const eligible = workers.filter((w) => w.team_id !== teamId);
    return eligible.map((w) => ({ value: w.id, label: w.name }));
  }, [workers, teamId]);

  const onAdd = async () => {
    if (!selectedWorkerId) return;
    await assignWorkerMutation.mutateAsync({ workerId: selectedWorkerId, teamId });
    onAssigned();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Add worker</DialogTitle>
          <DialogDescription>Assign a worker to this team</DialogDescription>
        </DialogHeader>
        <Combobox
          options={workerOptions}
          value={selectedWorkerId}
          onValueChange={onSelectedWorkerId}
          placeholder="Select worker"
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onAdd} disabled={!selectedWorkerId}>Add worker</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
