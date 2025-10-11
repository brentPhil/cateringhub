"use client";

import * as React from "react";
import { Plus, Trash2, Star } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { VirtualizedCombobox } from "@/components/ui/virtualized-combobox";
import {
  useProvinces,
  useCities,
  useBarangays,
} from "@/lib/hooks/use-philippine-locations";
import { Skeleton } from "@/components/ui/skeleton";
import type { ServiceLocationFormData } from "../hooks/use-service-locations";
import { Slider } from "@/components/ui/slider";

interface ServiceLocationsSectionProps {
  locations: ServiceLocationFormData[];
  onAddLocation: () => void;
  onRemoveLocation: (id: string) => void;
  onUpdateLocation: (
    id: string,
    field: keyof ServiceLocationFormData,
    value: any
  ) => void;
  onSetPrimary: (id: string) => void;
  isLoading?: boolean;
  maxServiceRadius?: number;
}

export function ServiceLocationsSection({
  locations,
  onAddLocation,
  onRemoveLocation,
  onUpdateLocation,
  onSetPrimary,
  isLoading,
  maxServiceRadius,
}: ServiceLocationsSectionProps) {
  if (isLoading) {
    return (
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Service locations</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your service locations and coverage areas
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onAddLocation}>
          <Plus className="w-4 h-4 mr-2" />
          Add location
        </Button>
      </div>

      <Accordion type="single" collapsible className="space-y-2">
        {locations.map((location, index) => (
          <LocationAccordionItem
            key={location.id}
            location={location}
            index={index}
            canRemove={locations.length > 1}
            onRemove={() => onRemoveLocation(location.id)}
            onUpdate={(field, value) =>
              onUpdateLocation(location.id, field, value)
            }
            onSetPrimary={() => onSetPrimary(location.id)}
            maxServiceRadius={maxServiceRadius}
          />
        ))}
        <div />
      </Accordion>
    </section>
  );
}

interface LocationAccordionItemProps {
  location: ServiceLocationFormData;
  index: number;
  canRemove: boolean;
  onRemove: () => void;
  onUpdate: (field: keyof ServiceLocationFormData, value: any) => void;
  onSetPrimary: () => void;
  maxServiceRadius?: number;
}

function LocationAccordionItem({
  location,
  index,
  canRemove,
  onRemove,
  onUpdate,
  onSetPrimary,
  maxServiceRadius,
}: LocationAccordionItemProps) {
  // Fetch location data for cascading dropdowns
  const { provinces, isLoading: provincesLoading } = useProvinces();
  const { cities, isLoading: citiesLoading } = useCities(
    location.province || null
  );
  const { barangays, isLoading: barangaysLoading } = useBarangays(
    location.city || null
  );

  // Get display names for the header
  const provinceName =
    provinces.find((p) => p.value === location.province)?.label || "";
  const cityName = cities.find((c) => c.value === location.city)?.label || "";
  const barangayName =
    barangays.find((b) => b.value === location.barangay)?.label || "";

  // Reset city and barangay when province changes
  React.useEffect(() => {
    if (location.province && location.city) {
      const isValidCity = cities.some((c) => c.value === location.city);
      if (!isValidCity) {
        onUpdate("city", "");
        onUpdate("barangay", "");
      }
    }
  }, [location.province, location.city, cities, onUpdate]);

  // Reset barangay when city changes
  React.useEffect(() => {
    if (location.city && location.barangay) {
      const isValidBarangay = barangays.some(
        (b) => b.value === location.barangay
      );
      if (!isValidBarangay) {
        onUpdate("barangay", "");
      }
    }
  }, [location.city, location.barangay, barangays, onUpdate]);

  return (
    <AccordionItem
      value={location.id}
      className="border border-border rounded-lg"
    >
      <AccordionTrigger className="px-4 py-2 hover:no-underline">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            {location.isPrimary && (
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            )}
            <span className="text-sm font-medium">
              Location {index + 1}
              {cityName && barangayName && (
                <span className="text-muted-foreground font-normal">
                  {" "}
                  - {cityName}, {barangayName}
                  {provinceName && `, ${provinceName}`}
                </span>
              )}
            </span>
          </div>
          <div
            className="flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            {!location.isPrimary && (
              <div
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  onSetPrimary();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    onSetPrimary();
                  }
                }}
                className={cn(
                  buttonVariants({ variant: "ghost", size: "icon" }),
                  "text-muted-foreground hover:text-yellow-600 cursor-pointer"
                )}
                title="Set as primary location"
              >
                <Star className="w-4 h-4" />
              </div>
            )}
            {canRemove && (
              <div
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    onRemove();
                  }
                }}
                className={cn(
                  buttonVariants({ variant: "ghost", size: "icon" }),
                  "text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                )}
                title="Remove location"
              >
                <Trash2 className="w-4 h-4" />
              </div>
            )}
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-4">
        <div className="space-y-4 pt-2">
          {location.isPrimary && (
            <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-md p-3">
              <p className="text-sm text-yellow-800 dark:text-yellow-200 flex items-center gap-2">
                <Star className="w-4 h-4 fill-yellow-600 text-yellow-600" />
                Primary location - This will be displayed as your main business
                address
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`province-${location.id}`}>
                Province <span className="text-destructive">*</span>
              </Label>
              <VirtualizedCombobox
                options={provinces}
                value={location.province}
                onValueChange={(value) => onUpdate("province", value)}
                placeholder="Select province"
                searchPlaceholder="Search provinces..."
                emptyMessage={
                  provincesLoading
                    ? "Loading provinces..."
                    : "No province found"
                }
                disabled={provincesLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`city-${location.id}`}>
                City <span className="text-destructive">*</span>
              </Label>
              <VirtualizedCombobox
                options={cities}
                value={location.city}
                onValueChange={(value) => onUpdate("city", value)}
                placeholder={
                  location.province ? "Select city" : "Select province first"
                }
                searchPlaceholder="Search cities..."
                emptyMessage={
                  citiesLoading
                    ? "Loading cities..."
                    : location.province
                    ? "No city found"
                    : "Please select a province first"
                }
                disabled={!location.province || citiesLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`barangay-${location.id}`}>
                Barangay <span className="text-destructive">*</span>
              </Label>
              <VirtualizedCombobox
                options={barangays}
                value={location.barangay}
                onValueChange={(value) => onUpdate("barangay", value)}
                placeholder={
                  location.city ? "Select barangay" : "Select city first"
                }
                searchPlaceholder="Search barangays..."
                emptyMessage={
                  barangaysLoading
                    ? "Loading barangays..."
                    : location.city
                    ? "No barangay found"
                    : "Please select a city first"
                }
                disabled={!location.city || barangaysLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`postal-${location.id}`}>Postal code</Label>
              <Input
                id={`postal-${location.id}`}
                placeholder="Enter postal code"
                value={location.postalCode}
                onChange={(e) => onUpdate("postalCode", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`radius-${location.id}`}>
                Service radius (km)
              </Label>
              <Slider
                value={[location.serviceRadius]}
                onValueChange={(value) => onUpdate("serviceRadius", value[0])}
                max={maxServiceRadius ?? 100}
                min={1}
                step={5}
                className="w-full"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`street-${location.id}`}>Street address</Label>
            <Input
              id={`street-${location.id}`}
              placeholder="Enter street address (optional)"
              value={location.streetAddress}
              onChange={(e) => onUpdate("streetAddress", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`landmark-${location.id}`}>Landmark</Label>
            <Input
              id={`landmark-${location.id}`}
              placeholder="Nearby landmark for easier navigation (optional)"
              value={location.landmark}
              onChange={(e) => onUpdate("landmark", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`notes-${location.id}`}>Service area notes</Label>
            <Textarea
              id={`notes-${location.id}`}
              placeholder="Any special notes about serving this area (optional)"
              value={location.notes}
              onChange={(e) => onUpdate("notes", e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
