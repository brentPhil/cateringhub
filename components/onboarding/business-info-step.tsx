"use client";

import * as React from "react";
import { Form } from "@/components/ui/form";
import { providerBusinessInfoSchema } from "@/lib/validations";
import type { ProviderOnboardingFormData } from "@/types/form.types";
import type { OnboardingFormReturn } from "@/hooks/use-onboarding-form";
import { cn } from "@/lib/utils";

import { useOnboardingStepForm } from "./shared/form-hooks";
import {
  TextField,
  TextareaField,
  FileUploadField,
  InfoSection,
  FormSection,
} from "./shared/form-components";
import {
  BaseOnboardingStepProps,
  DEFAULT_FILE_CONFIGS,
} from "./shared/form-types";

// Type-safe form data definition
type BusinessInfoFormData = Pick<
  ProviderOnboardingFormData,
  "businessName" | "businessAddress" | "logo"
>;

// Enhanced props interface using shared base
export interface BusinessInfoStepProps
  extends BaseOnboardingStepProps<BusinessInfoFormData> {
  form?: OnboardingFormReturn;
}

// Static form field configurations for performance
const FORM_CONFIGS = {
  businessName: {
    label: "Business Name",
    placeholder: "Enter your catering business name",
    description:
      "This will be displayed to customers when they view your services.",
    required: true,
    autoComplete: "organization",
  },
  businessAddress: {
    label: "Business Address",
    placeholder: "Enter your business address (optional)",
    description:
      "Your business location. This helps customers understand your service area.",
    autoComplete: "street-address",
  },
  logo: {
    label: "Business Logo",
    placeholder: "Upload your business logo",
    description:
      "Upload your business logo to make your profile more professional. Recommended size: 400x400px or larger, PNG/JPG format.",
  },
} as const;

// Static info section content
const INFO_ITEMS = [
  "• Your business name will be displayed on your public profile",
  "• Business address helps customers understand your service coverage",
  "• A professional logo builds trust with potential customers",
];

export const BusinessInfoStep = React.memo<BusinessInfoStepProps>(
  function BusinessInfoStep({
    data,
    onDataChange,
    form: unifiedForm,
    disabled = false,
    className,
  }) {
    // Use the shared form hook for consistent behavior
    const { form } = useOnboardingStepForm(
      providerBusinessInfoSchema,
      data,
      onDataChange,
      unifiedForm
    );

    // Memoize form props to prevent unnecessary re-renders
    const formProps = React.useMemo(() => form as any, [form]);
    const controlProps = React.useMemo(
      () => form.control as any,
      [form.control]
    );

    // Memoize field configurations to prevent recreation
    const fieldConfigs = React.useMemo(
      () => ({
        businessName: FORM_CONFIGS.businessName,
        businessAddress: FORM_CONFIGS.businessAddress,
        logo: FORM_CONFIGS.logo,
      }),
      []
    );

    return (
      <Form {...formProps}>
        <div className={cn("space-y-6", className)}>
          <FormSection legend="Business Information" disabled={disabled}>
            <TextField
              control={controlProps}
              name="businessName"
              config={fieldConfigs.businessName}
              disabled={disabled}
            />

            <TextareaField
              control={controlProps}
              name="businessAddress"
              config={fieldConfigs.businessAddress}
              disabled={disabled}
              rows={3}
              resize={false}
            />

            <FileUploadField
              control={controlProps}
              name="logo"
              config={fieldConfigs.logo}
              uploadConfig={DEFAULT_FILE_CONFIGS.IMAGE}
              disabled={disabled}
            />
          </FormSection>

          <InfoSection
            title="Why we need this information:"
            items={INFO_ITEMS}
          />
        </div>
      </Form>
    );
  }
);
