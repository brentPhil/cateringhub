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
import { PhoneInput } from "@/components/ui/phone-input";

import { Skeleton } from "@/components/ui/skeleton";
import type { ProfileFormState } from "../hooks/use-profile-form-state";

interface BasicInformationSectionProps {
  formData: Pick<
    ProfileFormState,
    "businessName" | "contactPersonName" | "mobileNumber" | "email"
  >;
  setFormState: (
    values: Partial<ProfileFormState>
  ) => Promise<URLSearchParams> | void;
  isLoading?: boolean;
  errors?: {
    businessName?: string;
    contactPersonName?: string;
    mobileNumber?: string;
    email?: string;
  };
}

export function ProfileForm({
  formData,
  setFormState,
  isLoading,
  errors = {},
}: BasicInformationSectionProps) {
  const { businessName, contactPersonName, mobileNumber, email } = formData;

  if (isLoading) {
    return (
      <FieldSet>
        <FieldGroup>
          <div>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-64 mt-1" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))}
          </div>
        </FieldGroup>
      </FieldSet>
    );
  }

  return (
    <FieldSet>
      <FieldGroup>
        <div>
          <FieldLegend>Basic information</FieldLegend>
          <FieldDescription>
            Update your business contact details
          </FieldDescription>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="businessName">
              Business name <span className="text-destructive">*</span>
            </FieldLabel>
            <Input
              id="businessName"
              value={businessName || ""}
              onChange={(e) => setFormState({ businessName: e.target.value })}
              placeholder="Enter your business name"
              aria-invalid={!!errors.businessName}
            />
            {errors.businessName && (
              <FieldError>{errors.businessName}</FieldError>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="contactPersonName">
              Contact person <span className="text-destructive">*</span>
            </FieldLabel>
            <Input
              id="contactPersonName"
              value={contactPersonName || ""}
              onChange={(e) =>
                setFormState({ contactPersonName: e.target.value })
              }
              placeholder="Enter contact person name"
              aria-invalid={!!errors.contactPersonName}
            />
            {errors.contactPersonName && (
              <FieldError>{errors.contactPersonName}</FieldError>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="mobileNumber">
              Phone number <span className="text-destructive">*</span>
            </FieldLabel>
            <PhoneInput
              id="mobileNumber"
              value={mobileNumber || ""}
              onChange={(value) => setFormState({ mobileNumber: value || "" })}
              placeholder="Enter phone number"
              defaultCountry="PH"
              aria-invalid={!!errors.mobileNumber}
            />
            {errors.mobileNumber && (
              <FieldError>{errors.mobileNumber}</FieldError>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="email">Email address</FieldLabel>
            <Input
              id="email"
              type="email"
              value={email || ""}
              onChange={(e) => setFormState({ email: e.target.value })}
              placeholder="Enter email address"
              aria-invalid={!!errors.email}
            />
            {errors.email && <FieldError>{errors.email}</FieldError>}
          </Field>
        </div>
      </FieldGroup>
    </FieldSet>
  );
}
