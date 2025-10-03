"use client";

import * as React from "react";
import {
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Maximize2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/ui/file-upload";

// NEW: pan/zoom lib
import {
  TransformWrapper,
  TransformComponent,
  type ReactZoomPanPinchRef,
} from "react-zoom-pan-pinch";

export interface BannerEditorProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** Current banner URL to display initially */
  currentBanner?: string;
  /** Callback when user saves the banner with adjustments */
  onSave?: (file: File, adjustments: BannerAdjustments) => void;
}

/**
 * Banner adjustment settings that control how the banner image is displayed.
 * These values are persisted to the database and applied when rendering the banner.
 */
export interface BannerAdjustments {
  /** Zoom level as percentage (50-200). Library uses scale (0.5-2) internally. */
  zoom: number;
  /** Horizontal offset in pixels (positionX from react-zoom-pan-pinch) */
  offsetX: number;
  /** Vertical offset in pixels (positionY from react-zoom-pan-pinch) */
  offsetY: number;
  /** Rotation angle in degrees (0, 90, 180, or 270) */
  rotation: 0 | 90 | 180 | 270;
}

const DEFAULT_ADJUSTMENTS: BannerAdjustments = {
  zoom: 100,
  offsetX: 0,
  offsetY: 0,
  rotation: 0,
};

export function BannerEditor({
  open,
  onOpenChange,
  currentBanner,
  onSave,
}: BannerEditorProps) {
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | undefined>(
    currentBanner
  );
  const [objectUrl, setObjectUrl] = React.useState<string | null>(null);
  const [isImageLoading, setIsImageLoading] = React.useState(false);
  const [imageError, setImageError] = React.useState<string | null>(null);

  const [adjustments, setAdjustments] =
    React.useState<BannerAdjustments>(DEFAULT_ADJUSTMENTS);

  const twRef = React.useRef<ReactZoomPanPinchRef | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Handle files from FileUpload component (supports different payload shapes)
  const handleFileChange = (payload: any) => {
    try {
      let file: File | null = null;

      // Handle different payload formats
      if (Array.isArray(payload) && payload[0] instanceof File) {
        file = payload[0];
      } else if (payload?.target?.files?.[0]) {
        file = payload.target.files[0];
      } else if (payload?.file instanceof File) {
        file = payload.file;
      }

      if (!file) {
        console.warn("No valid file found in payload:", payload);
        return;
      }

      // Validate file type
      const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (!validTypes.includes(file.type)) {
        setImageError(
          "Please upload a valid image file (JPEG, PNG, WebP, or GIF)"
        );
        return;
      }

      // Clean up previous object URL
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }

      // Create new object URL
      setIsImageLoading(true);
      setImageError(null);
      const url = URL.createObjectURL(file);

      setObjectUrl(url);
      setSelectedFile(file);
      setPreviewUrl(url);
      setAdjustments(DEFAULT_ADJUSTMENTS);

      // Reset transform in the wrapper after image loads
      queueMicrotask(() => {
        const inst = twRef.current;
        inst?.resetTransform();
        setIsImageLoading(false);
      });
    } catch (error) {
      console.error("Error handling file change:", error);
      setImageError("Failed to load image. Please try again.");
      setIsImageLoading(false);
    }
  };

  const handleSave = () => {
    if (selectedFile) onSave?.(selectedFile, adjustments);
    onOpenChange(false);
  };

  const handleCancel = () => {
    // Clean up object URL to prevent memory leaks
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }

    // Reset all state
    setObjectUrl(null);
    setSelectedFile(null);
    setPreviewUrl(currentBanner);
    setAdjustments(DEFAULT_ADJUSTMENTS);
    setImageError(null);
    setIsImageLoading(false);

    // Reset transform
    twRef.current?.resetTransform();

    // Close dialog
    onOpenChange(false);
  };

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [objectUrl]);

  // rotate 90° steps – we simply rotate the img; pan/zoom handled by lib
  const rotateCW = () => {
    setAdjustments((p) => {
      const newRotation = ((p.rotation + 90) % 360) as 0 | 90 | 180 | 270;
      const rotationRad = (newRotation * Math.PI) / 180;
      const minScaleForRotation = Math.max(
        Math.abs(Math.cos(rotationRad)) + Math.abs(Math.sin(rotationRad)),
        1
      );
      // Ensure zoom is at least the minimum required for this rotation
      const newZoom = Math.max(p.zoom, Math.round(minScaleForRotation * 100));

      return {
        ...p,
        rotation: newRotation,
        zoom: newZoom,
      };
    });

    // Update the transform wrapper's scale if needed
    setTimeout(() => {
      const currentScale = twRef.current?.state.scale || 1;
      const minScale = getMinScale();
      if (currentScale < minScale) {
        twRef.current?.setTransform(
          twRef.current.state.positionX,
          twRef.current.state.positionY,
          minScale,
          200
        );
      }
    }, 0);
  };

  const rotateCCW = () => {
    setAdjustments((p) => {
      const newRotation = ((p.rotation + 270) % 360) as 0 | 90 | 180 | 270;
      const rotationRad = (newRotation * Math.PI) / 180;
      const minScaleForRotation = Math.max(
        Math.abs(Math.cos(rotationRad)) + Math.abs(Math.sin(rotationRad)),
        1
      );
      // Ensure zoom is at least the minimum required for this rotation
      const newZoom = Math.max(p.zoom, Math.round(minScaleForRotation * 100));

      return {
        ...p,
        rotation: newRotation,
        zoom: newZoom,
      };
    });

    // Update the transform wrapper's scale if needed
    setTimeout(() => {
      const currentScale = twRef.current?.state.scale || 1;
      const minScale = getMinScale();
      if (currentScale < minScale) {
        twRef.current?.setTransform(
          twRef.current.state.positionX,
          twRef.current.state.positionY,
          minScale,
          200
        );
      }
    }, 0);
  };
  const resetAll = () => {
    setAdjustments(DEFAULT_ADJUSTMENTS);
    twRef.current?.resetTransform();
  };

  const fitToView = () => {
    // zoom=100%, centered (0,0) is the library default
    setAdjustments((p) => ({ ...p, zoom: 100, offsetX: 0, offsetY: 0 }));
    twRef.current?.centerView(1, 200); // scale=1, animate 200ms
  };

  // Keep your toolbar buttons in sync with lib:
  const zoomIn = () => {
    twRef.current?.zoomIn(0.1, 150); // step 0.1 scale
  };
  const zoomOut = () => {
    twRef.current?.zoomOut(0.1, 150);
  };

  // Calculate minimum scale needed to cover container at current rotation
  const getMinScale = React.useCallback(() => {
    const rotationRad = (adjustments.rotation * Math.PI) / 180;
    // For rotated images, we need extra scale to cover corners
    // This ensures no gaps appear when image is rotated
    // At 45°, we need sqrt(2) ≈ 1.414 times the scale
    const minScaleForRotation = Math.max(
      Math.abs(Math.cos(rotationRad)) + Math.abs(Math.sin(rotationRad)),
      1
    );
    // Add a small buffer (5%) to ensure complete coverage
    return minScaleForRotation * 1.05;
  }, [adjustments.rotation]);

  // Listen to lib transforms → mirror into `adjustments`
  const handleTransformed = (ref: ReactZoomPanPinchRef) => {
    const { positionX, positionY, scale } = ref.state;
    const minScale = getMinScale();

    // Enforce minimum scale to prevent gaps
    const effectiveScale = Math.max(scale, minScale);

    console.log("Transform updated:", {
      positionX,
      positionY,
      scale: effectiveScale,
    });

    setAdjustments((p) => ({
      ...p,
      offsetX: Math.round(positionX),
      offsetY: Math.round(positionY),
      zoom: Math.round(effectiveScale * 100),
    }));
  };

  const hasAdjustments =
    adjustments.zoom !== 100 ||
    adjustments.offsetX !== 0 ||
    adjustments.offsetY !== 0 ||
    adjustments.rotation !== 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl sm:max-w-[900px] max-h-[95vh] flex flex-col p-0">
        <div className="flex-shrink-0 px-6 pt-6">
          <DialogHeader>
            <DialogTitle className="text-2xl">Update banner</DialogTitle>
            <DialogDescription className="text-base">
              Upload a new banner image and adjust its appearance. Recommended
              size: 1920×400px.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-6">
            {previewUrl && (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <label className="text-sm font-semibold">
                    Interactive preview
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      Drag to pan • Scroll/Pinch to zoom
                    </span>
                    {hasAdjustments && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={resetAll}
                        className="h-8 text-xs"
                      >
                        <RefreshCw className="w-3 h-3 mr-1.5" />
                        Reset
                      </Button>
                    )}
                  </div>
                </div>

                <div className="relative group">
                  <div
                    ref={containerRef}
                    className="relative w-full min-h-[300px] aspect-[1920/400] max-h-[500px] bg-gradient-to-br from-muted/50 to-muted rounded-xl overflow-hidden border-2 border-border shadow-lg"
                  >
                    <TransformWrapper
                      ref={twRef}
                      limitToBounds={true}
                      minScale={getMinScale()}
                      maxScale={3}
                      centerOnInit
                      doubleClick={{ disabled: true }}
                      wheel={{
                        step: 0.1,
                        wheelDisabled: false,
                        touchPadDisabled: false,
                      }}
                      panning={{
                        velocityDisabled: true,
                        disabled: false,
                      }}
                      pinch={{ disabled: false }}
                      alignmentAnimation={{
                        disabled: false,
                        sizeX: 0,
                        sizeY: 0,
                      }}
                      onTransformed={handleTransformed}
                    >
                      <TransformComponent
                        wrapperStyle={{
                          width: "100%",
                          height: "100%",
                          touchAction: "none",
                        }}
                        contentStyle={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          overflow: "hidden",
                        }}
                      >
                        {isImageLoading ? (
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
                          </div>
                        ) : imageError ? (
                          <div className="flex flex-col items-center justify-center gap-2 p-4 text-center">
                            <p className="text-sm text-destructive">
                              {imageError}
                            </p>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setImageError(null)}
                            >
                              Try again
                            </Button>
                          </div>
                        ) : (
                          <img
                            src={previewUrl || "/placeholder.svg"}
                            alt="Banner preview"
                            draggable={false}
                            onDragStart={(e) => e.preventDefault()}
                            onLoad={() => setIsImageLoading(false)}
                            onError={() => {
                              setIsImageLoading(false);
                              setImageError("Failed to load image");
                            }}
                            className="select-none object-cover"
                            style={{
                              width: "100%",
                              height: "100%",
                              minWidth: "100%",
                              minHeight: "100%",
                              transform: `rotate(${adjustments.rotation}deg)`,
                              transformOrigin: "center center",
                            }}
                          />
                        )}
                      </TransformComponent>
                    </TransformWrapper>

                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-0.5 sm:gap-1 bg-background/95 backdrop-blur-sm border-2 border-border rounded-full px-1.5 sm:px-2 py-1.5 sm:py-2 shadow-xl max-w-[calc(100%-2rem)]">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={zoomOut}
                        disabled={adjustments.zoom <= 30}
                        className="h-8 w-8 sm:h-9 sm:w-9 rounded-full hover:bg-primary/10"
                        title="Zoom out"
                        aria-label="Zoom out"
                      >
                        <ZoomOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </Button>

                      <div className="px-2 sm:px-3 py-1 min-w-[50px] sm:min-w-[60px] text-center">
                        <span className="text-xs sm:text-sm font-semibold tabular-nums">
                          {adjustments.zoom}%
                        </span>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={zoomIn}
                        disabled={adjustments.zoom >= 300}
                        className="h-8 w-8 sm:h-9 sm:w-9 rounded-full hover:bg-primary/10"
                        title="Zoom in"
                        aria-label="Zoom in"
                      >
                        <ZoomIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </Button>

                      <div className="w-px h-5 sm:h-6 bg-border mx-0.5 sm:mx-1" />

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={rotateCCW}
                        className="h-8 w-8 sm:h-9 sm:w-9 rounded-full hover:bg-primary/10"
                        title="Rotate counter-clockwise"
                        aria-label="Rotate counter-clockwise"
                      >
                        <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </Button>

                      <div className="px-1.5 sm:px-2 py-1 min-w-[45px] sm:min-w-[50px] text-center">
                        <span className="text-xs sm:text-sm font-semibold tabular-nums">
                          {adjustments.rotation}°
                        </span>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={rotateCW}
                        className="h-8 w-8 sm:h-9 sm:w-9 rounded-full hover:bg-primary/10"
                        title="Rotate clockwise"
                        aria-label="Rotate clockwise"
                      >
                        <RotateCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </Button>

                      <div className="w-px h-5 sm:h-6 bg-border mx-0.5 sm:mx-1" />

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={fitToView}
                        className="h-8 w-8 sm:h-9 sm:w-9 rounded-full hover:bg-primary/10"
                        title="Fit to view"
                        aria-label="Fit to view"
                      >
                        <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <FileUpload onChange={handleFileChange} />
          </div>
        </div>

        {/* Dialog Footer */}
        <div className="flex-shrink-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-muted/30">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            className="min-w-[100px]"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!selectedFile}
            className="min-w-[100px]"
          >
            Save banner
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
