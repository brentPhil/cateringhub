"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-state";
import {
  MultiStepForm,
  useMultiStepForm,
} from "@/components/ui/multi-step-form";
import { useAuthInfo } from "@/hooks/use-auth";
import {
  useCreateProvider,
  useProviderStatus,
  type ProviderOnboardingData,
} from "@/hooks/use-provider-onboarding";
import { ProviderHeader } from "@/components/provider-header";
import { useOnboardingForm, FORM_STEPS } from "@/hooks/use-onboarding-form";
import { providerOnboardingSchema } from "@/lib/validations";
import type { ProviderOnboardingFormData } from "@/types/form.types";
import { IS_DEV } from "@/lib/constants";

// Lazy load step components for better bundle splitting with error boundaries
const BusinessInfoStep = React.lazy(() =>
  import("@/components/onboarding/business-info-step").then((module) => ({
    default: module.BusinessInfoStep,
  }))
);
const ServiceDetailsStep = React.lazy(() =>
  import("@/components/onboarding/service-details-step").then((module) => ({
    default: module.ServiceDetailsStep,
  }))
);
const ContactInfoStep = React.lazy(() =>
  import("@/components/onboarding/contact-info-step").then((module) => ({
    default: module.ContactInfoStep,
  }))
);

// Error boundary for step components
const StepErrorBoundary: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  return (
    <React.Suspense
      fallback={<LoadingState variant="card" count={1} showFooter={true} />}
    >
      {children}
    </React.Suspense>
  );
};

// Constants for better maintainability - using consistent step mapping
const STEPS = [
  {
    id: "business-info",
    title: "Business Information",
    description: "Tell us about your catering business",
  },
  {
    id: "service-details",
    title: "Service Details",
    description: "Describe your services and coverage area",
  },
  {
    id: "contact-info",
    title: "Contact Information",
    description: "How customers can reach you",
  },
];

const FORM_STORAGE_KEY = "onboarding-form-data";
const FORM_TIMESTAMP_KEY = "onboarding-form-timestamp";
const FORM_DATA_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

// Step names for error messages - extracted to avoid duplication
const STEP_NAMES = [
  "Business Information",
  "Service Details",
  "Contact Information",
] as const;

// Helper function to format field names for user-friendly error messages
function formatFieldName(fieldName: string): string {
  // Handle nested fields like "socialMediaLinks.facebook"
  const parts = fieldName.split(".");
  const lastPart = parts[parts.length - 1];

  // Convert camelCase to Title Case with spaces
  return lastPart
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

// Custom hook for form recovery
function useFormRecovery() {
  const [recoveryData, setRecoveryData] = React.useState<{
    data: ProviderOnboardingFormData | null;
    showPrompt: boolean;
  }>({ data: null, showPrompt: false });

  React.useEffect(() => {
    try {
      const savedData = localStorage.getItem(FORM_STORAGE_KEY);
      const savedTimestamp = localStorage.getItem(FORM_TIMESTAMP_KEY);

      if (savedData && savedTimestamp) {
        const isRecent =
          Date.now() - parseInt(savedTimestamp) < FORM_DATA_EXPIRY;

        if (isRecent) {
          const parsedData = JSON.parse(savedData);
          setRecoveryData({ data: parsedData, showPrompt: true });
        } else {
          // Clean up expired data
          localStorage.removeItem(FORM_STORAGE_KEY);
          localStorage.removeItem(FORM_TIMESTAMP_KEY);
        }
      }
    } catch (error) {
      if (IS_DEV) console.warn("Failed to load saved form data:", error);
      localStorage.removeItem(FORM_STORAGE_KEY);
      localStorage.removeItem(FORM_TIMESTAMP_KEY);
    }
  }, []);

  const recoverData = React.useCallback(() => {
    setRecoveryData({ data: recoveryData.data, showPrompt: false });
    return recoveryData.data;
  }, [recoveryData.data]);

  const discardData = React.useCallback(() => {
    localStorage.removeItem(FORM_STORAGE_KEY);
    localStorage.removeItem(FORM_TIMESTAMP_KEY);
    setRecoveryData({ data: null, showPrompt: false });
  }, []);

  return {
    recoveryData: recoveryData.data,
    showRecoveryPrompt: recoveryData.showPrompt,
    recoverData,
    discardData,
  };
}

export default function ProviderOnboardingFlowPage() {
  const router = useRouter();
  const { user, isProvider, isLoading: authLoading } = useAuthInfo();

  // TanStack Query hooks
  const createProviderMutation = useCreateProvider();
  const { data: isExistingProvider, isLoading: isCheckingProvider } =
    useProviderStatus();

  // Computed loading state
  const isLoading = authLoading || isCheckingProvider;

  // Form recovery hook
  const { showRecoveryPrompt, recoverData, discardData } = useFormRecovery();

  // Multi-step form state
  const { currentStep, nextStep, previousStep, canGoPrevious } =
    useMultiStepForm({
      totalSteps: STEPS.length,
    });

  // Use the dedicated onboarding form hook for better performance and validation
  const onboardingForm = useOnboardingForm({
    enableAutoSave: true,
    autoSaveKey: FORM_STORAGE_KEY,
  });

  // Memoized step validation - depends on form errors for optimal re-computation
  const stepValidation = React.useMemo(() => {
    const validation: Record<number, boolean> = {
      1: onboardingForm.isStepValid(FORM_STEPS.BUSINESS_INFO),
      2: onboardingForm.isStepValid(FORM_STEPS.SERVICE_DETAILS),
      3: onboardingForm.isStepValid(FORM_STEPS.CONTACT_INFO),
    };
    return validation;
  }, [onboardingForm]);

  // Recovery functions with proper memoization
  const handleRecoverData = React.useCallback(() => {
    const data = recoverData();
    if (data) {
      onboardingForm.reset(data);
      toast.success("Form data recovered successfully!");
    }
  }, [recoverData, onboardingForm]);

  const handleDiscardData = React.useCallback(() => {
    discardData();
    onboardingForm.clearStorage();
  }, [discardData, onboardingForm]);

  // Memoized data change handlers to prevent unnecessary re-renders
  const handleDataChange = React.useCallback(
    (data: Partial<ProviderOnboardingFormData>) => {
      const { setValue } = onboardingForm;
      Object.entries(data).forEach(([key, value]) => {
        setValue(key as keyof ProviderOnboardingFormData, value, {
          shouldValidate: true,
        });
      });
    },
    [onboardingForm]
  );

  // Optimized step content rendering with lazy loading, memoization, and error boundaries
  const renderStepContent = React.useCallback(() => {
    const formData = onboardingForm.getValues();

    switch (currentStep) {
      case 1:
        return (
          <StepErrorBoundary>
            <BusinessInfoStep
              data={{
                businessName: formData.businessName,
                businessAddress: formData.businessAddress,
                logo: formData.logo,
              }}
              onDataChange={handleDataChange}
              form={onboardingForm}
            />
          </StepErrorBoundary>
        );
      case 2:
        return (
          <StepErrorBoundary>
            <ServiceDetailsStep
              data={{
                description: formData.description,
                serviceAreas: formData.serviceAreas,
                sampleMenu: formData.sampleMenu,
              }}
              onDataChange={handleDataChange}
              form={onboardingForm}
            />
          </StepErrorBoundary>
        );
      case 3:
        return (
          <StepErrorBoundary>
            <ContactInfoStep
              data={{
                contactPersonName: formData.contactPersonName,
                mobileNumber: formData.mobileNumber,
                socialMediaLinks: formData.socialMediaLinks,
              }}
              onDataChange={handleDataChange}
              form={onboardingForm}
            />
          </StepErrorBoundary>
        );
      default:
        return null;
    }
  }, [currentStep, onboardingForm, handleDataChange]);

  // Improved navigation handler with detailed error feedback
  const handleNext = React.useCallback(() => {
    if (stepValidation[currentStep]) {
      nextStep();
    } else {
      // Get specific errors for the current step (cast to FormStep type)
      const stepErrors = onboardingForm.getStepErrors(currentStep as 1 | 2 | 3);
      const errorFields = Object.keys(stepErrors);

      if (errorFields.length > 0) {
        // Show the first error to guide the user with formatted field name
        const firstErrorField = errorFields[0];
        const firstError = stepErrors[firstErrorField];
        const errorMessage = firstError?.message || "This field has an error";
        const formattedFieldName = formatFieldName(firstErrorField);

        toast.error(`${formattedFieldName}: ${errorMessage}`);
      } else {
        // Fallback to generic message
        toast.error(
          `Please complete all required fields in ${
            STEP_NAMES[currentStep - 1]
          } before continuing.`
        );
      }
    }
  }, [stepValidation, currentStep, nextStep, onboardingForm]);

  // Simplified form submission with streamlined validation
  const handleSubmit = React.useCallback(async () => {
    // Check if user already has a provider profile
    if (isExistingProvider) {
      toast.error("You are already a catering provider.");
      router.push("/dashboard");
      return;
    }

    // Validate all steps before submission
    const allStepsValid = Object.values(stepValidation).every(Boolean);
    if (!allStepsValid) {
      const invalidSteps = Object.entries(stepValidation)
        .filter(([, isValid]) => !isValid)
        .map(([step]) => STEP_NAMES[parseInt(step) - 1]);
      toast.error(
        `Please complete the following steps: ${invalidSteps.join(", ")}`
      );
      return;
    }

    // Get form data and perform final validation
    const formData = onboardingForm.getValues();

    // Log form data for debugging
    if (IS_DEV) {
      console.log("Form data before validation:", {
        businessName: formData.businessName,
        businessAddress: formData.businessAddress,
        logo: formData.logo
          ? formData.logo instanceof File
            ? `File: ${formData.logo.name}`
            : formData.logo
          : undefined,
        description: formData.description,
        serviceAreas: formData.serviceAreas,
        sampleMenu: formData.sampleMenu
          ? formData.sampleMenu instanceof File
            ? `File: ${formData.sampleMenu.name}`
            : formData.sampleMenu
          : undefined,
        contactPersonName: formData.contactPersonName,
        mobileNumber: formData.mobileNumber,
        socialMediaLinks: formData.socialMediaLinks,
      });
    }

    const validationResult = providerOnboardingSchema.safeParse(formData);

    if (!validationResult.success) {
      // Log detailed errors in development for debugging
      if (IS_DEV) {
        console.error("Validation errors:", validationResult.error.errors);
        console.error(
          "Full validation error:",
          JSON.stringify(validationResult.error, null, 2)
        );
      }

      // Show user-friendly error message with specific field issues
      const firstError = validationResult.error.errors[0];
      const fieldPath = firstError.path.join(".");
      const formattedFieldName = formatFieldName(fieldPath);
      toast.error(`${formattedFieldName}: ${firstError.message}`);
      return;
    }

    // Prepare submission data with trimmed strings
    const submissionData: ProviderOnboardingData = {
      businessName: formData.businessName.trim(),
      businessAddress: formData.businessAddress?.trim(),
      logo: formData.logo || undefined,
      description: formData.description.trim(),
      serviceAreas: formData.serviceAreas,
      sampleMenu: formData.sampleMenu || undefined,
      contactPersonName: formData.contactPersonName.trim(),
      mobileNumber: formData.mobileNumber.trim(),
      socialMediaLinks: formData.socialMediaLinks || undefined,
    };

    // Submit the form
    createProviderMutation.mutate(submissionData, {
      onSuccess: () => {
        // Clear saved form data on successful submission
        onboardingForm.clearStorage();

        toast.success(
          "🎉 Onboarding completed successfully! Welcome to CateringHub!"
        );
        router.push("/dashboard");
      },
      onError: (error) => {
        if (IS_DEV) console.error("Error submitting onboarding:", error);

        // Provide specific error messages based on error type
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";

        if (errorMessage.includes("duplicate")) {
          toast.error(
            "You already have a provider profile. Redirecting to dashboard..."
          );
          setTimeout(() => router.push("/dashboard"), 2000);
        } else if (
          errorMessage.includes("network") ||
          errorMessage.includes("fetch")
        ) {
          toast.error(
            "Network error. Please check your connection and try again."
          );
        } else {
          toast.error(
            "Submission failed. Please check your information and try again."
          );
        }
      },
    });
  }, [
    stepValidation,
    isExistingProvider,
    onboardingForm,
    createProviderMutation,
    router,
  ]);

  // Simple redirect logic
  React.useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.push(
        "/login?redirect=" + encodeURIComponent("/onboarding/provider/flow")
      );
      return;
    }

    if (isProvider || isExistingProvider) {
      router.push("/dashboard");
      return;
    }
  }, [user, isLoading, isProvider, isExistingProvider, router]);

  // Show loading state with skeleton loaders
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header Skeleton */}
        <header className="border-b border-border">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 bg-muted rounded animate-pulse"></div>
              <div className="h-6 w-32 bg-muted rounded animate-pulse"></div>
            </div>
            <div className="h-9 w-20 bg-muted rounded animate-pulse"></div>
          </div>
        </header>

        {/* Main Content Skeleton */}
        <main className="container mx-auto px-4 py-8">
          <div className="w-full max-w-4xl mx-auto">
            {/* Progress Steps Skeleton */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                {[1, 2, 3].map((step) => (
                  <div
                    key={step}
                    className="flex flex-col items-center space-y-2"
                  >
                    <div className="w-8 h-8 bg-muted rounded-full animate-pulse"></div>
                    <div className="h-4 w-20 bg-muted rounded animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Form Card Skeleton */}
            <LoadingState variant="card" count={1} showFooter={true} />
          </div>
        </main>
      </div>
    );
  }

  // Don't render if user is not logged in (will redirect)
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Recovery Prompt with improved accessibility */}
      {showRecoveryPrompt && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="recovery-title"
          aria-describedby="recovery-description"
        >
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
            <h3 id="recovery-title" className="text-lg font-semibold mb-2">
              Recover Previous Data?
            </h3>
            <p id="recovery-description" className="text-gray-600 mb-4">
              We found some previously saved form data. Would you like to
              recover it?
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={handleDiscardData}
                aria-label="Discard saved data and start fresh"
              >
                Start Fresh
              </Button>
              <Button
                onClick={handleRecoverData}
                aria-label="Recover previously saved form data"
              >
                Recover Data
              </Button>
            </div>
          </div>
        </div>
      )}

      <ProviderHeader backHref="/onboarding/provider" backLabel="Back" />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <MultiStepForm
          steps={STEPS}
          currentStep={currentStep}
          onNext={handleNext}
          onPrevious={previousStep}
          onSubmit={handleSubmit}
          canGoNext={stepValidation[currentStep]}
          canGoPrevious={canGoPrevious}
          isSubmitting={createProviderMutation.isPending}
          title="Provider Onboarding"
          description="Complete your catering provider profile to start accepting bookings"
          showProgress={true}
          progressOrientation="horizontal"
        >
          {renderStepContent()}
        </MultiStepForm>
      </main>
    </div>
  );
}
