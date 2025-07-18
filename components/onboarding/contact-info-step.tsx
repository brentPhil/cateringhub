"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Facebook, Instagram, Globe } from "lucide-react";
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
import { providerContactInfoSchema } from "@/lib/validations";

type ContactInfoFormData = z.infer<typeof providerContactInfoSchema>;

export interface ContactInfoStepProps {
  data: Partial<ContactInfoFormData>;
  onDataChange: (data: Partial<ContactInfoFormData>) => void;
  onValidationChange: (isValid: boolean) => void;
}

export function ContactInfoStep({
  data,
  onDataChange,
  onValidationChange,
}: ContactInfoStepProps) {
  const form = useForm<ContactInfoFormData>({
    resolver: zodResolver(providerContactInfoSchema),
    defaultValues: {
      contactPersonName: data.contactPersonName || "",
      mobileNumber: data.mobileNumber || "",
      socialMediaLinks: {
        facebook: data.socialMediaLinks?.facebook || "",
        instagram: data.socialMediaLinks?.instagram || "",
        website: data.socialMediaLinks?.website || "",
      },
    },
    mode: "onChange",
  });

  const { watch, formState } = form;
  const watchedValues = watch();

  // Update parent component when form data changes
  React.useEffect(() => {
    onDataChange(watchedValues);
  }, [watchedValues, onDataChange]);

  // Update validation state
  React.useEffect(() => {
    onValidationChange(formState.isValid);
  }, [formState.isValid, onValidationChange]);

  return (
    <Form {...form}>
      <div className="space-y-6">
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="contactPersonName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Contact Person Name{" "}
                  <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter the name of the main contact person"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  The name of the person customers should contact for inquiries
                  and bookings.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="mobileNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Mobile Number <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter your mobile number (e.g., +63 912 345 6789)"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Your primary contact number for customer inquiries and
                  bookings. Include country code for international format.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">
              Social Media & Website (Optional)
            </h4>
            <p className="text-sm text-muted-foreground mb-4">
              Add your social media profiles and website to help customers learn
              more about your business.
            </p>
          </div>

          <FormField
            control={form.control}
            name="socialMediaLinks.facebook"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <Facebook className="w-4 h-4" />
                  Facebook Page
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="https://facebook.com/your-page"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Link to your Facebook business page or profile.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="socialMediaLinks.instagram"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <Instagram className="w-4 h-4" />
                  Instagram Profile
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="https://instagram.com/your-profile"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Link to your Instagram business profile.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="socialMediaLinks.website"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Website
                </FormLabel>
                <FormControl>
                  <Input placeholder="https://your-website.com" {...field} />
                </FormControl>
                <FormDescription>
                  Your business website or online portfolio.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="bg-muted/50 rounded-lg p-4">
          <h4 className="font-medium mb-2">Contact Information Usage:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>
              • Your contact details will be visible to customers who want to
              book your services
            </li>
            <li>
              • Social media links help build trust and showcase your work
            </li>
            <li>
              • We&apos;ll never share your information with third parties
              without permission
            </li>
            <li>
              • You can update this information anytime in your profile settings
            </li>
          </ul>
        </div>
      </div>
    </Form>
  );
}
