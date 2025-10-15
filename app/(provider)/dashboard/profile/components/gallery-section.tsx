"use client";

import * as React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Typography } from "@/components/ui/typography";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { FileUpload } from "@/components/ui/file-upload";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import Image from "next/image";
import useToast from "@/hooks/useToast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const MAX_GALLERY_IMAGES = 20;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export interface GalleryImage {
  id: string;
  provider_id: string;
  image_url: string;
  display_order: number;
  created_at?: string;
  updated_at?: string;
}

interface GallerySectionProps {
  images: GalleryImage[];
  isUploading: boolean;
  isDeleting: boolean;
  onUpload: (file: File) => Promise<void>;
  onDelete: (imageId: string) => Promise<void>;
  isLoading?: boolean;
}

/**
 * Gallery section component for managing provider gallery images
 *
 * Features:
 * - Multiple image upload with drag & drop
 * - Grid layout with responsive design
 * - Delete confirmation dialog
 * - Loading states
 * - Empty state
 * - Image limit enforcement (20 images max)
 */
export function GallerySection({
  images,
  isUploading,
  isDeleting,
  onUpload,
  onDelete,
  isLoading,
}: GallerySectionProps) {
  const toast = useToast();
  const [deleteImageId, setDeleteImageId] = React.useState<string | null>(null);
  const [showUploadDialog, setShowUploadDialog] = React.useState(false);

  // Sort images by display_order
  const sortedImages = React.useMemo(() => {
    return [...images].sort((a, b) => a.display_order - b.display_order);
  }, [images]);

  const canUploadMore = images.length < MAX_GALLERY_IMAGES;

  const validateFile = React.useCallback((file: File) => {
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return "Invalid file type. Only JPEG, PNG, and WebP are allowed.";
    }

    if (file.size > MAX_FILE_SIZE) {
      return "File size exceeds 5MB limit.";
    }

    return null;
  }, []);

  const handleFileUpload = async (files: File[]) => {
    if (files.length === 0) return;

    const remainingSlots = Math.max(0, MAX_GALLERY_IMAGES - images.length);

    if (remainingSlots <= 0) {
      toast.error(
        `Gallery limit reached. Maximum ${MAX_GALLERY_IMAGES} images allowed.`
      );
      return;
    }

    const errorMessages = new Set<string>();
    const filesToUpload: File[] = [];

    for (const file of files) {
      const validationError = validateFile(file);

      if (validationError) {
        errorMessages.add(validationError);
        continue;
      }

      if (filesToUpload.length >= remainingSlots) {
        errorMessages.add(
          `Gallery limit reached. Maximum ${MAX_GALLERY_IMAGES} images allowed.`
        );
        break;
      }

      filesToUpload.push(file);
    }

    errorMessages.forEach((message) => toast.error(message));

    if (filesToUpload.length === 0) {
      return;
    }

    try {
      for (const file of filesToUpload) {
        await onUpload(file);
      }
      setShowUploadDialog(false);
    } catch (error) {
      console.error("Upload error:", error);
    }
  };

  const handleUploadClick = () => {
    if (!canUploadMore) {
      toast.error(
        `Gallery limit reached. Maximum ${MAX_GALLERY_IMAGES} images allowed.`
      );
      return;
    }
    setShowUploadDialog(true);
  };

  const handleDeleteClick = (imageId: string) => {
    setDeleteImageId(imageId);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteImageId || isDeleting) {
      return;
    }

    try {
      await onDelete(deleteImageId);
      setDeleteImageId(null);
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const handleDeleteCancel = () => {
    if (isDeleting) {
      return;
    }
    setDeleteImageId(null);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <Typography variant="h3">Photo gallery</Typography>
              <Typography variant="mutedText" className="mt-1">
                Showcase your work, events, and menus ({images.length}/
                {MAX_GALLERY_IMAGES} images)
              </Typography>
            </div>
            <Button
              onClick={handleUploadClick}
              disabled={!canUploadMore || isUploading || isLoading}
              size="sm"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload image
                </>
              )}
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-lg" />
              ))}
            </div>
          ) : sortedImages.length === 0 ? (
            <EmptyState
              variant="inline"
              icon={ImageIcon}
              title="No images yet"
              description="Upload images to showcase your catering services, events, and menus."
              actionLabel="Upload first image"
              onAction={handleUploadClick}
              size="sm"
            />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {sortedImages.map((image) => (
                <GalleryImageCard
                  key={image.id}
                  image={image}
                  onDelete={() => handleDeleteClick(image.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload dialog */}
      <AlertDialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Upload gallery image</AlertDialogTitle>
            <AlertDialogDescription>
              Upload an image to showcase your catering services, events, and
              menus. Maximum file size: 5MB. Accepted formats: JPEG, PNG, WebP.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <FileUpload onChange={handleFileUpload} />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUploading}>Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={!!deleteImageId}
        onOpenChange={(open) => !open && handleDeleteCancel()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete image?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              image from your gallery.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={handleDeleteCancel}
              disabled={isDeleting}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface GalleryImageCardProps {
  image: GalleryImage;
  onDelete: () => void;
}

function GalleryImageCard({ image, onDelete }: GalleryImageCardProps) {
  const [imageError, setImageError] = React.useState(false);

  return (
    <div className="relative aspect-square rounded-lg overflow-hidden bg-muted group focus-within:ring-2 focus-within:ring-ring">
      {imageError ? (
        <div className="flex h-full w-full items-center justify-center">
          <ImageIcon className="h-8 w-8 text-muted-foreground" />
        </div>
      ) : (
        <Image
          src={image.image_url}
          alt="Gallery image"
          fill
          className="object-cover"
          sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
          onError={() => setImageError(true)}
        />
      )}

      <Button
        variant="destructive"
        size="icon"
        onClick={onDelete}
        className="absolute right-3 top-3 z-20 shadow-lg md:hidden"
        aria-label="Delete image"
      >
        <X className="h-4 w-4" />
      </Button>

      <div className="absolute inset-0 hidden items-center justify-center bg-black/50 transition-opacity md:flex md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
        <Button
          variant="destructive"
          size="sm"
          onClick={onDelete}
          className="shadow-lg"
          aria-label="Delete image"
        >
          <X className="mr-1 h-4 w-4" />
          Delete
        </Button>
      </div>
    </div>
  );
}
