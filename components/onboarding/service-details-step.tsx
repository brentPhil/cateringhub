"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Plus } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { FileUpload } from "@/components/ui/file-upload";
import { providerServiceDetailsSchema } from "@/lib/validations";

type ServiceDetailsFormData = z.infer<typeof providerServiceDetailsSchema>;

export interface ServiceDetailsStepProps {
  data: Partial<ServiceDetailsFormData>;
  onDataChange: (data: Partial<ServiceDetailsFormData>) => void;
  onValidationChange: (isValid: boolean) => void;
}

export function ServiceDetailsStep({
  data,
  onDataChange,
  onValidationChange,
}: ServiceDetailsStepProps) {
  const [newServiceArea, setNewServiceArea] = React.useState("");

  const form = useForm<ServiceDetailsFormData>({
    resolver: zodResolver(providerServiceDetailsSchema),
    defaultValues: {
      description: data.description || "",
      serviceAreas: data.serviceAreas || [],
      sampleMenu: data.sampleMenu || undefined,
    },
    mode: "onChange",
  });

  const { watch, formState, setValue, getValues } = form;
  const watchedValues = watch();

  // Update parent component when form data changes
  React.useEffect(() => {
    onDataChange(watchedValues);
  }, [watchedValues, onDataChange]);

  // Update validation state
  React.useEffect(() => {
    onValidationChange(formState.isValid);
  }, [formState.isValid, onValidationChange]);

  const addServiceArea = () => {
    if (newServiceArea.trim()) {
      const currentAreas = getValues("serviceAreas") || [];
      const updatedAreas = [...currentAreas, newServiceArea.trim()];
      setValue("serviceAreas", updatedAreas, { shouldValidate: true });
      setNewServiceArea("");
    }
  };

  const removeServiceArea = (index: number) => {
    const currentAreas = getValues("serviceAreas") || [];
    const updatedAreas = currentAreas.filter((_, i) => i !== index);
    setValue("serviceAreas", updatedAreas, { shouldValidate: true });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addServiceArea();
    }
  };

  return (
    <Form {...form}>
      <div className="space-y-6">
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Service Description{" "}
                  <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Describe your catering services, specialties, and what makes your business unique..."
                    className="min-h-[120px]"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Tell potential customers about your catering services. Include
                  your specialties, cuisine types, and what makes your business
                  special. (10-500 characters)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="serviceAreas"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Service Areas <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter a city or barangay"
                        value={newServiceArea}
                        onChange={(e) => setNewServiceArea(e.target.value)}
                        onKeyDown={handleKeyDown}
                      />
                      <Button
                        type="button"
                        onClick={addServiceArea}
                        disabled={!newServiceArea.trim()}
                        size="sm"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>

                    {field.value && field.value.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {field.value.map((area, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="flex items-center gap-1"
                          >
                            {area}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-auto p-0 ml-1"
                              onClick={() => removeServiceArea(index)}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </FormControl>
                <FormDescription>
                  Add the cities, municipalities, or barangays where you provide
                  catering services. This helps customers know if you serve
                  their area.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="sampleMenu"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sample Menu</FormLabel>
                <FormControl>
                  <FileUpload
                    onFileSelect={(file) => field.onChange(file)}
                    value={field.value}
                    accept="image/*,.pdf"
                    maxSize={10 * 1024 * 1024} // 10MB
                    placeholder="Upload a sample menu or food photos"
                    showPreview={true}
                  />
                </FormControl>
                <FormDescription>
                  Upload a sample menu, price list, or photos of your food. This
                  helps customers understand your offerings. (Images or PDF, max
                  10MB)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="bg-muted/50 rounded-lg p-4">
          <h4 className="font-medium mb-2">Tips for better visibility:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Be specific about your cuisine types and specialties</li>
            <li>• Include all areas you&apos;re willing to serve</li>
            <li>• High-quality menu photos attract more customers</li>
            <li>• Mention any dietary options (vegetarian, halal, etc.)</li>
          </ul>
        </div>
      </div>
    </Form>
  );
}
