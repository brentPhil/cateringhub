"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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

interface VirtualizedComboboxProps {
  options: ComboboxOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  emptyMessage?: string;
  className?: string;
  disabled?: boolean;
  searchPlaceholder?: string;
}

/**
 * Virtualized Combobox Component
 *
 * High-performance combobox that uses virtual scrolling to efficiently render
 * large lists of options (1000+ items). Only renders visible items in the viewport.
 *
 * Features:
 * - Virtual scrolling with @tanstack/react-virtual
 * - Search/filter functionality
 * - Keyboard navigation
 * - Accessibility support
 * - Smooth scrolling performance
 *
 * @example
 * ```tsx
 * <VirtualizedCombobox
 *   options={cities}
 *   value={selectedCity}
 *   onValueChange={setSelectedCity}
 *   placeholder="Select city"
 *   searchPlaceholder="Search cities..."
 * />
 * ```
 */
export function VirtualizedCombobox({
  options,
  value,
  onValueChange,
  placeholder = "Select an option",
  emptyMessage = "No results found.",
  searchPlaceholder,
  className,
  disabled = false,
}: VirtualizedComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [selectedValue, setSelectedValue] = React.useState(value || "");
  const [searchQuery, setSearchQuery] = React.useState("");

  // Ref for the scrollable container
  const parentRef = React.useRef<HTMLDivElement>(null);

  // Sync external value changes
  React.useEffect(() => {
    if (value !== undefined) {
      setSelectedValue(value);
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
        // Use setTimeout to ensure DOM is fully ready
        setTimeout(() => {
          rowVirtualizer.measure();
        }, 0);
      }
    },
    [rowVirtualizer]
  );

  const handleSelect = React.useCallback(
    (currentValue: string) => {
      setSelectedValue(currentValue);
      onValueChange?.(currentValue);
      setOpen(false);
      setSearchQuery(""); // Reset search when closing
    },
    [onValueChange]
  );

  const selectedOption = React.useMemo(
    () => options.find((option) => option.value === selectedValue),
    [options, selectedValue]
  );

  // Reset search when popover closes
  React.useEffect(() => {
    if (!open) {
      setSearchQuery("");
    }
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
          disabled={disabled}
        >
          {selectedOption ? selectedOption.label : placeholder}
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
                            selectedValue === option.value
                              ? "opacity-100"
                              : "opacity-0"
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
  );
}
