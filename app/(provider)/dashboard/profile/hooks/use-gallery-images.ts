"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { uploadGalleryImage, removeGalleryImage } from "../actions/gallery";
import useToast from "@/hooks/useToast";

export interface GalleryImage {
  id: string;
  provider_id: string;
  image_url: string;
  display_order: number;
  created_at?: string;
  updated_at?: string;
}

interface UseGalleryImagesReturn {
  images: GalleryImage[];
  isUploading: boolean;
  isDeleting: boolean;
  uploadImage: (file: File) => Promise<void>;
  deleteImage: (imageId: string) => Promise<void>;
  syncFromServer: (serverImages: GalleryImage[]) => void;
}

/**
 * Hook to manage gallery images with optimistic updates
 * 
 * Features:
 * - Optimistic UI updates for uploads and deletes
 * - Automatic error handling with rollback
 * - Toast notifications
 * - Syncs with server data after mutations
 * 
 * @param initialImages - Initial gallery images from server
 * @param providerId - Provider ID for uploads
 * @returns Gallery management functions and state
 */
export function useGalleryImages(
  initialImages: GalleryImage[] = [],
  providerId?: string
): UseGalleryImagesReturn {
  const [images, setImages] = React.useState<GalleryImage[]>(initialImages);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const objectUrlRegistry = React.useRef<Set<string>>(new Set());

  const registerObjectUrl = React.useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    objectUrlRegistry.current.add(url);
    return url;
  }, []);

  const releaseObjectUrl = React.useCallback((url?: string) => {
    if (!url || !url.startsWith("blob:")) {
      return;
    }

    if (objectUrlRegistry.current.has(url)) {
      objectUrlRegistry.current.delete(url);
    }

    URL.revokeObjectURL(url);
  }, []);

  React.useEffect(() => {
    return () => {
      // Capture current registry for cleanup
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const currentRegistry = objectUrlRegistry.current;
      currentRegistry.forEach((url) => {
        URL.revokeObjectURL(url);
      });
      currentRegistry.clear();
    };
  }, []);

  const areImagesEqual = React.useCallback(
    (a: GalleryImage[], b: GalleryImage[]) => {
      if (a === b) return true;
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        const imageA = a[i];
        const imageB = b[i];
        if (
          imageA.id !== imageB.id ||
          imageA.provider_id !== imageB.provider_id ||
          imageA.image_url !== imageB.image_url ||
          imageA.display_order !== imageB.display_order
        ) {
          return false;
        }
      }
      return true;
    },
    []
  );

  const replaceImages = React.useCallback(
    (source: GalleryImage[]) => {
      setImages((prev) => {
        if (areImagesEqual(prev, source)) {
          return prev;
        }

        prev.forEach((image) => {
          if (image.image_url.startsWith("blob:")) {
            releaseObjectUrl(image.image_url);
          }
        });

        return [...source];
      });
    },
    [areImagesEqual, releaseObjectUrl]
  );

  // Sync images when initialImages change (from server refetch)
  React.useEffect(() => {
    replaceImages(initialImages);
  }, [initialImages, replaceImages]);

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!providerId) {
        throw new Error("Provider ID is required");
      }

      const formData = new FormData();
      formData.append("file", file);

      const result = await uploadGalleryImage(providerId, formData);

      if (!result.success) {
        throw new Error(result.error || "Failed to upload image");
      }

      return result.data as GalleryImage;
    },
    onMutate: async (file: File) => {
      // Create optimistic image with preview URL
      const previewUrl = registerObjectUrl(file);
      const tempId = `temp-${Date.now()}`;
      let optimisticImage: GalleryImage = {
        id: tempId,
        provider_id: providerId || "",
        image_url: previewUrl,
        display_order: 0,
      };

      // Optimistically add to images
      setImages((prev) => {
        const nextImage: GalleryImage = {
          ...optimisticImage,
          display_order: prev.length,
        };
        optimisticImage = nextImage;
        return [...prev, nextImage];
      });

      return { optimisticImage };
    },
    onSuccess: (newImage, _file, context) => {
      // Replace optimistic image with real one
      setImages((prev) =>
        prev.map((img) =>
          img.id === context?.optimisticImage.id ? newImage : img
        )
      );

      // Clean up preview URL
      releaseObjectUrl(context?.optimisticImage.image_url);

      toast.success("Image uploaded successfully");
      queryClient.invalidateQueries({ queryKey: ["provider-profile"] });
    },
    onError: (error: Error, _file, context) => {
      // Remove optimistic image on error
      if (context?.optimisticImage) {
        setImages((prev) =>
          prev.filter((img) => img.id !== context.optimisticImage.id)
        );

        // Clean up preview URL
        releaseObjectUrl(context.optimisticImage.image_url);
      }

      toast.error(error.message || "Failed to upload image");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (imageId: string) => {
      if (!providerId) {
        throw new Error("Provider ID is required");
      }

      const result = await removeGalleryImage(providerId, imageId);

      if (!result.success) {
        throw new Error(result.error || "Failed to delete image");
      }
    },
    onMutate: async (imageId: string) => {
      // Store the image being deleted for rollback
      const deletedImage = images.find((img) => img.id === imageId);

      // Optimistically remove from images
      setImages((prev) => prev.filter((img) => img.id !== imageId));

      return { deletedImage };
    },
    onSuccess: () => {
      toast.success("Image deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["provider-profile"] });
    },
    onError: (error: Error, _imageId, context) => {
      // Rollback: restore deleted image
      const deletedImage = context?.deletedImage;
      if (deletedImage) {
        setImages((prev) =>
          [...prev, deletedImage].sort(
            (a, b) => a.display_order - b.display_order
          )
        );
      }

      toast.error(error.message || "Failed to delete image");
    },
  });

  // Upload image function
  const uploadImage = async (file: File) => {
    await uploadMutation.mutateAsync(file);
  };

  // Delete image function
  const deleteImage = async (imageId: string) => {
    await deleteMutation.mutateAsync(imageId);
  };

  // Sync from server (called after profile refetch)
  const syncFromServer = React.useCallback(
    (serverImages: GalleryImage[]) => {
      replaceImages(serverImages);
    },
    [replaceImages]
  );

  return {
    images,
    isUploading: uploadMutation.isPending,
    isDeleting: deleteMutation.isPending,
    uploadImage,
    deleteImage,
    syncFromServer,
  };
}
