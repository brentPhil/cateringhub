/**
 * Shared form components for onboarding steps
 * Provides consistent styling and behavior across all forms
 */

import * as React from "react";
import {
  type FieldPath,
  type FieldValues,
  type Control,
} from "react-hook-form";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileUpload } from "@/components/ui/file-upload";
import { X, Plus } from "lucide-react";
import type {
  FormFieldConfig,
  OnboardingFormControl,
  FileUploadConfig,
} from "./form-types";
import {
  createFieldId,
  createAriaDescribedBy,
  ARIA_LABELS,
} from "./form-types";

// Generic typed form field component with enhanced type safety
interface TypedFormFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> {
  control: Control<TFieldValues>;
  name: TName;
  config: FormFieldConfig;
  children: (field: {
    value: TFieldValues[TName];
    onChange: (value: TFieldValues[TName]) => void;
    onBlur: () => void;
    id: string;
    "aria-describedby": string | undefined;
    hasError: boolean;
  }) => React.ReactNode;
  disabled?: boolean;
}

export function TypedFormField<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>
>({
  control,
  name,
  config,
  children,
  disabled = false,
}: TypedFormFieldProps<TFieldValues, TName>) {
  return (
    <FormField
      control={control}
      name={name}
      disabled={disabled}
      render={({ field, fieldState }) => {
        const fieldId = createFieldId(name, "input");
        const ariaDescribedBy = createAriaDescribedBy(
          name,
          !!config.description,
          !!fieldState.error
        );

        return (
          <FormItem>
            <FormLabel htmlFor={fieldId}>
              {config.label}
              {config.required && (
                <span
                  className="text-destructive ml-1"
                  aria-label={ARIA_LABELS.REQUIRED_FIELD}
                >
                  *
                </span>
              )}
            </FormLabel>
            <FormControl>
              {children({
                ...field,
                id: fieldId,
                "aria-describedby": ariaDescribedBy,
                hasError: !!fieldState.error,
              })}
            </FormControl>
            {config.description && (
              <FormDescription id={createFieldId(name, "description")}>
                {config.description}
              </FormDescription>
            )}
            <FormMessage id={createFieldId(name, "error")} />
          </FormItem>
        );
      }}
    />
  );
}

// Text input field component
interface TextFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> {
  control: Control<TFieldValues>;
  name: TName;
  config: FormFieldConfig;
  disabled?: boolean;
  type?: "text" | "email" | "tel" | "url";
}

export function TextField<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>
>({
  control,
  name,
  config,
  disabled = false,
  type = "text",
}: TextFieldProps<TFieldValues, TName>) {
  return (
    <TypedFormField
      control={control}
      name={name}
      config={config}
      disabled={disabled}
    >
      {(field) => {
        const { hasError, ...inputProps } = field
        return (
          <Input
            {...inputProps}
            type={type}
            placeholder={config.placeholder}
            autoComplete={config.autoComplete}
            disabled={disabled}
            aria-invalid={hasError}
          />
        )
      }}
    </TypedFormField>
  );
}

// Textarea field component with improved accessibility
interface TextareaFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> {
  control: Control<TFieldValues>;
  name: TName;
  config: FormFieldConfig;
  disabled?: boolean;
  rows?: number;
  resize?: boolean;
}

export function TextareaField<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>
>({
  control,
  name,
  config,
  disabled = false,
  rows = 4,
  resize = false,
}: TextareaFieldProps<TFieldValues, TName>) {
  // Calculate min-height more reliably
  const minHeight = React.useMemo(() => `${rows * 24}px`, [rows]);

  return (
    <TypedFormField
      control={control}
      name={name}
      config={config}
      disabled={disabled}
    >
      {(field) => {
        const { hasError, ...textareaProps } = field
        return (
          <Textarea
            {...textareaProps}
            placeholder={config.placeholder}
            style={{ minHeight }}
            className={resize ? "" : "resize-none"}
            disabled={disabled}
            rows={rows}
            aria-invalid={hasError}
          />
        )
      }}
    </TypedFormField>
  );
}

// File upload field component
interface FileUploadFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> {
  control: Control<TFieldValues>;
  name: TName;
  config: FormFieldConfig;
  uploadConfig: FileUploadConfig;
  disabled?: boolean;
}

export function FileUploadField<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>
>({
  control,
  name,
  config,
  uploadConfig,
  disabled = false,
}: FileUploadFieldProps<TFieldValues, TName>) {
  return (
    <TypedFormField
      control={control}
      name={name}
      config={config}
      disabled={disabled}
    >
      {(field) => (
        <FileUpload
          onFileSelect={(file: File | null) =>
            field.onChange(file as TFieldValues[TName])
          }
          value={field.value}
          accept={uploadConfig.accept}
          maxSize={uploadConfig.maxSize}
          placeholder={config.placeholder}
          showPreview={uploadConfig.showPreview}
          disabled={disabled}
        />
      )}
    </TypedFormField>
  );
}

// Dynamic array field component (for service areas, tags, etc.)
interface DynamicArrayFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> {
  control: Control<TFieldValues>;
  name: TName;
  config: FormFieldConfig;
  inputValue: string;
  onInputChange: (value: string) => void;
  onAddItem: () => boolean;
  onRemoveItem: (index: number) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  disabled?: boolean;
  addButtonLabel?: string;
}

export function DynamicArrayField<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>
>({
  control,
  name,
  config,
  inputValue,
  onInputChange,
  onAddItem,
  onRemoveItem,
  onKeyDown,
  disabled = false,
  addButtonLabel = "Add",
}: DynamicArrayFieldProps<TFieldValues, TName>) {
  return (
    <TypedFormField
      control={control}
      name={name}
      config={config}
      disabled={disabled}
    >
      {(field) => (
        <div className="space-y-3">
          <div
            className="flex gap-2"
            role="group"
            aria-label={`Add ${config.label.toLowerCase()}`}
          >
            <Input
              placeholder={config.placeholder}
              value={inputValue}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={disabled}
            />
            <Button
              type="button"
              onClick={onAddItem}
              disabled={!inputValue.trim() || disabled}
              size="sm"
              aria-label={`${
                ARIA_LABELS.ADD_ITEM
              } ${config.label.toLowerCase()}`}
            >
              <Plus className="w-4 h-4" />
              <span className="sr-only">{addButtonLabel}</span>
            </Button>
          </div>

          {field.value && field.value.length > 0 && (
            <div
              className="flex flex-wrap gap-2"
              role="list"
              aria-label={`Current ${config.label.toLowerCase()}`}
            >
              {field.value.map((item: string, index: number) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="flex items-center gap-1"
                  role="listitem"
                >
                  {item}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 ml-1 hover:bg-transparent"
                    onClick={() => onRemoveItem(index)}
                    disabled={disabled}
                    aria-label={`${ARIA_LABELS.REMOVE_ITEM} ${item}`}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}
    </TypedFormField>
  );
}

// Social media links component with memoized configuration
interface SocialMediaLinksProps {
  control: OnboardingFormControl;
  disabled?: boolean;
}

export const SocialMediaLinks = React.memo<SocialMediaLinksProps>(
  function SocialMediaLinks({ control, disabled = false }) {
    // Memoize social media configurations to prevent recreation
    const socialMediaConfigs = React.useMemo(
      () => [
        {
          name: "socialMediaLinks.facebook" as const,
          label: "Facebook Page",
          placeholder: "https://facebook.com/your-page",
          icon: "facebook",
        },
        {
          name: "socialMediaLinks.instagram" as const,
          label: "Instagram Profile",
          placeholder: "https://instagram.com/your-profile",
          icon: "instagram",
        },
        {
          name: "socialMediaLinks.website" as const,
          label: "Website",
          placeholder: "https://your-website.com",
          icon: "globe",
        },
      ],
      []
    );

    return (
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

        {socialMediaConfigs.map((socialConfig) => (
          <TextField
            key={socialConfig.name}
            control={control}
            name={socialConfig.name}
            config={{
              label: socialConfig.label,
              placeholder: socialConfig.placeholder,
              description: `Link to your ${socialConfig.label.toLowerCase()}.`,
            }}
            type="url"
            disabled={disabled}
          />
        ))}
      </div>
    );
  }
);

// Info section component for tips and guidelines
interface InfoSectionProps {
  title: string;
  items: string[];
  className?: string;
}

export const InfoSection = React.memo<InfoSectionProps>(function InfoSection({
  title,
  items,
  className = "",
}) {
  return (
    <div
      className={`bg-muted/50 rounded-lg p-4 ${className}`}
      role="complementary"
      aria-labelledby="info-heading"
    >
      <h4 id="info-heading" className="font-medium mb-2">
        {title}
      </h4>
      <ul className="text-sm text-muted-foreground space-y-1" role="list">
        {items.map((item, index) => (
          <li key={index} role="listitem">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
});

// Form section wrapper with fieldset for better accessibility
interface FormSectionProps {
  legend: string;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export const FormSection = React.memo<FormSectionProps>(function FormSection({
  legend,
  children,
  disabled = false,
  className = "",
}) {
  return (
    <fieldset disabled={disabled} className={`space-y-4 ${className}`}>
      <legend className="sr-only">{legend}</legend>
      {children}
    </fieldset>
  );
});
