"use client";

import * as React from "react";
import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/ui/file-upload";
import { Skeleton } from "../ui/skeleton";

export interface LogoPickerProps {
  value?: string;
  onChange?: (file: File | string) => void;
  label?: string;
  shape?: "circle" | "square";
  size?: number;
  className?: string;
  fallback?: string;
  loading?: boolean;
}

export function LogoPicker({
  value,
  onChange,
  label = "Logo",
  shape = "circle",
  size = 120,
  className,
  fallback = "LG",
  loading,
}: LogoPickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | undefined>(value);

  // Update preview URL when value prop changes
  React.useEffect(() => {
    console.log("LogoPicker: value prop changed:", value);
    setPreviewUrl(value);
  }, [value]);

  const handleFileChange = (files: File[]) => {
    if (files.length > 0) {
      const file = files[0];
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSave = () => {
    if (selectedFile) {
      onChange?.(selectedFile);
    }
    setIsOpen(false);
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setPreviewUrl(value);
    setIsOpen(false);
  };

  if (loading) {
    return (
      <Skeleton
        className={cn("rounded-full", className)}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <>
      <div className={cn("relative inline-block group", className)}>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-full"
          aria-label={`Edit ${label}`}
        >
          <Avatar
            className={cn(
              "border-4 border-background shadow-lg",
              shape === "square" && "rounded-lg"
            )}
            style={{ width: size, height: size }}
          >
            <AvatarImage src={previewUrl} alt={label} />
            <AvatarFallback
              className={cn(
                "text-2xl font-bold",
                shape === "square" && "rounded-lg"
              )}
            >
              {fallback}
            </AvatarFallback>
          </Avatar>

          {/* Edit badge */}
          <div
            className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-2 shadow-lg pointer-events-none opacity-0 scale-95 transition-all duration-200 ease-out group-hover:opacity-100 group-hover:scale-100 group-hover:duration-300"
            aria-hidden="true"
          >
            <Pencil className="w-4 h-4" />
          </div>
        </button>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Update {label}</DialogTitle>
            <DialogDescription>
              Upload a new image for your {label.toLowerCase()}. Recommended
              size: 400x400px.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <FileUpload onChange={handleFileChange} />

            {previewUrl && (
              <div className="flex justify-center">
                <Avatar
                  className={cn(
                    "border-2 border-border",
                    shape === "square" && "rounded-lg"
                  )}
                  style={{ width: 120, height: 120 }}
                >
                  <AvatarImage src={previewUrl} alt="Preview" />
                  <AvatarFallback
                    className={cn(shape === "square" && "rounded-lg")}
                  >
                    {fallback}
                  </AvatarFallback>
                </Avatar>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!selectedFile}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
