"use client";

import * as React from "react";
import { ColorSwatch } from "./color-swatch";

export interface BrandColorPickerProps {
  value?: string;
  onChange?: (color: string) => void;
  colors?: string[];
  className?: string;
}

const DEFAULT_COLORS = [
  "#9CA3AF", // Gray
  "#EA580C", // Orange
  "#2563EB", // Blue
  "#16A34A", // Green
  "#EF4444", // Red
  "#8B5CF6", // Purple
  "#F59E0B", // Amber
];

export function BrandColorPicker({
  value,
  onChange,
  colors = DEFAULT_COLORS,
  className,
}: BrandColorPickerProps) {
  const [selectedColor, setSelectedColor] = React.useState<string | undefined>(
    value
  );

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
    onChange?.(color);
  };

  return (
    <div className={className}>
      
      <div className="flex gap-3 flex-wrap">
        {colors.map((color) => (
          <ColorSwatch
            key={color}
            color={color}
            selected={selectedColor === color}
            onSelect={() => handleColorSelect(color)}
          />
        ))}
      </div><p className="text-sm text-muted-foreground mt-2 text-end">
        Choose a color that represents your brand
      </p>
    </div>
  );
}
