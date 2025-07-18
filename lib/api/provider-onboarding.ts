/**
 * @deprecated This file is kept for backward compatibility.
 * Use hooks/use-provider-onboarding.ts for new code.
 */

// Re-export for backward compatibility
export type { ProviderOnboardingData } from "@/hooks/use-provider-onboarding";

// Legacy exports - use hooks/use-provider-onboarding.ts for new code
export {
  createCateringProvider,
  checkExistingProvider,
  getOnboardingProgress,
  uploadFile,
} from "@/hooks/use-provider-onboarding";
