"use client";

import * as React from "react";
import { Plus, Trash2, Star, MapPin, Info } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ServiceLocationsSectionProps {
  locations: ServiceLocationFormData[];
  onAddLocation: () => void;
  onRemoveLocation: (id: string) => void;
  onUpdateLocation: (
    id: string,
    field: keyof ServiceLocationFormData,
    value: string | number | boolean | null
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

      {locations.length === 0 ? (
        <Alert>
          <MapPin className="h-4 w-4" />
          <AlertDescription>
            No service locations added yet. Click &quot;Add location&quot; to
            set up your first service area.
          </AlertDescription>
        </Alert>
      ) : (
        <TooltipProvider>
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
          </Accordion>
        </TooltipProvider>
      )}
    </section>
  );
}

interface LocationAccordionItemProps {
  location: ServiceLocationFormData;
  index: number;
  canRemove: boolean;
  onRemove: () => void;
  onUpdate: (
    field: keyof ServiceLocationFormData,
    value: string | number | boolean | null
  ) => void;
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
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);

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
    <>
      <AccordionItem
        value={location.id}
        className="border border-border rounded-lg"
      >
        <AccordionTrigger className="px-4 py-2 hover:no-underline">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              {location.isPrimary && (
                <Badge variant="secondary" className="gap-1">
                  <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                  Primary
                </Badge>
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
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      role="button"
                      tabIndex={0}
                      aria-label="Set as primary location"
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
                    >
                      <Star className="w-4 h-4" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Set as primary location</p>
                  </TooltipContent>
                </Tooltip>
              )}
              {canRemove && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      role="button"
                      tabIndex={0}
                      aria-label="Remove location"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDeleteDialog(true);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowDeleteDialog(true);
                        }
                      }}
                      className={cn(
                        buttonVariants({ variant: "ghost", size: "icon" }),
                        "text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                      )}
                    >
                      <Trash2 className="w-4 h-4" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Remove location</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4">
          <div className="space-y-4 pt-2">
            {location.isPrimary && (
              <Alert className="bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900">
                <Info className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                  Primary location - This will be displayed as your main
                  business address
                </AlertDescription>
              </Alert>
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
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor={`radius-${location.id}`}>Service radius</Label>
                <Badge variant="outline" className="font-mono">
                  {location.serviceRadius} km
                </Badge>
              </div>
              <Slider
                id={`radius-${location.id}`}
                value={[location.serviceRadius]}
                onValueChange={(value) => onUpdate("serviceRadius", value[0])}
                max={maxServiceRadius ?? 100}
                min={1}
                step={5}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Maximum distance you can travel from this location for events
              </p>
            </div>

            <Separator />

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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove location?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this service location? This action
              cannot be undone.
              {cityName && (
                <span className="block mt-2 font-medium text-foreground">
                  {cityName}
                  {barangayName && `, ${barangayName}`}
                  {provinceName && `, ${provinceName}`}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button variant="destructive" onClick={onRemove}>
                Remove location
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
