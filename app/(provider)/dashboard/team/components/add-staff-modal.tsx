"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
} from "@/components/ui/field";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, UserPlus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  getRolePermissions,
  getRoleDescription,
  type ProviderRole,
} from "../lib/team-utils";

const addStaffSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  full_name: z.string().min(2, "Full name must be at least 2 characters"),
  role: z.enum(["admin", "manager", "staff", "viewer"], {
    required_error: "Please select a role",
  }),
});

type AddStaffFormData = z.infer<typeof addStaffSchema>;

interface AddStaffModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddStaff: (data: AddStaffFormData) => Promise<void>;
  isLoading?: boolean;
  isLimitReached?: boolean;
}

export function AddStaffModal({
  open,
  onOpenChange,
  onAddStaff,
  isLoading = false,
  isLimitReached = false,
}: AddStaffModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AddStaffFormData>({
    resolver: zodResolver(addStaffSchema),
    defaultValues: {
      email: "",
      full_name: "",
      role: "staff",
    },
  });

  const handleSubmit = async (data: AddStaffFormData) => {
    setIsSubmitting(true);
    try {
      await onAddStaff(data);
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error("Error adding staff:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Role options for Combobox
  const roleOptions: ComboboxOption[] = [
    { value: "admin", label: "Admin" },
    { value: "manager", label: "Manager" },
    { value: "staff", label: "Staff" },
    { value: "viewer", label: "Viewer" },
  ];

  const selectedRole = form.watch("role");
  const permissions = selectedRole
    ? getRolePermissions(selectedRole as ProviderRole)
    : [];
  const roleDescription = selectedRole
    ? getRoleDescription(selectedRole as ProviderRole)
    : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add staff manually</DialogTitle>
          <DialogDescription>
            Create a new team member account directly. They'll receive an email
            to set up their password.
          </DialogDescription>
        </DialogHeader>

        {isLimitReached && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You've reached your team member limit. Upgrade your plan to add
              more members.
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            {/* Email field */}
            <Controller
              control={form.control}
              name="email"
              render={({ field, fieldState }) => (
                <Field data-invalid={!!fieldState.error}>
                  <FieldLabel htmlFor="email">Email address</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    placeholder="colleague@example.com"
                    disabled={isSubmitting || isLoading || isLimitReached}
                    aria-invalid={!!fieldState.error}
                    {...field}
                  />
                  <FieldDescription>
                    The email address where the password setup link will be
                    sent.
                  </FieldDescription>
                  {fieldState.error && (
                    <FieldError>{fieldState.error.message}</FieldError>
                  )}
                </Field>
              )}
            />

            {/* Full name field */}
            <Controller
              control={form.control}
              name="full_name"
              render={({ field, fieldState }) => (
                <Field data-invalid={!!fieldState.error}>
                  <FieldLabel htmlFor="full_name">Full name</FieldLabel>
                  <Input
                    id="full_name"
                    type="text"
                    placeholder="John Doe"
                    disabled={isSubmitting || isLoading || isLimitReached}
                    aria-invalid={!!fieldState.error}
                    {...field}
                  />
                  <FieldDescription>
                    The full name of the team member.
                  </FieldDescription>
                  {fieldState.error && (
                    <FieldError>{fieldState.error.message}</FieldError>
                  )}
                </Field>
              )}
            />

            {/* Role field */}
            <Controller
              control={form.control}
              name="role"
              render={({ field, fieldState }) => (
                <Field data-invalid={!!fieldState.error}>
                  <FieldLabel htmlFor="role">Role</FieldLabel>
                  <Combobox
                    options={roleOptions}
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder="Select a role"
                    disabled={isSubmitting || isLoading || isLimitReached}
                  />
                  <FieldDescription>{roleDescription}</FieldDescription>
                  {fieldState.error && (
                    <FieldError>{fieldState.error.message}</FieldError>
                  )}
                </Field>
              )}
            />

            {/* Role permissions preview */}
            {selectedRole && permissions.length > 0 && (
              <div className="rounded-lg border p-4 bg-muted/50">
                <h4 className="text-sm font-medium mb-2">
                  Permissions for {selectedRole}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {permissions.map((permission) => (
                    <Badge
                      key={permission}
                      variant="secondary"
                      className="text-xs"
                    >
                      {permission}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting || isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || isLoading || isLimitReached}
              >
                {isSubmitting || isLoading ? (
                  <>
                    <span className="mr-2">Adding...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add staff member
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
