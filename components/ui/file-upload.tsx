"use client";

import * as React from "react";
import Image from "next/image";
import { Upload, X, File } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface FileUploadProps {
  onFileSelect: (file: File | null) => void;
  accept?: string;
  maxSize?: number; // in bytes
  className?: string;
  disabled?: boolean;
  value?: File | string | null;
  placeholder?: string;
  showPreview?: boolean;
  variant?: "default" | "compact";
}

export function FileUpload({
  onFileSelect,
  accept = "image/*",
  maxSize = 5 * 1024 * 1024, // 5MB default
  className,
  disabled = false,
  value,
  placeholder = "Click to upload or drag and drop",
  showPreview = true,
  variant = "default",
}: FileUploadProps) {
  const [dragActive, setDragActive] = React.useState(false);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Handle preview generation
  React.useEffect(() => {
    if (value instanceof File) {
      if (value.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => setPreview(e.target?.result as string);
        reader.readAsDataURL(value);
      } else {
        setPreview(null);
      }
    } else if (typeof value === "string" && value) {
      setPreview(value);
    } else {
      setPreview(null);
    }
  }, [value]);

  const validateFile = (file: File): string | null => {
    if (maxSize && file.size > maxSize) {
      return `File size must be less than ${Math.round(
        maxSize / 1024 / 1024
      )}MB`;
    }

    if (accept && accept !== "*/*") {
      const acceptedTypes = accept.split(",").map((type) => type.trim());
      const isValidType = acceptedTypes.some((type) => {
        if (type.startsWith(".")) {
          return file.name.toLowerCase().endsWith(type.toLowerCase());
        }
        return file.type.match(type.replace("*", ".*"));
      });

      if (!isValidType) {
        return `File type not supported. Accepted types: ${accept}`;
      }
    }

    return null;
  };

  const handleFile = (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    onFileSelect(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleClick = () => {
    if (!disabled) {
      inputRef.current?.click();
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview(null);
    setError(null);
    onFileSelect(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const hasFile = value instanceof File || (typeof value === "string" && value);
  const isImage =
    (value instanceof File && value.type.startsWith("image/")) ||
    (typeof value === "string" && value);

  if (variant === "compact") {
    return (
      <div className={cn("relative", className)}>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled}
        />

        <Button
          type="button"
          variant="outline"
          onClick={handleClick}
          disabled={disabled}
          className="w-full justify-start"
        >
          <Upload className="w-4 h-4 mr-2" />
          {hasFile ? (
            <span className="truncate">
              {value instanceof File ? value.name : "File selected"}
            </span>
          ) : (
            placeholder
          )}
        </Button>

        {hasFile && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            className="absolute right-1 top-1 h-6 w-6 p-0"
          >
            <X className="w-3 h-3" />
          </Button>
        )}

        {error && <p className="text-sm text-destructive mt-1">{error}</p>}
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled}
      />

      <div
        onClick={handleClick}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={cn(
          "relative border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer",
          "hover:border-primary/50 hover:bg-muted/50",
          {
            "border-primary bg-primary/5": dragActive,
            "border-muted-foreground/25": !dragActive && !hasFile,
            "border-primary": hasFile && !dragActive,
            "cursor-not-allowed opacity-50": disabled,
          }
        )}
      >
        {showPreview && preview && isImage ? (
          <div className="relative">
            <Image
              src={preview}
              alt="Preview"
              width={300}
              height={192}
              className="max-w-full max-h-48 mx-auto rounded-md object-contain"
            />
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleRemove}
              className="absolute top-2 right-2"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : hasFile ? (
          <div className="flex items-center justify-center space-x-2">
            <File className="w-8 h-8 text-muted-foreground" />
            <div className="text-center">
              <p className="text-sm font-medium">
                {value instanceof File ? value.name : "File selected"}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRemove}
                className="mt-2"
              >
                Remove
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium">{placeholder}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {accept === "image/*" ? "PNG, JPG, GIF up to" : "Files up to"}{" "}
              {Math.round(maxSize / 1024 / 1024)}MB
            </p>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-destructive mt-2">{error}</p>}
    </div>
  );
}
