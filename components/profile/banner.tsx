"use client";

import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { BannerEditor, type BannerAdjustments } from "./banner-editor";
import { useState } from "react";
import * as React from "react";
import {
  TransformWrapper,
  TransformComponent,
  type ReactZoomPanPinchRef,
} from "react-zoom-pan-pinch";

export interface BannerProps {
  src?: string;
  alt?: string;
  onSave?: (file: File, adjustments: BannerAdjustments) => void;
  className?: string;
  height?: number;
  loading?: boolean;
  adjustments?: BannerAdjustments | null;
}

export function Banner({
  src,
  alt = "Profile banner",
  onSave,
  className,
  loading = false,
  adjustments,
}: BannerProps) {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const twRef = React.useRef<ReactZoomPanPinchRef | null>(null);

  // Debug logging
  console.log("Banner component render:", {
    src,
    adjustments,
    hasAdjustments: !!adjustments,
  });

  // When adjustments change, programmatically set the transform to ensure it applies
  React.useEffect(() => {
    if (adjustments && twRef.current) {
      const scale = adjustments.zoom / 100;
      // setTransform(positionX, positionY, scale, animationTimeMs)
      try {
        twRef.current.setTransform(
          adjustments.offsetX,
          adjustments.offsetY,
          scale,
          0
        );
      } catch (e) {
        console.warn("Failed to set transform via ref", e);
      }
    }
  }, [adjustments]);

  if (loading) {
    return <Skeleton className={cn("w-full h-80 rounded-none", className)} />;
  }

  return (
    <>
      <div
        className={cn(
          "relative w-full aspect-[1920/600] rounded-md bg-muted overflow-hidden group",
          className
        )}
      >
        {src ? (
          adjustments ? (
            // With adjustments: Use TransformWrapper for consistent rendering
            <div className="absolute inset-0 overflow-hidden bg-muted">
              <TransformWrapper
                ref={twRef}
                initialScale={adjustments.zoom / 100}
                initialPositionX={adjustments.offsetX}
                initialPositionY={adjustments.offsetY}
                centerOnInit={false}
                disabled={true}
                panning={{ disabled: true }}
                wheel={{ disabled: true }}
                pinch={{ disabled: true }}
                doubleClick={{ disabled: true }}
                minScale={adjustments.zoom / 100}
                maxScale={adjustments.zoom / 100}
              >
                <TransformComponent
                  wrapperStyle={{
                    width: "100%",
                    height: "100%",
                  }}
                  contentStyle={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <img
                    src={src}
                    alt={alt}
                    className="w-full h-full object-cover select-none"
                    style={{
                      transform: `rotate(${adjustments.rotation}deg)`,
                      transformOrigin: "center center",
                    }}
                    draggable={false}
                  />
                </TransformComponent>
              </TransformWrapper>
            </div>
          ) : (
            // Without adjustments: Simple image display
            <div className="absolute inset-0 overflow-hidden bg-muted">
              <img src={src} alt={alt} className="w-full h-full object-cover" />
            </div>
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <p className="text-muted-foreground text-sm">No banner image</p>
          </div>
        )}

        {/* Hover overlay - top right */}
        <div className="absolute top-4 right-4 pointer-events-none opacity-0 scale-95 transition-all duration-200 ease-out group-hover:opacity-100 group-hover:scale-100 group-hover:duration-300 group-hover:pointer-events-auto">
          <button
            type="button"
            onClick={() => setIsEditorOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-background/95 backdrop-blur-sm text-foreground rounded-lg shadow-lg hover:bg-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Update banner"
          >
            <Pencil className="w-4 h-4" />
            <span className="text-sm font-medium">Update banner</span>
          </button>
        </div>
      </div>

      <BannerEditor
        open={isEditorOpen}
        onOpenChange={setIsEditorOpen}
        currentBanner={src}
        onSave={onSave}
      />
    </>
  );
}
