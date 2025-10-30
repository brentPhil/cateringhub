"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldDescription, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { VirtualizedCombobox } from "@/components/ui/virtualized-combobox";
import {
  useProvinces,
  useCities,
  useBarangays,
} from "@/lib/hooks/use-philippine-locations";
import { useUpdateLocation, type ServiceLocation } from "../hooks/use-locations";
import { Loader2 } from "lucide-react";

const locationSchema = z.object({
  province: z.string().min(1, "Province is required"),
  city: z.string().min(1, "City is required"),
  barangay: z.string().min(1, "Barangay is required"),
  street_address: z.string().optional(),
  postal_code: z.string().optional(),
  landmark: z.string().optional(),
  service_area_notes: z.string().optional(),
  service_radius: z.coerce.number().min(1).max(500).optional().or(z.literal("")),
  is_primary: z.boolean().default(false),
  daily_capacity: z.coerce.number().min(1).optional().or(z.literal("")),
  max_concurrent_events: z.coerce.number().min(1).optional().or(z.literal("")),
});

type LocationFormData = z.infer<typeof locationSchema>;

interface EditLocationDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  providerId: string;
  location: ServiceLocation;
}

export function EditLocationDrawer({
  open,
  onOpenChange,
  providerId,
  location,
}: EditLocationDrawerProps) {
  const [selectedProvince, setSelectedProvince] = useState<string>(location.province || "");
  const [selectedCity, setSelectedCity] = useState<string>(location.city || "");

  const updateLocationMutation = useUpdateLocation(providerId);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm<LocationFormData>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      province: location.province || "",
      city: location.city || "",
      barangay: location.barangay || "",
      street_address: location.street_address || "",
      postal_code: location.postal_code || "",
      landmark: location.landmark || "",
      service_area_notes: location.service_area_notes || "",
      service_radius: (location.service_radius || "") as unknown as number,
      is_primary: location.is_primary,
      daily_capacity: (location.daily_capacity || "") as unknown as number,
      max_concurrent_events: (location.max_concurrent_events || "") as unknown as number,
    },
  });

  const { data: provinces = [], isLoading: provincesLoading } = useProvinces();
  const { data: cities = [], isLoading: citiesLoading } = useCities(selectedProvince);
  const { data: barangays = [], isLoading: barangaysLoading } = useBarangays(
    selectedProvince,
    selectedCity
  );

  // Reset form when location changes
  useEffect(() => {
    if (location) {
      reset({
        province: location.province || "",
        city: location.city || "",
        barangay: location.barangay || "",
        street_address: location.street_address || "",
        postal_code: location.postal_code || "",
        landmark: location.landmark || "",
        service_area_notes: location.service_area_notes || "",
        service_radius: (location.service_radius || "") as unknown as number,
        is_primary: location.is_primary,
        daily_capacity: (location.daily_capacity || "") as unknown as number,
        max_concurrent_events: (location.max_concurrent_events || "") as unknown as number,
      });
      setSelectedProvince(location.province || "");
      setSelectedCity(location.city || "");
    }
  }, [location, reset]);

  const provinceOptions = provinces.map((p) => ({
    value: p.code,
    label: p.name,
  }));

  const cityOptions = cities.map((c) => ({
    value: c.code,
    label: c.name,
  }));

  const barangayOptions = barangays.map((b) => ({
    value: b.name,
    label: b.name,
  }));

  const onSubmit = async (data: LocationFormData) => {
    try {
      await updateLocationMutation.mutateAsync({
        locationId: location.id,
        data: {
          province: data.province,
          city: data.city,
          barangay: data.barangay,
          street_address: data.street_address || "",
          postal_code: data.postal_code || "",
          landmark: data.landmark || "",
          service_area_notes: data.service_area_notes || "",
          service_radius: data.service_radius ? Number(data.service_radius) : undefined,
          is_primary: data.is_primary,
          daily_capacity: data.daily_capacity ? Number(data.daily_capacity) : undefined,
          max_concurrent_events: data.max_concurrent_events ? Number(data.max_concurrent_events) : undefined,
        },
      });
      onOpenChange(false);
    } catch (error) {
      // Error is handled by the mutation
      console.error("Failed to update location:", error);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit service location</SheetTitle>
          <SheetDescription>
            Update the details of this service location.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-6">
          {/* Province */}
          <Field>
            <FieldLabel required>Province</FieldLabel>
            <Controller
              name="province"
              control={control}
              render={({ field }) => (
                <VirtualizedCombobox
                  options={provinceOptions}
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value);
                    setSelectedProvince(value);
                    setValue("city", "");
                    setValue("barangay", "");
                    setSelectedCity("");
                  }}
                  placeholder="Select province"
                  searchPlaceholder="Search provinces..."
                  emptyText="No province found"
                  disabled={provincesLoading}
                />
              )}
            />
            <FieldError>{errors.province?.message}</FieldError>
          </Field>

          {/* City */}
          <Field>
            <FieldLabel required>City / Municipality</FieldLabel>
            <Controller
              name="city"
              control={control}
              render={({ field }) => (
                <VirtualizedCombobox
                  options={cityOptions}
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value);
                    setSelectedCity(value);
                    setValue("barangay", "");
                  }}
                  placeholder="Select city"
                  searchPlaceholder="Search cities..."
                  emptyText="No city found"
                  disabled={!selectedProvince || citiesLoading}
                />
              )}
            />
            <FieldError>{errors.city?.message}</FieldError>
          </Field>

          {/* Barangay */}
          <Field>
            <FieldLabel required>Barangay</FieldLabel>
            <Controller
              name="barangay"
              control={control}
              render={({ field }) => (
                <VirtualizedCombobox
                  options={barangayOptions}
                  value={field.value}
                  onValueChange={field.onChange}
                  placeholder="Select barangay"
                  searchPlaceholder="Search barangays..."
                  emptyText="No barangay found"
                  disabled={!selectedCity || barangaysLoading}
                />
              )}
            />
            <FieldError>{errors.barangay?.message}</FieldError>
          </Field>

          {/* Street Address */}
          <Field>
            <FieldLabel>Street address</FieldLabel>
            <Controller
              name="street_address"
              control={control}
              render={({ field }) => (
                <Input {...field} placeholder="123 Main Street" />
              )}
            />
            <FieldError>{errors.street_address?.message}</FieldError>
          </Field>

          {/* Landmark */}
          <Field>
            <FieldLabel>Landmark</FieldLabel>
            <Controller
              name="landmark"
              control={control}
              render={({ field }) => (
                <Input {...field} placeholder="Near City Hall" />
              )}
            />
            <FieldDescription>
              A nearby landmark to help customers find your location
            </FieldDescription>
            <FieldError>{errors.landmark?.message}</FieldError>
          </Field>

          {/* Service Radius */}
          <Field>
            <FieldLabel>Service radius (km)</FieldLabel>
            <Controller
              name="service_radius"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  type="number"
                  min="1"
                  max="500"
                  placeholder="50"
                />
              )}
            />
            <FieldDescription>
              Maximum distance you can serve from this location
            </FieldDescription>
            <FieldError>{errors.service_radius?.message}</FieldError>
          </Field>

          {/* Daily Capacity */}
          <Field>
            <FieldLabel>Daily capacity</FieldLabel>
            <Controller
              name="daily_capacity"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  type="number"
                  min="1"
                  placeholder="10"
                />
              )}
            />
            <FieldDescription>
              Maximum number of events per day from this location
            </FieldDescription>
            <FieldError>{errors.daily_capacity?.message}</FieldError>
          </Field>

          {/* Max Concurrent Events */}
          <Field>
            <FieldLabel>Max concurrent events</FieldLabel>
            <Controller
              name="max_concurrent_events"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  type="number"
                  min="1"
                  placeholder="3"
                />
              )}
            />
            <FieldDescription>
              Maximum number of simultaneous events
            </FieldDescription>
            <FieldError>{errors.max_concurrent_events?.message}</FieldError>
          </Field>

          {/* Service Area Notes */}
          <Field>
            <FieldLabel>Service area notes</FieldLabel>
            <Controller
              name="service_area_notes"
              control={control}
              render={({ field }) => (
                <Textarea
                  {...field}
                  placeholder="Additional information about this service area..."
                  rows={3}
                />
              )}
            />
            <FieldError>{errors.service_area_notes?.message}</FieldError>
          </Field>

          {/* Is Primary */}
          <Field>
            <div className="flex items-center space-x-2">
              <Controller
                name="is_primary"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    id="is_primary"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <FieldLabel htmlFor="is_primary" className="!mt-0">
                Set as primary location
              </FieldLabel>
            </div>
            <FieldDescription>
              The primary location will be used as the default for new teams
            </FieldDescription>
            <FieldError>{errors.is_primary?.message}</FieldError>
          </Field>

          <SheetFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

