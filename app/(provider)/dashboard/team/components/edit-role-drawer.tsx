"use client";

import { useState, useEffect } from "react";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Shield } from "lucide-react";
import {
  getAvailableRoles,
  formatRoleDisplay,
  getRoleDescription,
  getRolePermissions,
} from "../lib/team-utils";
import type { TeamMemberWithUser } from "../hooks/use-team-members";
import type { ProviderRole } from "../lib/team-utils";

const editRoleSchema = z.object({
  role: z.enum(["admin", "manager", "staff", "viewer"], {
    required_error: "Please select a role",
  }),
});

type EditRoleFormData = z.infer<typeof editRoleSchema>;

interface EditRoleDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: TeamMemberWithUser | null;
  onUpdateRole: (memberId: string, role: string) => Promise<void>;
  isLoading?: boolean;
}

export function EditRoleDrawer({
  open,
  onOpenChange,
  member,
  onUpdateRole,
  isLoading = false,
}: EditRoleDrawerProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<EditRoleFormData>({
    resolver: zodResolver(editRoleSchema),
    defaultValues: {
      role:
        member?.role === "owner"
          ? "admin"
          : (member?.role as Exclude<ProviderRole, "owner">) || "staff",
    },
  });

  // Reset form when member changes
  useEffect(() => {
    if (member) {
      form.reset({
        role:
          member.role === "owner"
            ? "admin"
            : (member.role as Exclude<ProviderRole, "owner">),
      });
    }
  }, [member, form]);

  const handleSubmit = async (data: EditRoleFormData) => {
    if (!member) return;

    setIsSubmitting(true);
    try {
      await onUpdateRole(member.id, data.role);
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating role:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Role options for Combobox
  const roleOptions: ComboboxOption[] = getAvailableRoles().map((role) => ({
    value: role,
    label: formatRoleDisplay(role),
  }));

  const selectedRole = form.watch("role");
  const permissions = selectedRole ? getRolePermissions(selectedRole) : [];

  if (!member) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[500px]">
        <SheetHeader>
          <SheetTitle>Edit member role</SheetTitle>
          <SheetDescription>
            Update {member.full_name}&apos;s role and permissions
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6 mt-6"
          >
            {/* Current member info */}
            <div className="rounded-lg border p-4 bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="flex flex-col">
                  <span className="font-medium">{member.full_name}</span>
                  <span className="text-sm text-muted-foreground">
                    {member.email}
                  </span>
                </div>
              </div>
            </div>

            {/* Role selector */}
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Combobox
                    options={roleOptions}
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder="Select a role"
                    disabled={isSubmitting || isLoading}
                  />
                  <FormDescription>
                    {selectedRole && getRoleDescription(selectedRole)}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Permissions summary */}
            {permissions.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Permissions</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {permissions.map((permission, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="text-xs font-normal"
                    >
                      {permission}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <SheetFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting || isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || isLoading}>
                {isSubmitting || isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update role"
                )}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
