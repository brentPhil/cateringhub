"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChefHat } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import {
  MultiStepForm,
  useMultiStepForm,
} from "@/components/ui/multi-step-form";
import { BusinessInfoStep } from "@/components/onboarding/business-info-step";
import { ServiceDetailsStep } from "@/components/onboarding/service-details-step";
import { ContactInfoStep } from "@/components/onboarding/contact-info-step";
import { useUser, useIsProvider } from "@/hooks/use-auth";
import {
  providerBusinessInfoSchema,
  providerServiceDetailsSchema,
  providerContactInfoSchema,
} from "@/lib/validations";
import {
  createCateringProvider,
  checkExistingProvider,
} from "@/lib/api/provider-onboarding";

// Combined form data type
type OnboardingFormData = z.infer<typeof providerBusinessInfoSchema> &
  z.infer<typeof providerServiceDetailsSchema> &
  z.infer<typeof providerContactInfoSchema>;

const steps = [
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

export default function ProviderOnboardingFlowPage() {
  const router = useRouter();
  const { data: user, isLoading: isUserLoading } = useUser();
  const isProvider = useIsProvider();

  // Multi-step form state
  const { currentStep, nextStep, previousStep, canGoPrevious } =
    useMultiStepForm({ totalSteps: steps.length });

  // Form data state
  const [formData, setFormData] = React.useState<Partial<OnboardingFormData>>(
    {}
  );
  const [stepValidation, setStepValidation] = React.useState<
    Record<number, boolean>
  >({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Redirect if not logged in
  React.useEffect(() => {
    if (!isUserLoading && !user) {
      router.push(
        "/login?redirect=" + encodeURIComponent("/onboarding/provider/flow")
      );
    }
  }, [user, isUserLoading, router]);

  // Redirect if already a provider
  React.useEffect(() => {
    if (isProvider) {
      router.push("/dashboard");
    }
  }, [isProvider, router]);

  // Show loading state
  if (isUserLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <Typography variant="mutedText">Loading...</Typography>
        </div>
      </div>
    );
  }

  // Don't render if user is not logged in (will redirect)
  if (!user) {
    return null;
  }

  // Handle step data changes
  const handleStepDataChange = (stepData: Partial<OnboardingFormData>) => {
    setFormData((prev) => ({ ...prev, ...stepData }));
  };

  // Handle step validation changes
  const handleStepValidationChange = (step: number, isValid: boolean) => {
    setStepValidation((prev) => ({ ...prev, [step]: isValid }));
  };

  // Handle next step
  const handleNext = () => {
    if (stepValidation[currentStep]) {
      nextStep();
    } else {
      toast.error("Please complete all required fields before continuing.");
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!stepValidation[currentStep]) {
      toast.error("Please complete all required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Check if user is already a provider
      const isExistingProvider = await checkExistingProvider();
      if (isExistingProvider) {
        toast.error("You are already a catering provider.");
        router.push("/dashboard");
        return;
      }

      // Create catering provider profile
      await createCateringProvider(formData as OnboardingFormData);

      toast.success(
        "Onboarding completed successfully! Welcome to CateringHub!"
      );
      router.push("/dashboard");
    } catch (error) {
      console.error("Error submitting onboarding:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to complete onboarding. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render current step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <BusinessInfoStep
            data={formData}
            onDataChange={handleStepDataChange}
            onValidationChange={(isValid) =>
              handleStepValidationChange(1, isValid)
            }
          />
        );
      case 2:
        return (
          <ServiceDetailsStep
            data={formData}
            onDataChange={handleStepDataChange}
            onValidationChange={(isValid) =>
              handleStepValidationChange(2, isValid)
            }
          />
        );
      case 3:
        return (
          <ContactInfoStep
            data={formData}
            onDataChange={handleStepDataChange}
            onValidationChange={(isValid) =>
              handleStepValidationChange(3, isValid)
            }
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ChefHat className="h-6 w-6" />
            <Typography variant="h5">CateringHub</Typography>
          </div>
          <Button variant="ghost" asChild>
            <Link
              href="/onboarding/provider"
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <MultiStepForm
          steps={steps}
          currentStep={currentStep}
          onNext={handleNext}
          onPrevious={previousStep}
          onSubmit={handleSubmit}
          canGoNext={stepValidation[currentStep] || false}
          canGoPrevious={canGoPrevious}
          isSubmitting={isSubmitting}
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
