"use client";

import * as React from "react";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldError,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProfileFormState } from "../hooks/use-profile-form-state";

interface AboutBusinessSectionProps {
  formData: Pick<ProfileFormState, "tagline" | "description">;
  setFormState: (
    values: Partial<ProfileFormState>
  ) => Promise<URLSearchParams> | void;
  isLoading?: boolean;
  errors?: {
    tagline?: string;
    description?: string;
  };
}

export function AboutBusinessSection({
  formData,
  setFormState,
  isLoading,
  errors = {},
}: AboutBusinessSectionProps) {
  // Destructure for easier access
  const { tagline, description } = formData;

  if (isLoading) {
    return (
      <FieldSet>
        <FieldGroup>
          <div>
            <Skeleton className="h-5 w-56" />
            <Skeleton className="h-4 w-72 mt-1" />
          </div>
          <div className="mt-6 space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-9 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-28 w-full" />
            </div>
          </div>
        </FieldGroup>
      </FieldSet>
    );
  }

  // Character counters
  const taglineCount = tagline?.length || 0;
  const descriptionCount = description?.length || 0;

  return (
    <FieldSet>
      <FieldGroup>
        <div>
          <FieldLegend>About your business</FieldLegend>
          <FieldDescription>
            Tell customers about your catering services
          </FieldDescription>
        </div>

        <Field>
          <FieldLabel htmlFor="tagline">Tagline</FieldLabel>
          <Input
            id="tagline"
            value={tagline || ""}
            onChange={(e) => setFormState({ tagline: e.target.value })}
            placeholder="Enter a catchy tagline"
            maxLength={100}
            aria-invalid={!!errors.tagline}
          />
          <div className="flex items-center justify-between">
            {errors.tagline ? (
              <FieldError>{errors.tagline}</FieldError>
            ) : (
              <div />
            )}
            <span className="text-xs text-muted-foreground">
              {taglineCount}/100 characters
            </span>
          </div>
        </Field>

        <Field>
          <FieldLabel htmlFor="description">
            Full description <span className="text-destructive">*</span>
          </FieldLabel>
          <Textarea
            id="description"
            value={description || ""}
            onChange={(e) => setFormState({ description: e.target.value })}
            placeholder="Describe your business in detail"
            rows={6}
            maxLength={500}
            aria-invalid={!!errors.description}
            className="resize-none"
          />
          <div className="flex items-center justify-between">
            {errors.description ? (
              <FieldError>{errors.description}</FieldError>
            ) : (
              <div />
            )}
            <span className="text-xs text-muted-foreground">
              {descriptionCount}/500 characters
            </span>
          </div>
        </Field>
      </FieldGroup>
    </FieldSet>
  );
}
