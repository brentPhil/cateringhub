"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldGroup,
} from "@/components/ui/field";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";

// Schema for worker profile form
const baseWorkerSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  phone: z.string().optional(),
  role: z.string().optional(),
  tags: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  hourlyRate: z.coerce.number().positive().optional(),
  notes: z
    .string()
    .max(1000, "Notes must be less than 1000 characters")
    .optional(),
  status: z.enum(["active", "inactive"]),
});

export const workerSchema = baseWorkerSchema;

export type WorkerFormData = z.infer<typeof baseWorkerSchema>;

interface WorkerProfileFormProps {
  mode: "create" | "edit";
  defaultValues?: Partial<WorkerFormData>;
  onSubmit: (data: WorkerFormData) => Promise<void>;
  isLoading?: boolean;
}

// Status options for combobox
const statusOptions: ComboboxOption[] = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export function WorkerProfileForm({
  mode,
  defaultValues,
  onSubmit,
  isLoading = false,
}: WorkerProfileFormProps) {
  const [tagInput, setTagInput] = useState("");
  const [certInput, setCertInput] = useState("");

  const form = useForm<WorkerFormData>({
    resolver: zodResolver(workerSchema),
    defaultValues: defaultValues || {
      name: "",
      phone: "",
      role: "",
      tags: [],
      certifications: [],
      hourlyRate: undefined,
      notes: "",
      status: "active" as const,
    },
  });

  const isSubmitting = form.formState.isSubmitting;

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (!trimmed) return;

    const currentTags = form.getValues("tags") || [];
    if (!currentTags.includes(trimmed)) {
      form.setValue("tags", [...currentTags, trimmed]);
    }
    setTagInput("");
  };

  const handleRemoveTag = (tag: string) => {
    const currentTags = form.getValues("tags") || [];
    form.setValue(
      "tags",
      currentTags.filter((t) => t !== tag)
    );
  };

  const handleAddCert = () => {
    const trimmed = certInput.trim();
    if (!trimmed) return;

    const currentCerts = form.getValues("certifications") || [];
    if (!currentCerts.includes(trimmed)) {
      form.setValue("certifications", [...currentCerts, trimmed]);
    }
    setCertInput("");
  };

  const handleRemoveCert = (cert: string) => {
    const currentCerts = form.getValues("certifications") || [];
    form.setValue(
      "certifications",
      currentCerts.filter((c) => c !== cert)
    );
  };

  return (
    <form
      id="worker-profile-form"
      onSubmit={form.handleSubmit(onSubmit)}
      className="space-y-4"
    >
      <FieldGroup>
        {/* Name field */}
        <Controller
          control={form.control}
          name="name"
          render={({ field, fieldState }) => (
            <Field data-invalid={!!fieldState.error}>
              <FieldLabel htmlFor="name">
                Name <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="name"
                placeholder="John Doe"
                {...field}
                disabled={isSubmitting || isLoading}
                aria-invalid={!!fieldState.error}
              />
              {fieldState.error && (
                <FieldError>{fieldState.error.message}</FieldError>
              )}
            </Field>
          )}
        />

        {/* Phone field */}
        <Controller
          control={form.control}
          name="phone"
          render={({ field, fieldState }) => (
            <Field data-invalid={!!fieldState.error}>
              <FieldLabel htmlFor="phone">Phone</FieldLabel>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                {...field}
                disabled={isSubmitting || isLoading}
                aria-invalid={!!fieldState.error}
              />
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
              <Input
                id="role"
                placeholder="e.g., Server, Chef, Bartender"
                {...field}
                disabled={isSubmitting || isLoading}
                aria-invalid={!!fieldState.error}
              />
              <FieldDescription>
                The worker&apos;s job title or position
              </FieldDescription>
              {fieldState.error && (
                <FieldError>{fieldState.error.message}</FieldError>
              )}
            </Field>
          )}
        />

        {/* Hourly rate field */}
        <Controller
          control={form.control}
          name="hourlyRate"
          render={({ field, fieldState }) => (
            <Field data-invalid={!!fieldState.error}>
              <FieldLabel htmlFor="hourlyRate">Hourly rate</FieldLabel>
              <Input
                id="hourlyRate"
                type="number"
                step="0.01"
                placeholder="25.00"
                {...field}
                value={field.value || ""}
                disabled={isSubmitting || isLoading}
                aria-invalid={!!fieldState.error}
              />
              <FieldDescription>
                Optional hourly rate for payroll calculations
              </FieldDescription>
              {fieldState.error && (
                <FieldError>{fieldState.error.message}</FieldError>
              )}
            </Field>
          )}
        />

        {/* Tags field */}
        <Controller
          control={form.control}
          name="tags"
          render={({ field, fieldState }) => (
            <Field data-invalid={!!fieldState.error}>
              <FieldLabel htmlFor="tags">Tags</FieldLabel>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    id="tags"
                    placeholder="Add a tag..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    disabled={isSubmitting || isLoading}
                  />
                  <Button
                    type="button"
                    onClick={handleAddTag}
                    disabled={!tagInput.trim() || isSubmitting || isLoading}
                    size="sm"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {field.value && field.value.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {field.value.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-1 hover:text-destructive"
                          disabled={isSubmitting || isLoading}
                          aria-label={`Remove ${tag} tag`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <FieldDescription>
                Add tags to categorize and filter workers
              </FieldDescription>
              {fieldState.error && (
                <FieldError>{fieldState.error.message}</FieldError>
              )}
            </Field>
          )}
        />

        {/* Certifications field */}
        <Controller
          control={form.control}
          name="certifications"
          render={({ field, fieldState }) => (
            <Field data-invalid={!!fieldState.error}>
              <FieldLabel htmlFor="certifications">Certifications</FieldLabel>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    id="certifications"
                    placeholder="Add a certification..."
                    value={certInput}
                    onChange={(e) => setCertInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCert();
                      }
                    }}
                    disabled={isSubmitting || isLoading}
                  />
                  <Button
                    type="button"
                    onClick={handleAddCert}
                    disabled={!certInput.trim() || isSubmitting || isLoading}
                    size="sm"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {field.value && field.value.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {field.value.map((cert) => (
                      <Badge key={cert} variant="secondary">
                        {cert}
                        <button
                          type="button"
                          onClick={() => handleRemoveCert(cert)}
                          className="ml-1 hover:text-destructive"
                          disabled={isSubmitting || isLoading}
                          aria-label={`Remove ${cert} certification`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <FieldDescription>
                Add certifications or qualifications
              </FieldDescription>
              {fieldState.error && (
                <FieldError>{fieldState.error.message}</FieldError>
              )}
            </Field>
          )}
        />

        {/* Status field - only show in edit mode */}
        {mode === "edit" && (
          <Controller
            control={form.control}
            name="status"
            render={({ field, fieldState }) => (
              <Field data-invalid={!!fieldState.error}>
                <FieldLabel htmlFor="status">Status</FieldLabel>
                <Combobox
                  options={statusOptions}
                  value={field.value}
                  onValueChange={field.onChange}
                  placeholder="Select status"
                  disabled={isSubmitting || isLoading}
                />
                <FieldDescription>
                  Inactive workers won&apos;t appear in shift assignment
                </FieldDescription>
                {fieldState.error && (
                  <FieldError>{fieldState.error.message}</FieldError>
                )}
              </Field>
            )}
          />
        )}

        {/* Notes field */}
        <Controller
          control={form.control}
          name="notes"
          render={({ field, fieldState }) => (
            <Field data-invalid={!!fieldState.error}>
              <FieldLabel htmlFor="notes">Notes</FieldLabel>
              <Textarea
                id="notes"
                placeholder="Additional notes about this worker..."
                {...field}
                disabled={isSubmitting || isLoading}
                rows={3}
                aria-invalid={!!fieldState.error}
              />
              <FieldDescription>
                Optional notes or additional information
              </FieldDescription>
              {fieldState.error && (
                <FieldError>{fieldState.error.message}</FieldError>
              )}
            </Field>
          )}
        />
      </FieldGroup>
    </form>
  );
}
