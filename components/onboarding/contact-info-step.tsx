"use client";

import * as React from "react";
import { Form } from "@/components/ui/form";
import type { UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { providerContactInfoSchema } from "@/lib/validations";
import type { OnboardingFormReturn } from "@/hooks/use-onboarding-form";
import { cn } from "@/lib/utils";
import { useOnboardingStepForm } from "./shared/form-hooks";
import {
  TextField,
  SocialMediaLinks,
  InfoSection,
  FormSection,
} from "./shared/form-components";
import type { BaseOnboardingStepProps, OnboardingFormControl } from "./shared/form-types";

// Type-safe form data definition
type ContactInfoFormData = z.infer<typeof providerContactInfoSchema>;

// Enhanced props interface using shared base
export interface ContactInfoStepProps
  extends BaseOnboardingStepProps<ContactInfoFormData> {
  form?: OnboardingFormReturn;
}

// Form field configurations
const FORM_CONFIGS = {
  contactPersonName: {
    label: "Contact Person Name",
    placeholder: "Enter the name of the main contact person",
    description:
      "The name of the person customers should contact for inquiries and bookings.",
    required: true,
  },
  mobileNumber: {
    label: "Mobile Number",
    placeholder: "Enter your mobile number (e.g., +63 912 345 6789)",
    description:
      "Your primary contact number for customer inquiries and bookings. Include country code for international format.",
    required: true,
  },
} as const;

// Info section content
const INFO_ITEMS = [
  "• Your contact details will be visible to customers who want to book your services",
  "• Social media links help build trust and showcase your work",
  "• We'll never share your information with third parties without permission",
  "• You can update this information anytime in your profile settings",
];

export const ContactInfoStep = React.memo<ContactInfoStepProps>(
  function ContactInfoStep({
    data,
    onDataChange,
    form: unifiedForm,
    disabled = false,
    className,
  }) {
    // Use the shared form hook for consistent behavior
    const { form } = useOnboardingStepForm(
      providerContactInfoSchema,
      data,
      onDataChange,
      unifiedForm
    );

    // Memoize form props to prevent unnecessary re-renders
    const formProps = React.useMemo(
      () => form as unknown as UseFormReturn<ContactInfoFormData>,
      [form]
    );
    const controlProps = React.useMemo(
      () => form.control as unknown as OnboardingFormControl,
      [form.control]
    );

    // Memoize field configurations to prevent recreation
    const fieldConfigs = React.useMemo(
      () => ({
        contactPersonName: FORM_CONFIGS.contactPersonName,
        mobileNumber: FORM_CONFIGS.mobileNumber,
      }),
      []
    );

    return (
      <Form {...formProps}>
        <div className={cn("space-y-6", className)}>
          <FormSection legend="Contact Information" disabled={disabled}>
            <TextField
              control={controlProps}
              name="contactPersonName"
              config={fieldConfigs.contactPersonName}
              disabled={disabled}
            />

            <TextField
              control={controlProps}
              name="mobileNumber"
              config={fieldConfigs.mobileNumber}
              type="tel"
              disabled={disabled}
            />
          </FormSection>

          <SocialMediaLinks control={controlProps} disabled={disabled} />

          <InfoSection title="Contact Information Usage:" items={INFO_ITEMS} />
        </div>
      </Form>
    );
  }
);
