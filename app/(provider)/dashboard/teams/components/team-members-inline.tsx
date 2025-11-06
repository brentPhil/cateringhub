"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import { Users2, UserPlus, X, Briefcase, Mail, Phone, Tag } from "lucide-react";
import { useTeamMembers, teamsKeys } from "../hooks/use-teams";
import { useAssignMemberToTeam } from "../hooks/use-teams";
import { useAssignWorkerToTeam, useWorkerProfiles } from "../../workers/hooks/use-worker-profiles";
import { useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface TeamMembersInlineProps {
  providerId: string;
  teamId: string;
  teamName: string;
  canManage: boolean;
}

export function TeamMembersInline({
  providerId,
  teamId,
  teamName,
  canManage,
}: TeamMembersInlineProps) {
  const { data, isLoading, error } = useTeamMembers(providerId, teamId);
  const queryClient = useQueryClient();
  const assignMemberMutation = useAssignMemberToTeam(providerId);
  const assignWorkerMutation = useAssignWorkerToTeam();

  const [addStaffOpen, setAddStaffOpen] = useState(false);
  const [addWorkerOpen, setAddWorkerOpen] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [selectedWorkerId, setSelectedWorkerId] = useState("");

  const handleRemove = async (
    member: { id: string; member_type: "staff" | "worker" }
  ) => {
    if (!canManage) return;
    if (
      !confirm(
        `Remove this ${member.member_type === "staff" ? "staff" : "worker"} from ${teamName}?`
      )
    )
      return;
    if (member.member_type === "staff") {
      await assignMemberMutation.mutateAsync({ memberId: member.id, teamId: null });
    } else {
      await assignWorkerMutation.mutateAsync({ workerId: member.id, teamId: null });
    }
  };

  // Fetch provider members for add staff
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
    enabled: canManage,
  });

  const staffOptions: ComboboxOption[] = useMemo(() => {
    const eligible = providerMembers.filter(
      (m) => m.status === "active" && (m.role === "staff" || m.role === "supervisor") && m.team_id !== teamId
    );
    return eligible.map((m) => ({ value: m.id, label: `${m.full_name} (${m.email})` }));
  }, [providerMembers, teamId]);

  // Fetch active workers via hook
  const { data: workers = [] } = useWorkerProfiles(providerId, { status: "active" });

  const workerOptions: ComboboxOption[] = useMemo(() => {
    const eligible = workers.filter((w) => w.status === "active" && w.team_id !== teamId);
    return eligible.map((w) => ({ value: w.id, label: w.name }));
  }, [workers, teamId]);

  // Members list used for columns and table data
  const members = data?.members || [];

  // Count active supervisors for constraint-aware UI
  const supervisorCount = useMemo(
    () => members.filter((m) => m.member_type === 'staff' && m.role === 'supervisor' && m.status === 'active').length,
    [members]
  );

  // Columns for inline table must be defined before any early returns
  type MemberRow = NonNullable<typeof data> extends { members: infer M } ? M extends Array<infer R> ? R : never : never;
  const columns: ColumnDef<MemberRow>[] = useMemo(() => {
    return [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span className="font-medium">{row.original.name}</span>
            <Badge variant={row.original.member_type === "staff" ? "default" : "secondary"}>
              {row.original.member_type}
            </Badge>
            <Badge variant={row.original.status === "active" ? "default" : "secondary"}>
              {row.original.status}
            </Badge>
          </div>
        ),
      },
      {
        accessorKey: "role",
        header: "Role",
        cell: ({ row }) => row.original.role || "—",
      },
      {
        accessorKey: "email",
        header: "Email / Phone",
        cell: ({ row }) => row.original.email || row.original.phone || "—",
      },
      {
        id: "tags",
        header: "Tags",
        cell: ({ row }) =>
          row.original.tags && row.original.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {row.original.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          canManage ? (
            (() => {
              const isOnlySupervisor =
                row.original.member_type === 'staff' &&
                row.original.role === 'supervisor' &&
                row.original.status === 'active' &&
                supervisorCount <= 1;
              return (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemove(row.original)}
                  disabled={isOnlySupervisor}
                  title={isOnlySupervisor ? 'Assign another supervisor before removing this one' : undefined}
                >
                  <X className="h-4 w-4" />
                </Button>
              );
            })()
          ) : null
        ),
        enableSorting: false,
        enableHiding: false,
      },
    ];
  }, [canManage, supervisorCount]);

  const onAddStaff = async () => {
    if (!selectedStaffId) return;
    await assignMemberMutation.mutateAsync({ memberId: selectedStaffId, teamId: teamId });
    queryClient.invalidateQueries({ queryKey: teamsKeys.members(providerId, teamId) });
    setSelectedStaffId("");
    setAddStaffOpen(false);
  };

  const onAddWorker = async () => {
    if (!selectedWorkerId) return;
    await assignWorkerMutation.mutateAsync({ workerId: selectedWorkerId, teamId: teamId });
    queryClient.invalidateQueries({ queryKey: teamsKeys.members(providerId, teamId) });
    setSelectedWorkerId("");
    setAddWorkerOpen(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-destructive">Failed to load team members</div>
    );
  }

  // members already defined above for columns and table

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{data?.counts.total || 0}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
          <Separator orientation="vertical" className="h-10" />
          <div className="text-center">
            <div className="text-2xl font-bold">{data?.counts.staff || 0}</div>
            <div className="text-xs text-muted-foreground">Staff</div>
          </div>
          <Separator orientation="vertical" className="h-10" />
          <div className="text-center">
            <div className="text-2xl font-bold">{data?.counts.workers || 0}</div>
            <div className="text-xs text-muted-foreground">Workers</div>
          </div>
        </div>

        {canManage && (
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => setAddStaffOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" /> Add staff
            </Button>
            <Button size="sm" variant="outline" onClick={() => setAddWorkerOpen(true)}>
              <Users2 className="mr-2 h-4 w-4" /> Add worker
            </Button>
          </div>
        )}
      </div>

      {/* Member list as DataTable */}
      <DataTable
        columns={columns}
        data={members}
        searchKey="name"
        searchPlaceholder="Filter members..."
        getRowId={(row) => row.id}
      />

      {/* Add staff dialog */}
      <Dialog open={addStaffOpen} onOpenChange={setAddStaffOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Add staff to {teamName}</DialogTitle>
            <DialogDescription>Select a staff member to assign to this team</DialogDescription>
          </DialogHeader>
          <Combobox
            options={staffOptions}
            value={selectedStaffId}
            onValueChange={setSelectedStaffId}
            placeholder="Select staff"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddStaffOpen(false)}>
              Cancel
            </Button>
            <Button onClick={onAddStaff} disabled={!selectedStaffId}>
              Add staff
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add worker dialog */}
      <Dialog open={addWorkerOpen} onOpenChange={setAddWorkerOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Add worker to {teamName}</DialogTitle>
            <DialogDescription>Select a worker to assign to this team</DialogDescription>
          </DialogHeader>
          <Combobox
            options={workerOptions}
            value={selectedWorkerId}
            onValueChange={setSelectedWorkerId}
            placeholder="Select worker"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddWorkerOpen(false)}>
              Cancel
            </Button>
            <Button onClick={onAddWorker} disabled={!selectedWorkerId}>
              Add worker
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
