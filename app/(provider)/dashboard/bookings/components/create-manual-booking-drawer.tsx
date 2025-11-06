"use client";

import { useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Form } from "@/components/ui/form";
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { useCreateManualBooking } from "../hooks/use-create-manual-booking";
import { useTeams } from "../../teams/hooks/use-teams";
import { useProviderProfile } from "../../profile/hooks/use-provider-profile";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { Loader2 } from "lucide-react";

// Validation schema matching server-side validation
const createManualBookingSchema = z.object({
  customerName: z.string().min(1, "Customer name is required").trim(),
  customerPhone: z.string().optional(),
  customerEmail: z
    .string()
    .email("Invalid email address")
    .optional()
    .or(z.literal("")),
  eventDate: z.string().min(1, "Event date is required"),
  eventTime: z.string().optional(),
  eventType: z.string().optional(),
  guestCount: z.coerce
    .number()
    .int()
    .positive("Guest count must be greater than zero")
    .optional()
    .or(z.literal("")),
  venueName: z.string().optional(),
  venueAddress: z.string().optional(),
  estimatedBudget: z.coerce
    .number()
    .nonnegative("Budget must be non-negative")
    .optional()
    .or(z.literal("")),
  specialRequests: z.string().optional(),
  notes: z.string().optional(),
  basePrice: z.coerce
    .number()
    .nonnegative("Base price must be non-negative")
    .optional()
    .or(z.literal("")),
  serviceLocationId: z.string().optional(),
  teamId: z.string().optional(),
  status: z.enum([
    "pending",
    "confirmed",
    "in_progress",
    "completed",
    "cancelled",
  ]),
});

type CreateManualBookingFormData = z.infer<typeof createManualBookingSchema>;

interface CreateManualBookingDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  providerId: string;
}

export function CreateManualBookingDrawer({
  open,
  onOpenChange,
  providerId,
}: CreateManualBookingDrawerProps) {
  const createManualBookingMutation = useCreateManualBooking();

  // Fetch active teams for the provider
  const { data: teams = [] } = useTeams(providerId, { status: "active" });
  // Provider service locations from profile (used to filter teams)
  const { data: profileData } = useProviderProfile();

  const form = useForm<CreateManualBookingFormData>({
    resolver: zodResolver(createManualBookingSchema),
    defaultValues: {
      customerName: "",
      customerPhone: "",
      customerEmail: "",
      eventDate: "",
      eventTime: "",
      eventType: "",
      guestCount: "" as unknown as number,
      venueName: "",
      venueAddress: "",
      estimatedBudget: "" as unknown as number,
      specialRequests: "",
      notes: "",
      basePrice: "" as unknown as number,
      serviceLocationId: "",
      teamId: "",
      status: "pending",
    },
  });

  const handleSubmit = async (data: CreateManualBookingFormData) => {
    createManualBookingMutation.mutate(
      {
        providerId,
        customerName: data.customerName,
        eventDate: data.eventDate,
        serviceLocationId: data.serviceLocationId || undefined,
        customerPhone: data.customerPhone || undefined,
        customerEmail: data.customerEmail || undefined,
        eventTime: data.eventTime || undefined,
        eventType: data.eventType || undefined,
        guestCount: data.guestCount ? Number(data.guestCount) : undefined,
        venueName: data.venueName || undefined,
        venueAddress: data.venueAddress || undefined,
        estimatedBudget: data.estimatedBudget
          ? Number(data.estimatedBudget)
          : undefined,
        specialRequests: data.specialRequests || undefined,
        notes: data.notes || undefined,
        basePrice: data.basePrice ? Number(data.basePrice) : undefined,
        teamId: data.teamId || undefined,
        status: data.status,
      },
      {
        onSuccess: () => {
          form.reset();
          onOpenChange(false);
        },
      }
    );
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      form.reset();
    }
    onOpenChange(newOpen);
  };

  // Status options for Combobox
  const statusOptions: ComboboxOption[] = [
    { value: "pending", label: "Pending" },
    { value: "confirmed", label: "Confirmed" },
    { value: "in_progress", label: "In progress" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
  ];

  // Watch selected service location to filter teams
  const selectedLocationId = form.watch("serviceLocationId");

  // Fetch teams filtered by service location
  const { data: filteredTeams = [] } = useTeams(providerId, {
    status: "active",
    service_location_id: selectedLocationId || undefined,
  });

  // Team options for Combobox (filtered by location)
  const teamOptions: ComboboxOption[] = useMemo(() => {
    const options: ComboboxOption[] = [
      { value: "", label: "No team (unassigned)" },
    ];

    (filteredTeams || teams).forEach((team) => {
      options.push({ value: team.id, label: team.name });
    });

    return options;
  }, [filteredTeams, teams]);

  const isSubmitting = createManualBookingMutation.isPending;
  const isFormValid = form.formState.isValid;

  // Capacity info for selected team on selected date
  type CapacityInfo = {
    team_id: string;
    team_name: string;
    daily_capacity: number | null;
    max_concurrent_events: number | null;
    bookings_on_date: number;
    remaining_capacity: number | null;
  } | null;

  const selectedTeamId = form.watch("teamId") || "";
  const eventDate = form.watch("eventDate") || "";
  const { data: capacityInfo } = useQuery<CapacityInfo>({
    queryKey: ["create-booking-capacity", selectedTeamId, eventDate, open],
    queryFn: async () => {
      if (!selectedTeamId || !eventDate) return null;
      const supabase = createClient();
      const { data, error } = await supabase.rpc("get_team_capacity_info", {
        p_team_id: selectedTeamId,
        p_event_date: eventDate,
      });
      if (error) return null;
      const first = (data as unknown as CapacityInfo[] | null)?.[0] || null;
      return first;
    },
    enabled: !!selectedTeamId && !!eventDate && open,
    staleTime: 10_000,
  });

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="sm:max-w-[600px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Create manual booking</SheetTitle>
          <SheetDescription>
            Add a new booking manually for your catering service
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4 mt-6"
          >
            {/* Service Location (for filtering teams) */}
            <Controller
              control={form.control}
              name="serviceLocationId"
              render={({ field }) => {
                const serviceLocations = (profileData?.profile?.service_locations || []) as Array<any>;
                const locationOptions: ComboboxOption[] = serviceLocations.map((loc) => {
                  const parts = [loc.barangay, loc.city, loc.province].filter(Boolean);
                  const label = parts.join(", ") || "Unknown location";
                  return {
                    value: loc.id,
                    label: loc.is_primary ? `${label} (Primary)` : label,
                  };
                });
                return (
                  <Field>
                    <FieldLabel htmlFor="serviceLocationId">Service location</FieldLabel>
                    <Combobox
                      options={locationOptions}
                      value={field.value || ""}
                      onValueChange={field.onChange}
                      placeholder={
                        serviceLocations.length ? "Select a location (optional)" : "No locations configured"
                      }
                    />
                    <FieldDescription>
                      Selecting a location filters the teams list to those serving that area
                    </FieldDescription>
                  </Field>
                );
              }}
            />
            {/* Customer Name - Required */}
            <Controller
              control={form.control}
              name="customerName"
              render={({ field, fieldState }) => (
                <Field data-invalid={!!fieldState.error}>
                  <FieldLabel htmlFor="customerName">
                    Customer name *
                  </FieldLabel>
                  <Input
                    id="customerName"
                    placeholder="John Doe"
                    {...field}
                    aria-required="true"
                    aria-invalid={!!fieldState.error}
                  />
                  {fieldState.error && (
                    <FieldError>{fieldState.error.message}</FieldError>
                  )}
                </Field>
              )}
            />

            {/* Customer Phone */}
            <Controller
              control={form.control}
              name="customerPhone"
              render={({ field, fieldState }) => (
                <Field data-invalid={!!fieldState.error}>
                  <FieldLabel htmlFor="customerPhone">
                    Customer phone
                  </FieldLabel>
                  <Input
                    id="customerPhone"
                    type="tel"
                    placeholder="+63 912 345 6789"
                    {...field}
                    aria-invalid={!!fieldState.error}
                  />
                  {fieldState.error && (
                    <FieldError>{fieldState.error.message}</FieldError>
                  )}
                </Field>
              )}
            />

            {/* Customer Email */}
            <Controller
              control={form.control}
              name="customerEmail"
              render={({ field, fieldState }) => (
                <Field data-invalid={!!fieldState.error}>
                  <FieldLabel htmlFor="customerEmail">
                    Customer email
                  </FieldLabel>
                  <Input
                    id="customerEmail"
                    type="email"
                    placeholder="john@example.com"
                    {...field}
                    aria-invalid={!!fieldState.error}
                  />
                  {fieldState.error && (
                    <FieldError>{fieldState.error.message}</FieldError>
                  )}
                </Field>
              )}
            />

            {/* Event Date - Required */}
            <Controller
              control={form.control}
              name="eventDate"
              render={({ field, fieldState }) => (
                <Field data-invalid={!!fieldState.error}>
                  <FieldLabel htmlFor="eventDate">Event date *</FieldLabel>
                  <Input
                    id="eventDate"
                    type="date"
                    {...field}
                    aria-required="true"
                    aria-invalid={!!fieldState.error}
                    min={new Date().toISOString().split("T")[0]}
                  />
                  <FieldDescription>
                    Event date must be in the future
                  </FieldDescription>
                  {fieldState.error && (
                    <FieldError>{fieldState.error.message}</FieldError>
                  )}
                </Field>
              )}
            />

            {/* Event Time */}
            <Controller
              control={form.control}
              name="eventTime"
              render={({ field, fieldState }) => (
                <Field data-invalid={!!fieldState.error}>
                  <FieldLabel htmlFor="eventTime">Event time</FieldLabel>
                  <Input
                    id="eventTime"
                    type="time"
                    {...field}
                    aria-invalid={!!fieldState.error}
                  />
                  {fieldState.error && (
                    <FieldError>{fieldState.error.message}</FieldError>
                  )}
                </Field>
              )}
            />

            {/* Event Type */}
            <Controller
              control={form.control}
              name="eventType"
              render={({ field, fieldState }) => (
                <Field data-invalid={!!fieldState.error}>
                  <FieldLabel htmlFor="eventType">Event type</FieldLabel>
                  <Input
                    id="eventType"
                    placeholder="e.g., Wedding, Corporate event, Birthday"
                    {...field}
                    aria-invalid={!!fieldState.error}
                  />
                  {fieldState.error && (
                    <FieldError>{fieldState.error.message}</FieldError>
                  )}
                </Field>
              )}
            />

            {/* Guest Count */}
            <Controller
              control={form.control}
              name="guestCount"
              render={({ field, fieldState }) => (
                <Field data-invalid={!!fieldState.error}>
                  <FieldLabel htmlFor="guestCount">Guest count</FieldLabel>
                  <Input
                    id="guestCount"
                    type="number"
                    min="1"
                    placeholder="50"
                    {...field}
                    aria-invalid={!!fieldState.error}
                  />
                  <FieldDescription>
                    Number of guests expected at the event
                  </FieldDescription>
                  {fieldState.error && (
                    <FieldError>{fieldState.error.message}</FieldError>
                  )}
                </Field>
              )}
            />

            {/* Venue Name */}
            <Controller
              control={form.control}
              name="venueName"
              render={({ field, fieldState }) => (
                <Field data-invalid={!!fieldState.error}>
                  <FieldLabel htmlFor="venueName">Venue name</FieldLabel>
                  <Input
                    id="venueName"
                    placeholder="Grand Ballroom"
                    {...field}
                    aria-invalid={!!fieldState.error}
                  />
                  {fieldState.error && (
                    <FieldError>{fieldState.error.message}</FieldError>
                  )}
                </Field>
              )}
            />

            {/* Venue Address */}
            <Controller
              control={form.control}
              name="venueAddress"
              render={({ field, fieldState }) => (
                <Field data-invalid={!!fieldState.error}>
                  <FieldLabel htmlFor="venueAddress">Venue address</FieldLabel>
                  <Textarea
                    id="venueAddress"
                    placeholder="123 Main St, City, Province"
                    rows={2}
                    {...field}
                    aria-invalid={!!fieldState.error}
                  />
                  {fieldState.error && (
                    <FieldError>{fieldState.error.message}</FieldError>
                  )}
                </Field>
              )}
            />

            {/* Base Price */}
            <Controller
              control={form.control}
              name="basePrice"
              render={({ field, fieldState }) => (
                <Field data-invalid={!!fieldState.error}>
                  <FieldLabel htmlFor="basePrice">Base price</FieldLabel>
                  <Input
                    id="basePrice"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="10000.00"
                    {...field}
                    aria-invalid={!!fieldState.error}
                  />
                  <FieldDescription>
                    Base price for the booking (PHP)
                  </FieldDescription>
                  {fieldState.error && (
                    <FieldError>{fieldState.error.message}</FieldError>
                  )}
                </Field>
              )}
            />

            {/* Estimated Budget */}
            <Controller
              control={form.control}
              name="estimatedBudget"
              render={({ field, fieldState }) => (
                <Field data-invalid={!!fieldState.error}>
                  <FieldLabel htmlFor="estimatedBudget">
                    Estimated budget
                  </FieldLabel>
                  <Input
                    id="estimatedBudget"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="15000.00"
                    {...field}
                    aria-invalid={!!fieldState.error}
                  />
                  <FieldDescription>
                    Customer&apos;s estimated budget (PHP)
                  </FieldDescription>
                  {fieldState.error && (
                    <FieldError>{fieldState.error.message}</FieldError>
                  )}
                </Field>
              )}
            />

            {/* Special Requests */}
            <Controller
              control={form.control}
              name="specialRequests"
              render={({ field, fieldState }) => (
                <Field data-invalid={!!fieldState.error}>
                  <FieldLabel htmlFor="specialRequests">
                    Special requests
                  </FieldLabel>
                  <Textarea
                    id="specialRequests"
                    placeholder="Any special dietary requirements or requests..."
                    rows={3}
                    {...field}
                  />
                  <FieldDescription>
                    Any special dietary requirements or requests
                  </FieldDescription>
                  {fieldState.error && (
                    <FieldError>{fieldState.error.message}</FieldError>
                  )}
                </Field>
              )}
            />

            {/* Notes */}
            <Controller
              control={form.control}
              name="notes"
              render={({ field, fieldState }) => (
                <Field data-invalid={!!fieldState.error}>
                  <FieldLabel htmlFor="notes">Internal notes</FieldLabel>
                  <Textarea
                    id="notes"
                    placeholder="Internal notes for staff..."
                    rows={3}
                    {...field}
                  />
                  <FieldDescription>
                    These notes are only visible to your team
                  </FieldDescription>
                  {fieldState.error && (
                    <FieldError>{fieldState.error.message}</FieldError>
                  )}
                </Field>
              )}
            />

            {/* Status */}
            <Controller
              control={form.control}
              name="status"
              render={({ field, fieldState }) => (
                <Field data-invalid={!!fieldState.error}>
                  <FieldLabel htmlFor="status">Status</FieldLabel>
                  <Combobox
                    options={statusOptions}
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder="Select status"
                  />
                  <FieldDescription>
                    The initial status of the booking
                  </FieldDescription>
                  {fieldState.error && (
                    <FieldError>{fieldState.error.message}</FieldError>
                  )}
                </Field>
              )}
            />

            {/* Team Assignment */}
            <Controller
              control={form.control}
              name="teamId"
              render={({ field, fieldState }) => (
                <Field data-invalid={!!fieldState.error}>
                  <FieldLabel htmlFor="teamId">Assign to team</FieldLabel>
                  <Combobox
                    options={teamOptions}
                    value={field.value || ""}
                    onValueChange={field.onChange}
                    placeholder={selectedLocationId ? "Select a team (optional)" : "Select a location to filter teams (optional)"}
                  />
                  <FieldDescription>
                    Optionally assign this booking to an operational team
                  </FieldDescription>
                  {fieldState.error && (
                    <FieldError>{fieldState.error.message}</FieldError>
                  )}
                </Field>
              )}
            />

            {selectedTeamId && capacityInfo && capacityInfo.daily_capacity !== null && (
              <Alert variant={capacityInfo.remaining_capacity !== null && capacityInfo.remaining_capacity <= 0 ? "destructive" : "default"}>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {capacityInfo.team_name}: {capacityInfo.bookings_on_date} / {capacityInfo.daily_capacity} events booked on {eventDate}.
                  {" "}
                  {capacityInfo.remaining_capacity !== null && (
                    capacityInfo.remaining_capacity <= 0 ? (
                      <Badge variant="destructive" className="ml-2">At capacity</Badge>
                    ) : (
                      <Badge variant="secondary" className="ml-2">{capacityInfo.remaining_capacity} remaining</Badge>
                    )
                  )}
                </AlertDescription>
              </Alert>
            )}

            <SheetFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  isSubmitting ||
                  !isFormValid ||
                  (!!selectedTeamId && !!capacityInfo && capacityInfo.remaining_capacity !== null && capacityInfo.remaining_capacity <= 0)
                }
                aria-label="Create manual booking"
              >
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isSubmitting ? "Creating..." : "Create booking"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
