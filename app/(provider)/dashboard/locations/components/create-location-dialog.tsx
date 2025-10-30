"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useCreateLocation } from "../hooks/use-locations";
import { Loader2 } from "lucide-react";

const locationSchema = z.object({
  province: z.string().min(1, "Province is required"),
  city: z.string().min(1, "City is required"),
  barangay: z.string().min(1, "Barangay is required"),
  street_address: z.string().optional(),
  postal_code: z.string().optional(),
  landmark: z.string().optional(),
  service_area_notes: z.string().optional(),
  service_radius: z.coerce.number().min(1).max(500).optional(),
  is_primary: z.boolean().default(false),
  daily_capacity: z.coerce.number().min(1).optional(),
  max_concurrent_events: z.coerce.number().min(1).optional(),
});

type LocationFormData = z.infer<typeof locationSchema>;

interface CreateLocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  providerId: string;
}

export function CreateLocationDialog({
  open,
  onOpenChange,
  providerId,
}: CreateLocationDialogProps) {
  const [selectedProvince, setSelectedProvince] = useState<string>("");
  const [selectedCity, setSelectedCity] = useState<string>("");

  const createLocationMutation = useCreateLocation(providerId);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<LocationFormData>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      province: "",
      city: "",
      barangay: "",
      street_address: "",
      postal_code: "",
      landmark: "",
      service_area_notes: "",
      service_radius: 50,
      is_primary: false,
      daily_capacity: undefined,
      max_concurrent_events: undefined,
    },
  });

  const { data: provinces = [], isLoading: provincesLoading } = useProvinces();
  const { data: cities = [], isLoading: citiesLoading } = useCities(selectedProvince);
  const { data: barangays = [], isLoading: barangaysLoading } = useBarangays(
    selectedProvince,
    selectedCity
  );

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
      await createLocationMutation.mutateAsync(data);
      reset();
      setSelectedProvince("");
      setSelectedCity("");
      onOpenChange(false);
    } catch (error) {
      // Error is handled by the mutation
      console.error("Failed to create location:", error);
    }
  };

  const handleCancel = () => {
    reset();
    setSelectedProvince("");
    setSelectedCity("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add service location</DialogTitle>
          <DialogDescription>
            Add a new service location for your catering business.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create location
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

