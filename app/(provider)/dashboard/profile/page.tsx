"use client";

import * as React from "react";
// import { BrandColorPicker } from "@/components/profile/brand-color-picker";
import { Typography } from "@/components/ui/typography";
import { BannerUpload } from "./components/banner-upload";
import { LogoUpload } from "./components/logo-upload";
import { ProfileForm } from "./components/profile-form";
import { AboutBusinessSection } from "./components/about-business-section";
import { ProfileVisibilitySection } from "./components/profile-visibility-section";
import { AvailabilitySection } from "./components/availability-section";
import { FloatingFooter } from "@/components/profile/floating-footer";
import {
  PackagesPreviewSection,
  type Package as PreviewPackage,
} from "./components/packages-preview-section";
import { ServiceCoverageSection } from "./components/service-coverage-section";
import { ServiceLocationsSection } from "./components/service-locations-section";
import { useRouter } from "next/navigation";
import { useProviderProfile } from "./hooks/use-provider-profile";
import { useProfileFormState } from "./hooks/use-profile-form-state";
import { updateProviderProfile } from "./actions";
import useToast from "@/hooks/useToast";
import { getServiceCoverageData } from "./utils/service-coverage";
import { providerProfileFormSchema } from "@/lib/validations";
import { z } from "zod";
import { useServiceLocations } from "./hooks/use-service-locations";
import { saveServiceLocations } from "./actions/service-locations";
import { getCityName } from "@/lib/data/philippine-locations";

export default function ProfilePage() {
  // Fetch provider profile
  const { data, isLoading, error, refetch } = useProviderProfile();
  const { toast } = useToast();

  // Mounted state to prevent hydration mismatch
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Brand color state (TODO: add to database schema)
  // const [brandColor, setBrandColor] = React.useState<string | undefined>(
  //   "#2563EB"
  // );
  const router = useRouter();

  // Sample packages for preview
  const samplePackages: PreviewPackage[] = [
    {
      id: 1,
      name: "Wedding essentials",
      description: "Buffet for 100 guests with 3 mains, 2 sides, dessert",
      price: 45000,
    },
    {
      id: 2,
      name: "Corporate lunch set",
      description: "Packed meals for 50 with vegetarian options",
      price: 15000,
    },
  ];

  const handleManagePackages = () => {
    router.push("/dashboard/packages");
  };

  // const handleColorChange = (color: string) => {
  //   setBrandColor(color);
  //   // TODO: Update in Supabase
  // };

  // Use profile form state with nuqs - includes all form fields and availability
  const {
    formData,
    isDirty,
    resetForm,
    setFormState,
    setProfileVisible,
    setDailyCapacity,
    setAdvanceBookingDays,
    setSelectedDays,
  } = useProfileFormState(data?.profile || null);

  // Service locations state (multi-location support)
  const {
    locations,
    addLocation,
    removeLocation,
    updateLocation,
    setPrimaryLocation,
    validateLocations,
    resetLocations: resetLocationState,
    isDirty: locationsIsDirty,
    syncFromServer,
  } = useServiceLocations(data?.profile?.service_locations || []);

  // Active location state for map interaction
  const [activeLocationId, setActiveLocationId] = React.useState<string | null>(
    null
  );

  // Initialize active location to primary location on mount
  React.useEffect(() => {
    if (locations.length > 0 && !activeLocationId) {
      const primary = locations.find((l) => l.isPrimary);
      setActiveLocationId(primary?.id || locations[0].id);
    }
  }, [locations, activeLocationId]);

  // Select location for coverage: 1) active by ID, 2) primary, 3) first
  const selectedCoverageLocation = React.useMemo(() => {
    if (locations.length === 0) return null;

    // 1) by activeLocationId if present
    const byActive = activeLocationId
      ? locations.find((l) => l.id === activeLocationId)
      : undefined;
    if (byActive) return byActive;

    // 2) primary location
    const primary = locations.find((l) => l.isPrimary);
    if (primary) return primary;

    // 3) fallback to first
    return locations[0];
  }, [locations, activeLocationId]);

  // Calculate service coverage data (updates in real time) with robust fallback
  const serviceCoverageData = React.useMemo(() => {
    if (!selectedCoverageLocation) {
      return { radius: 50, mapCityName: "", coveredCities: [] };
    }
    const centerCityCode = selectedCoverageLocation.city;
    const radius = selectedCoverageLocation.serviceRadius;
    return getServiceCoverageData(centerCityCode, radius);
  }, [selectedCoverageLocation]);

  // Validation errors
  const [errors, setErrors] = React.useState<
    Partial<Record<keyof z.infer<typeof providerProfileFormSchema>, string>>
  >({});

  // Saving state
  const [isSaving, setIsSaving] = React.useState(false);

  // Validate form
  const validateForm = (): boolean => {
    try {
      providerProfileFormSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Partial<
          Record<keyof z.infer<typeof providerProfileFormSchema>, string>
        > = {};
        error.errors.forEach((err) => {
          const field = err.path[0] as keyof z.infer<
            typeof providerProfileFormSchema
          >;
          newErrors[field] = err.message;
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  // Handle profile save
  const handleProfileSave = async () => {
    // console.log("🔵 [SAVE] Starting save process...");
    // console.log("🔵 [SAVE] Form data to save:", formData);

    if (!validateForm()) {
      // console.log("🔴 [SAVE] Validation failed");
      return;
    }

    // Validate service locations
    const locationErrors = validateLocations();
    if (locationErrors.length > 0) {
      // console.log("🔴 [SAVE] Location validation failed:", locationErrors);
      toast.error(locationErrors[0]);
      return;
    }

    setIsSaving(true);
    try {
      // console.log("🔵 [SAVE] Calling updateProviderProfile...");
      const result = await updateProviderProfile(formData);
      // console.log("🔵 [SAVE] Update result:", result);

      if (result.success) {
        // Save service locations
        if (data?.profile?.id) {
          // console.log("🔵 [SAVE] Saving service locations...");
          const toSave = locations.map((l) => ({
            id: l.id,
            province: l.province,
            city: l.city,
            barangay: l.barangay,
            streetAddress: l.streetAddress,
            postalCode: l.postalCode,
            isPrimary: l.isPrimary,
            landmark: l.landmark,
            notes: l.notes,
            serviceRadius: l.serviceRadius,
          }));
          const locResult = await saveServiceLocations(data.profile.id, toSave);
          // console.log("🔵 [SAVE] Locations save result:", locResult);
          if (!locResult.success) {
            toast.error(locResult.error || "Failed to save service locations");
            return;
          }
        }

        toast.success(result.message || "Profile updated successfully");

        // console.log("🔵 [SAVE] Refetching profile data...");
        const refetchResult = await refetch();
        // console.log("🔵 [SAVE] Refetch complete");

        // Manually sync locations from the refetched data
        if (refetchResult.data?.profile?.service_locations) {
          syncFromServer(refetchResult.data.profile.service_locations);
        }

        // After refetch, the component will re-render with the new data
        // The useEffect in useProfileFormState will detect the change and update the form
        // We just need to clear the URL params to mark the form as "clean"
        console.log("� [SAVE] Clearing URL params...");
        await resetForm();
        resetLocationState();

        console.log("� [SAVE] Form reset complete");
      } else {
        console.log("🔴 [SAVE] Save failed:", result.error);
        toast.error(result.error || "Failed to update profile");
      }
    } catch (error) {
      console.error("🔴 [SAVE] Error during save:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsSaving(false);
      console.log("🔵 [SAVE] Save process complete");
    }
  };

  // Handle cancel
  const handleCancel = async () => {
    await resetForm();
    resetLocationState();
    setErrors({});
  };

  // Use mounted guard to ensure consistent initial render
  const showLoading = !mounted || isLoading;

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center max-w-md">
          <Typography variant="h4" className="text-destructive">
            Error loading profile
          </Typography>
          <Typography variant="mutedText">
            {error instanceof Error ? error.message : "An error occurred"}
          </Typography>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Banner Section */}
      <div className="relative">
        <BannerUpload
          initialBannerUrl={data?.profile?.banner_image}
          initialAdjustments={data?.profile?.banner_adjustments}
          userId={data?.userId}
          height={400}
          isLoading={showLoading}
        />

        {/* Logo overlapping banner - bottom left */}
        <div className="absolute bottom-4 left-4">
          <LogoUpload
            initialLogoUrl={data?.profile?.logo_url}
            userId={data?.userId}
            label="Logo"
            shape="circle"
            size={120}
            fallback="CH"
            isLoading={showLoading}
          />
        </div>

        {/* Brand color picker - bottom right */}
        {/* <div className="absolute bottom-4 right-4">
          <BrandColorPicker value={brandColor} onChange={handleColorChange} />
        </div> */}
      </div>

      {/* Profile Form Sections */}
      <div className="container mx-auto max-w-6xl px-6 py-8 pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content - Left Side */}
          <div className="lg:col-span-2 space-y-20">
            {/* About your business */}
            <AboutBusinessSection
              formData={formData}
              setFormState={setFormState}
              errors={errors}
              isLoading={isLoading}
            />
            {/* Basic information */}
            <ProfileForm
              formData={formData}
              setFormState={setFormState}
              errors={errors}
              isLoading={isLoading}
            />
            {/* Service locations */}
            <ServiceLocationsSection
              locations={locations}
              onAddLocation={addLocation}
              onRemoveLocation={removeLocation}
              onUpdateLocation={updateLocation}
              onSetPrimary={setPrimaryLocation}
              isLoading={isLoading}
              maxServiceRadius={formData.maxServiceRadius}
            />
            {/* Packages preview */}
            <PackagesPreviewSection
              packages={samplePackages}
              isLoading={isLoading}
              onManageClick={handleManagePackages}
            />
            {/* Service coverage area */}
            <ServiceCoverageSection
              locations={locations.map((loc) => {
                const name = getCityName(loc.city || "");
                const cityNameUpper = (name || "MANILA").toUpperCase();
                return {
                  id: loc.id,
                  city: cityNameUpper,
                  serviceRadius: loc.serviceRadius,
                  isPrimary: loc.isPrimary,
                };
              })}
              activeLocationId={activeLocationId}
              onActiveLocationChange={setActiveLocationId}
              coveredCities={serviceCoverageData.coveredCities}
              onRadiusChange={(value) => {
                if (activeLocationId) {
                  updateLocation(activeLocationId, "serviceRadius", value);
                }
              }}
              isLoading={isLoading}
              max={formData.maxServiceRadius}
            />
          </div>

          {/* Sidebar - Right Side */}
          <div className="space-y-6">
            {/* Profile Visibility Section */}
            <ProfileVisibilitySection
              value={formData.profileVisible}
              onChange={setProfileVisible}
              isLoading={isLoading}
            />

            {/* Availability Section */}
            <AvailabilitySection
              dailyCapacity={formData.dailyCapacity}
              advanceBookingDays={formData.advanceBookingDays}
              selectedDays={formData.selectedDays}
              onDailyCapacityChange={setDailyCapacity}
              onAdvanceBookingDaysChange={setAdvanceBookingDays}
              onSelectedDaysChange={setSelectedDays}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>

      {/* Floating Footer */}
      <FloatingFooter
        isVisible={isDirty || locationsIsDirty()}
        onSave={handleProfileSave}
        onCancel={handleCancel}
        isSaving={isSaving}
      />
    </div>
  );
}
