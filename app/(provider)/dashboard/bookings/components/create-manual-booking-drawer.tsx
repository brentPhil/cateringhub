"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { useCreateManualBooking } from "../hooks/use-create-manual-booking";
import { Loader2 } from "lucide-react";

// Validation schema matching server-side validation
const createManualBookingSchema = z.object({
  customerName: z.string().min(1, "Customer name is required").trim(),
  customerPhone: z.string().optional(),
  customerEmail: z.string().email("Invalid email address").optional().or(z.literal("")),
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
  estimatedBudget: z.coerce.number().nonnegative("Budget must be non-negative").optional().or(z.literal("")),
  specialRequests: z.string().optional(),
  notes: z.string().optional(),
  basePrice: z.coerce.number().nonnegative("Base price must be non-negative").optional().or(z.literal("")),
  status: z.enum(["pending", "confirmed", "in_progress", "completed", "cancelled"]),
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
      status: "pending",
    },
  });

  // Fire telemetry event when drawer opens
  useEffect(() => {
    if (open && typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "manual_booking_opened");
    }
  }, [open]);

  const handleSubmit = async (data: CreateManualBookingFormData) => {
    // Fire telemetry event for submit
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "manual_booking_submit");
    }

    createManualBookingMutation.mutate(
      {
        providerId,
        customerName: data.customerName,
        eventDate: data.eventDate,
        customerPhone: data.customerPhone || undefined,
        customerEmail: data.customerEmail || undefined,
        eventTime: data.eventTime || undefined,
        eventType: data.eventType || undefined,
        guestCount: data.guestCount ? Number(data.guestCount) : undefined,
        venueName: data.venueName || undefined,
        venueAddress: data.venueAddress || undefined,
        estimatedBudget: data.estimatedBudget ? Number(data.estimatedBudget) : undefined,
        specialRequests: data.specialRequests || undefined,
        notes: data.notes || undefined,
        basePrice: data.basePrice ? Number(data.basePrice) : undefined,
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

  const isSubmitting = createManualBookingMutation.isPending;
  const isFormValid = form.formState.isValid;

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
            {/* Customer Name - Required */}
            <FormField
              control={form.control}
              name="customerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="John Doe"
                      {...field}
                      aria-required="true"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Customer Phone */}
            <FormField
              control={form.control}
              name="customerPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer phone</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      placeholder="+63 912 345 6789"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Customer Email */}
            <FormField
              control={form.control}
              name="customerEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="john@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Event Date - Required */}
            <FormField
              control={form.control}
              name="eventDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event date *</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      aria-required="true"
                      min={new Date().toISOString().split("T")[0]}
                    />
                  </FormControl>
                  <FormDescription>
                    Event date must be in the future
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Event Time */}
            <FormField
              control={form.control}
              name="eventTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event time</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Event Type */}
            <FormField
              control={form.control}
              name="eventType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event type</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Wedding, Corporate event, Birthday"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Guest Count */}
            <FormField
              control={form.control}
              name="guestCount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Guest count</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      placeholder="50"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Number of guests expected at the event
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Venue Name */}
            <FormField
              control={form.control}
              name="venueName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Venue name</FormLabel>
                  <FormControl>
                    <Input placeholder="Grand Ballroom" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Venue Address */}
            <FormField
              control={form.control}
              name="venueAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Venue address</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="123 Main St, City, Province"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Base Price */}
            <FormField
              control={form.control}
              name="basePrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Base price</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="10000.00"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Base price for the booking (PHP)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Estimated Budget */}
            <FormField
              control={form.control}
              name="estimatedBudget"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estimated budget</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="15000.00"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Customer&apos;s estimated budget (PHP)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Special Requests */}
            <FormField
              control={form.control}
              name="specialRequests"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Special requests</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any special dietary requirements or requests..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Internal notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Internal notes for staff..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    These notes are only visible to your team
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Status */}
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <FormControl>
                    <Combobox
                      options={statusOptions}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder="Select status"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                disabled={isSubmitting || !isFormValid}
                aria-label="Create manual booking"
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? "Creating..." : "Create booking"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

