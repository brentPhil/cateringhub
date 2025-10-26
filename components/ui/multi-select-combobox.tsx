"use client";

import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandGroup,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type ComboboxOption = {
  value: string;
  label: string;
};

interface MultiSelectComboboxProps {
  options: ComboboxOption[];
  value?: string[];
  onValueChange?: (value: string[]) => void;
  placeholder?: string;
  emptyMessage?: string;
  className?: string;
  disabled?: boolean;
  searchPlaceholder?: string;
  maxSelected?: number;
}

/**
 * Multi-Select Virtualized Combobox Component
 *
 * High-performance multi-select combobox that uses virtual scrolling to efficiently render
 * large lists of options (1000+ items). Only renders visible items in the viewport.
 *
 * Features:
 * - Virtual scrolling with @tanstack/react-virtual
 * - Multi-select with badges
 * - Search/filter functionality
 * - Keyboard navigation
 * - Accessibility support
 * - Smooth scrolling performance
 *
 * @example
 * ```tsx
 * <MultiSelectCombobox
 *   options={cities}
 *   value={selectedCities}
 *   onValueChange={setSelectedCities}
 *   placeholder="Select cities"
 *   searchPlaceholder="Search cities..."
 * />
 * ```
 */
export function MultiSelectCombobox({
  options,
  value = [],
  onValueChange,
  placeholder = "Select options",
  emptyMessage = "No results found.",
  searchPlaceholder,
  className,
  disabled = false,
  maxSelected,
}: MultiSelectComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [selectedValues, setSelectedValues] = React.useState<string[]>(value);
  const [searchQuery, setSearchQuery] = React.useState("");

  // Ref for the scrollable container
  const parentRef = React.useRef<HTMLDivElement>(null);

  // Sync external value changes
  React.useEffect(() => {
    if (value !== undefined) {
      setSelectedValues(value);
    }
  }, [value]);

  // Filter options based on search query
  const filteredOptions = React.useMemo(() => {
    if (!searchQuery) {
      return options;
    }

    const lowerQuery = searchQuery.toLowerCase();
    return options.filter((option) =>
      option.label.toLowerCase().includes(lowerQuery)
    );
  }, [options, searchQuery]);

  // Virtual scrolling configuration
  const rowVirtualizer = useVirtualizer({
    count: filteredOptions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 35, // Estimated height of each item in pixels
    overscan: 5, // Number of items to render outside the visible area
  });

  // Callback ref to trigger virtualizer when element is mounted
  const scrollContainerRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      parentRef.current = node;

      if (node) {
        // Trigger virtualizer to measure now that element exists
        setTimeout(() => {
          rowVirtualizer.measure();
        }, 0);
      }
    },
    [rowVirtualizer]
  );

  const handleSelect = React.useCallback(
    (currentValue: string) => {
      const newValues = selectedValues.includes(currentValue)
        ? selectedValues.filter((v) => v !== currentValue)
        : maxSelected && selectedValues.length >= maxSelected
        ? selectedValues
        : [...selectedValues, currentValue];

      setSelectedValues(newValues);
      onValueChange?.(newValues);
      // Don't close popover on select for multi-select
    },
    [selectedValues, onValueChange, maxSelected]
  );

  const handleRemove = React.useCallback(
    (valueToRemove: string) => {
      const newValues = selectedValues.filter((v) => v !== valueToRemove);
      setSelectedValues(newValues);
      onValueChange?.(newValues);
    },
    [selectedValues, onValueChange]
  );

  const selectedOptions = React.useMemo(
    () =>
      selectedValues
        .map((val) => options.find((option) => option.value === val))
        .filter((opt): opt is ComboboxOption => opt !== undefined),
    [options, selectedValues]
  );

  // Reset search when popover closes
  React.useEffect(() => {
    if (!open) {
      setSearchQuery("");
    }
  }, [open]);

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn("w-full justify-between", className)}
            disabled={disabled}
          >
            <span className="truncate">
              {selectedOptions.length > 0
                ? `${selectedOptions.length} selected`
                : placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
        >
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={searchPlaceholder || placeholder}
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            {/* Only show empty message when there are actually no filtered options */}
            {filteredOptions.length === 0 && (
              <CommandEmpty>{emptyMessage}</CommandEmpty>
            )}
            {/* Virtualized list with CommandGroup for keyboard navigation */}
            {filteredOptions.length > 0 && (
              <CommandGroup>
                <div
                  ref={scrollContainerRef}
                  className="max-h-[300px] overflow-auto"
                  style={{
                    height: "300px", // Fixed height is required for virtualizer
                    overflowY: "auto",
                  }}
                >
                  {/* Inner container with total height */}
                  <div
                    style={{
                      height: `${rowVirtualizer.getTotalSize()}px`,
                      width: "100%",
                      position: "relative",
                    }}
                  >
                    {/* Only render visible items using CommandItem for keyboard navigation */}
                    {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                      const option = filteredOptions[virtualRow.index];

                      if (!option) {
                        return null;
                      }

                      const isSelected = selectedValues.includes(option.value);

                      return (
                        <CommandItem
                          key={option.value}
                          value={option.value}
                          onSelect={() => handleSelect(option.value)}
                          data-index={virtualRow.index}
                          ref={rowVirtualizer.measureElement}
                          className={cn("absolute top-0 left-0 w-full")}
                          style={{
                            height: `${virtualRow.size}px`,
                            transform: `translateY(${virtualRow.start}px)`,
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              isSelected ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {option.label}
                        </CommandItem>
                      );
                    })}
                  </div>
                </div>
              </CommandGroup>
            )}
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected items as badges */}
      {selectedOptions.length > 0 && (
        <ul
          className="flex flex-wrap gap-2 list-none"
          aria-label="Selected options"
        >
          {selectedOptions.map((option) => (
            <li key={option.value}>
              <Badge variant="secondary" className="flex items-center gap-1">
                {option.label}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 ml-1 hover:bg-transparent"
                  onClick={() => handleRemove(option.value)}
                  disabled={disabled}
                  aria-label={`Remove ${option.label}`}
                >
                  <X className="w-3 h-3" />
                </Button>
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

