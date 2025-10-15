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
import { ProfileCompletenessWidget } from "./components/profile-completeness-widget";
import { FloatingFooter } from "@/components/profile/floating-footer";
import {
  PackagesPreviewSection,
  type Package as PreviewPackage,
} from "./components/packages-preview-section";
import { ServiceCoverageSection } from "./components/service-coverage-section";
import { ServiceLocationsSection } from "./components/service-locations-section";
import { SocialLinksSection } from "./components/social-links-section";
import { GallerySection } from "./components/gallery-section";
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
import { getCityName, getProvinceName } from "@/lib/data/philippine-locations";
import { useSocialLinks } from "./hooks/use-social-links";
import { saveSocialLinks } from "./actions/social-links";
import { useGalleryImages } from "./hooks/use-gallery-images";

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

  // Social links state (normalized table)
  const {
    links: socialLinks,
    addLink: addSocialLink,
    updateLink: updateSocialLink,
    removeLink: removeSocialLink,
    validateLinks: validateSocialLinks,
    isDirty: socialLinksIsDirty,
    resetLinks: resetSocialLinksState,
    syncFromServer: syncSocialLinksFromServer,
  } = useSocialLinks(data?.profile?.provider_social_links || []);

  // Gallery images state
  const galleryImagesFromServer = React.useMemo(
    () => data?.profile?.provider_gallery_images ?? [],
    [data?.profile?.provider_gallery_images]
  );

  const {
    images: galleryImages,
    isUploading: isUploadingGallery,
    isDeleting: isDeletingGallery,
    uploadImage: uploadGalleryImage,
    deleteImage: deleteGalleryImage,
    syncFromServer: syncGalleryFromServer,
  } = useGalleryImages(galleryImagesFromServer, data?.profile?.id);

  // Active location state for map interaction
  const [activeLocationId, setActiveLocationId] = React.useState<string | null>(
    null
  );

  // Initialize active location to primary location when locations are first loaded
  React.useEffect(() => {
    if (locations.length === 0) {
      return;
    }

    // Check if activeLocationId is null OR if it doesn't exist in current locations
    const activeLocationExists = activeLocationId
      ? locations.some((l) => l.id === activeLocationId)
      : false;

    if (!activeLocationId || !activeLocationExists) {
      const primary = locations.find((l) => l.isPrimary);
      const selectedId = primary?.id || locations[0].id;
      setActiveLocationId(selectedId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locations]); // Only depend on locations, not activeLocationId

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
    if (!validateForm()) {
      return;
    }

    // Validate service locations
    const locationErrors = validateLocations();
    if (locationErrors.length > 0) {
      toast.error(locationErrors[0]);
      return;
    }

    // Validate social links
    const socialLinkErrors = validateSocialLinks();
    if (socialLinkErrors.length > 0) {
      toast.error(socialLinkErrors[0]);
      return;
    }

    setIsSaving(true);
    try {
      const result = await updateProviderProfile(formData);

      if (result.success) {
        // Save service locations
        if (data?.profile?.id) {
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
          if (!locResult.success) {
            toast.error(locResult.error || "Failed to save service locations");
            return;
          }

          // Save social links
          const socialLinksToSave = socialLinks.map((link) => ({
            id: link.id,
            platform: link.platform,
            url: link.url,
          }));
          const socialResult = await saveSocialLinks(
            data.profile.id,
            socialLinksToSave
          );
          if (!socialResult.success) {
            toast.error(socialResult.error || "Failed to save social links");
            return;
          }
        }

        toast.success(result.message || "Profile updated successfully");

        const refetchResult = await refetch();

        // Manually sync locations from the refetched data
        if (refetchResult.data?.profile?.service_locations) {
          syncFromServer(refetchResult.data.profile.service_locations);
        }

        // Manually sync social links from the refetched data
        if (refetchResult.data?.profile?.provider_social_links) {
          syncSocialLinksFromServer(
            refetchResult.data.profile.provider_social_links
          );
        }

        // Manually sync gallery images from the refetched data
        const galleryFromServer =
          refetchResult.data?.profile?.provider_gallery_images ?? [];
        syncGalleryFromServer(galleryFromServer);

        // Clear URL params to mark the form as "clean"
        await resetForm();
        resetLocationState();
        resetSocialLinksState();
      } else {
        toast.error(result.error || "Failed to update profile");
      }
    } catch (error) {
      console.error("Error during save:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle cancel
  const handleCancel = async () => {
    await resetForm();
    resetLocationState();
    resetSocialLinksState();
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
    <div className="min-h-screen relative bg-background">
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
            <div id="basic-info-section">
              <AboutBusinessSection
                formData={formData}
                setFormState={setFormState}
                errors={errors}
                isLoading={isLoading}
              />
            </div>
            {/* Basic information */}
            <div id="branding-section">
              <ProfileForm
                formData={formData}
                setFormState={setFormState}
                errors={errors}
                isLoading={isLoading}
              />
            </div>
            {/* Social media links */}
            <div id="social-links-section">
              <SocialLinksSection
                socialLinks={socialLinks}
                onAddLink={addSocialLink}
                onUpdateLink={(id, value) => updateSocialLink(id, "url", value)}
                onRemoveLink={removeSocialLink}
                isLoading={isLoading}
              />
            </div>
            {/* Photo gallery */}
            <div id="gallery-section">
              <GallerySection
                images={galleryImages}
                isUploading={isUploadingGallery}
                isDeleting={isDeletingGallery}
                onUpload={uploadGalleryImage}
                onDelete={deleteGalleryImage}
                isLoading={isLoading}
              />
            </div>
            {/* Service locations */}
            <div id="service-locations-section">
              <ServiceLocationsSection
                locations={locations}
                onAddLocation={addLocation}
                onRemoveLocation={removeLocation}
                onUpdateLocation={updateLocation}
                onSetPrimary={setPrimaryLocation}
                isLoading={isLoading}
                maxServiceRadius={formData.maxServiceRadius}
              />
            </div>
            {/* Packages preview */}
            <PackagesPreviewSection
              packages={samplePackages}
              isLoading={isLoading}
              onManageClick={handleManagePackages}
            />
            {/* Service coverage area */}
            <ServiceCoverageSection
              locations={locations.map((loc) => {
                const cityName = getCityName(loc.city || "");
                const provinceName = getProvinceName(loc.province || "");
                const cityNameUpper = (cityName || "MANILA").toUpperCase();
                const provinceNameUpper = provinceName
                  ? provinceName.toUpperCase()
                  : "";
                return {
                  id: loc.id,
                  city: cityNameUpper,
                  province: provinceNameUpper,
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
            {/* Profile Completeness Widget */}
            <ProfileCompletenessWidget profile={data?.profile} />

            {/* Profile Visibility Section */}
            <div id="availability-section">
              <ProfileVisibilitySection
                value={formData.profileVisible}
                onChange={setProfileVisible}
                isLoading={isLoading}
              />

              {/* Availability Section */}
              <div className="mt-6">
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
        </div>
      </div>

      {/* Floating Footer */}
      <FloatingFooter
        isVisible={isDirty || locationsIsDirty() || socialLinksIsDirty()}
        onSave={handleProfileSave}
        onCancel={handleCancel}
        isSaving={isSaving}
      />
    </div>
  );
}
