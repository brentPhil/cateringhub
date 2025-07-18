"use client";

import * as React from "react";
import { Form } from "@/components/ui/form";
import type { Control, UseFormReturn, FieldValues } from "react-hook-form";
import { z } from "zod";
import { providerServiceDetailsSchema } from "@/lib/validations";
import type { OnboardingFormReturn } from "@/hooks/use-onboarding-form";
import { cn } from "@/lib/utils";
import { useOnboardingStepForm, useDynamicArray } from "./shared/form-hooks";
import {
  TextareaField,
  FileUploadField,
  DynamicArrayField,
  InfoSection,
  FormSection,
} from "./shared/form-components";
import type { BaseOnboardingStepProps } from "./shared/form-types";
import { DEFAULT_FILE_CONFIGS } from "./shared/form-types";

// Type-safe form data definition
type ServiceDetailsFormData = z.infer<typeof providerServiceDetailsSchema>;

// Enhanced props interface using shared base
export interface ServiceDetailsStepProps
  extends BaseOnboardingStepProps<ServiceDetailsFormData> {
  form?: OnboardingFormReturn;
}

// Form field configurations
const FORM_CONFIGS = {
  description: {
    label: "Service Description",
    placeholder:
      "Describe your catering services, specialties, and what makes your business unique...",
    description:
      "Tell potential customers about your catering services. Include your specialties, cuisine types, and what makes your business special. (10-500 characters)",
    required: true,
  },
  serviceAreas: {
    label: "Service Areas",
    placeholder: "Enter a city or barangay",
    description:
      "Add the cities, municipalities, or barangays where you provide catering services. This helps customers know if you serve their area.",
    required: true,
  },
  sampleMenu: {
    label: "Sample Menu",
    placeholder: "Upload a sample menu or food photos",
    description:
      "Upload a sample menu, price list, or photos of your food. This helps customers understand your offerings. (Images or PDF, max 10MB)",
  },
} as const;

// Info section content
const INFO_ITEMS = [
  "• Be specific about your cuisine types and specialties",
  "• Include all areas you're willing to serve",
  "• High-quality menu photos attract more customers",
  "• Mention any dietary options (vegetarian, halal, etc.)",
];

export const ServiceDetailsStep = React.memo<ServiceDetailsStepProps>(
  function ServiceDetailsStep({
    data,
    onDataChange,
    form: unifiedForm,
    disabled = false,
    className,
  }) {
    // Use the shared form hook for consistent behavior
    const { form } = useOnboardingStepForm(
      providerServiceDetailsSchema,
      data,
      onDataChange,
      unifiedForm
    );

    // Use the dynamic array hook for service areas management
    const serviceAreasManager = useDynamicArray(
      form as unknown as UseFormReturn<FieldValues>,
      "serviceAreas"
    );

    // Memoize form props to prevent unnecessary re-renders
    const formProps = React.useMemo(
      () => form as unknown as UseFormReturn<ServiceDetailsFormData>,
      [form]
    );
    const controlProps = React.useMemo(
      () => form.control as unknown as Control<ServiceDetailsFormData>,
      [form.control]
    );

    // Memoize field configurations to prevent recreation
    const fieldConfigs = React.useMemo(
      () => ({
        description: FORM_CONFIGS.description,
        serviceAreas: FORM_CONFIGS.serviceAreas,
        sampleMenu: FORM_CONFIGS.sampleMenu,
      }),
      []
    );

    // Memoize callback functions to prevent unnecessary re-renders
    const handleAddArea = React.useCallback(() => {
      return serviceAreasManager.addItem(serviceAreasManager.inputValue);
    }, [serviceAreasManager]);

    return (
      <Form {...formProps}>
        <div className={cn("space-y-6", className)}>
          <FormSection legend="Service Details" disabled={disabled}>
            <TextareaField
              control={controlProps}
              name="description"
              config={fieldConfigs.description}
              disabled={disabled}
              rows={5}
              resize={false}
            />

            <DynamicArrayField
              control={controlProps}
              name="serviceAreas"
              config={fieldConfigs.serviceAreas}
              inputValue={serviceAreasManager.inputValue}
              onInputChange={serviceAreasManager.setInputValue}
              onAddItem={handleAddArea}
              onRemoveItem={serviceAreasManager.removeItem}
              onKeyDown={serviceAreasManager.handleKeyDown}
              disabled={disabled}
              addButtonLabel="Add Area"
            />

            <FileUploadField
              control={controlProps}
              name="sampleMenu"
              config={fieldConfigs.sampleMenu}
              uploadConfig={DEFAULT_FILE_CONFIGS.DOCUMENT}
              disabled={disabled}
            />
          </FormSection>

          <InfoSection title="Tips for better visibility:" items={INFO_ITEMS} />
        </div>
      </Form>
    );
  }
);
