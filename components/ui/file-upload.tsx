"use client";

import * as React from "react";
import Image from "next/image";
import { Upload, X, File, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

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
  isUploading?: boolean;
  uploadProgress?: number; // 0-100
  onUploadStart?: () => void;
  onUploadComplete?: () => void;
}

// Helper function to safely check if value is a File instance
const isFileInstance = (value: any): value is File => {
  // First check if File constructor exists and is callable
  if (typeof File === "undefined" || typeof File !== "function") {
    // Fallback: duck typing check for File-like objects
    return (
      value &&
      typeof value === "object" &&
      typeof value.name === "string" &&
      typeof value.size === "number" &&
      typeof value.type === "string" &&
      typeof value.lastModified === "number"
    );
  }

  // Use instanceof if File constructor is available
  return value instanceof File;
};

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
  isUploading = false,
  uploadProgress = 0,
  onUploadStart,
  onUploadComplete,
}: FileUploadProps) {
  const [dragActive, setDragActive] = React.useState(false);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Handle preview generation
  React.useEffect(() => {
    if (isFileInstance(value)) {
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
    // Check file size
    if (maxSize && file.size > maxSize) {
      const maxSizeMB = Math.round(maxSize / 1024 / 1024);
      const fileSizeMB = Math.round((file.size / 1024 / 1024) * 100) / 100;
      return `File size (${fileSizeMB}MB) exceeds the maximum allowed size of ${maxSizeMB}MB. Please choose a smaller file.`;
    }

    // Check for empty files
    if (file.size === 0) {
      return "The selected file is empty. Please choose a valid file.";
    }

    // Check file type
    if (accept && accept !== "*/*") {
      const acceptedTypes = accept.split(",").map((type) => type.trim());
      const isValidType = acceptedTypes.some((type) => {
        if (type.startsWith(".")) {
          return file.name.toLowerCase().endsWith(type.toLowerCase());
        }
        return file.type.match(type.replace("*", ".*"));
      });

      if (!isValidType) {
        const typesList = acceptedTypes.join(", ");
        return `File type "${
          file.type || "unknown"
        }" is not supported. Accepted types: ${typesList}`;
      }
    }

    // Check for potentially corrupted files (very large files with suspicious extensions)
    const suspiciousExtensions = [
      ".exe",
      ".bat",
      ".cmd",
      ".scr",
      ".pif",
      ".com",
    ];
    const fileExtension = file.name
      .toLowerCase()
      .substring(file.name.lastIndexOf("."));
    if (suspiciousExtensions.includes(fileExtension)) {
      return "This file type is not allowed for security reasons.";
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
    onUploadStart?.();
    onFileSelect(file);

    // Simulate upload completion after file selection
    // In a real implementation, this would be called after actual upload
    setTimeout(() => {
      onUploadComplete?.();
    }, 100);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (disabled || isUploading) return;

    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      // Only set dragActive to false if we're leaving the drop zone entirely
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX;
      const y = e.clientY;

      if (
        x < rect.left ||
        x >= rect.right ||
        y < rect.top ||
        y >= rect.bottom
      ) {
        setDragActive(false);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled || isUploading) return;

    const files = Array.from(e.dataTransfer.files);

    if (files.length === 0) {
      setError("No files were dropped. Please try again.");
      return;
    }

    if (files.length > 1) {
      setError("Please drop only one file at a time.");
      return;
    }

    handleFile(files[0]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleClick = () => {
    if (!disabled && !isUploading) {
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

  const hasFile = isFileInstance(value) || (typeof value === "string" && value);
  const isImage =
    (isFileInstance(value) && value.type.startsWith("image/")) ||
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
              {isFileInstance(value) ? value.name : "File selected"}
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
            "border-muted-foreground/25":
              !dragActive && !hasFile && !isUploading,
            "border-primary": (hasFile && !dragActive) || isUploading,
            "cursor-not-allowed opacity-50": disabled || isUploading,
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
                {isFileInstance(value) ? value.name : "File selected"}
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
        ) : isUploading ? (
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-primary mx-auto mb-2 animate-spin" />
            <p className="text-sm font-medium">Uploading...</p>
            <div className="mt-2 w-full max-w-xs mx-auto">
              <Progress value={uploadProgress} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {uploadProgress}% complete
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <Upload
              className={cn(
                "w-8 h-8 mx-auto mb-2 transition-colors",
                dragActive ? "text-primary" : "text-muted-foreground"
              )}
            />
            <p
              className={cn(
                "text-sm font-medium transition-colors",
                dragActive ? "text-primary" : "text-foreground"
              )}
            >
              {dragActive ? "Drop your file here" : placeholder}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {accept === "image/*" ? "PNG, JPG, GIF up to" : "Files up to"}{" "}
              {Math.round(maxSize / 1024 / 1024)}MB
            </p>
            {dragActive && (
              <div className="mt-2 text-xs text-primary font-medium">
                Release to upload
              </div>
            )}
          </div>
        )}
      </div>

      {error && <p className="text-sm text-destructive mt-2">{error}</p>}
    </div>
  );
}
