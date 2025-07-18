"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { FileUpload } from "@/components/ui/file-upload"
import { providerBusinessInfoSchema } from "@/lib/validations"

type BusinessInfoFormData = z.infer<typeof providerBusinessInfoSchema>

export interface BusinessInfoStepProps {
  data: Partial<BusinessInfoFormData>
  onDataChange: (data: Partial<BusinessInfoFormData>) => void
  onValidationChange: (isValid: boolean) => void
}

export function BusinessInfoStep({
  data,
  onDataChange,
  onValidationChange,
}: BusinessInfoStepProps) {
  const form = useForm<BusinessInfoFormData>({
    resolver: zodResolver(providerBusinessInfoSchema),
    defaultValues: {
      businessName: data.businessName || "",
      businessAddress: data.businessAddress || "",
      logo: data.logo || undefined,
    },
    mode: "onChange",
  })

  const { watch, formState } = form
  const watchedValues = watch()

  // Update parent component when form data changes
  React.useEffect(() => {
    onDataChange(watchedValues)
  }, [watchedValues, onDataChange])

  // Update validation state
  React.useEffect(() => {
    onValidationChange(formState.isValid)
  }, [formState.isValid, onValidationChange])

  return (
    <Form {...form}>
      <div className="space-y-6">
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="businessName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Business Name <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter your catering business name"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  This will be displayed to customers when they view your services.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="businessAddress"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Business Address</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Enter your business address (optional)"
                    className="min-h-[80px]"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Your business location. This helps customers understand your service area.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="logo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Business Logo</FormLabel>
                <FormControl>
                  <FileUpload
                    onFileSelect={(file) => field.onChange(file)}
                    value={field.value}
                    accept="image/*"
                    maxSize={5 * 1024 * 1024} // 5MB
                    placeholder="Upload your business logo"
                    showPreview={true}
                  />
                </FormControl>
                <FormDescription>
                  Upload your business logo to make your profile more professional. 
                  Recommended size: 400x400px or larger, PNG/JPG format.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="bg-muted/50 rounded-lg p-4">
          <h4 className="font-medium mb-2">Why we need this information:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Your business name will be displayed on your public profile</li>
            <li>• Business address helps customers understand your service coverage</li>
            <li>• A professional logo builds trust with potential customers</li>
          </ul>
        </div>
      </div>
    </Form>
  )
}
