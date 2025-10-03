"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ColorSwatchProps {
  color: string;
  selected?: boolean;
  onSelect?: () => void;
  className?: string;
}

export function ColorSwatch({
  color,
  selected = false,
  onSelect,
  className,
}: ColorSwatchProps) {
  const swatchRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    const element = swatchRef.current;
    if (!element) return;

    // Motion One hover animation
    const handlePointerEnter = () => {
      element.style.transform = "scale(1.05)";
      element.style.transition =
        "transform 0.24s cubic-bezier(0.22, 1, 0.36, 1)";
    };

    const handlePointerLeave = () => {
      element.style.transform = "scale(1)";
      element.style.transition =
        "transform 0.2s cubic-bezier(0.22, 1, 0.36, 1)";
    };

    const handlePointerDown = () => {
      element.style.transform = "scale(0.97)";
      element.style.transition =
        "transform 0.1s cubic-bezier(0.22, 1, 0.36, 1)";
    };

    const handlePointerUp = () => {
      element.style.transform = "scale(1.05)";
      element.style.transition =
        "transform 0.1s cubic-bezier(0.22, 1, 0.36, 1)";
    };

    element.addEventListener("pointerenter", handlePointerEnter);
    element.addEventListener("pointerleave", handlePointerLeave);
    element.addEventListener("pointerdown", handlePointerDown);
    element.addEventListener("pointerup", handlePointerUp);

    return () => {
      element.removeEventListener("pointerenter", handlePointerEnter);
      element.removeEventListener("pointerleave", handlePointerLeave);
      element.removeEventListener("pointerdown", handlePointerDown);
      element.removeEventListener("pointerup", handlePointerUp);
    };
  }, []);

  return (
    <button
      ref={swatchRef}
      type="button"
      onClick={onSelect}
      className={cn(
        "relative rounded-md size-8 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
      style={{
        backgroundColor: color,
      }}
      aria-label={`Select color ${color}`}
      aria-pressed={selected}
    >
      {selected && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Check
            className="w-5 h-5 text-white drop-shadow-md"
            strokeWidth={3}
          />
        </div>
      )}
    </button>
  );
}
