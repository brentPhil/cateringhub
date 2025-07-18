import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Typography } from "@/components/ui/typography";
import { 
  Plus, 
  Search, 
  FileX, 
  Users, 
  ShoppingCart,
  Package,
  Bell,
  Settings,
  type LucideIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  variant?: "card" | "page" | "inline";
  icon?: LucideIcon;
  title?: string;
  description?: string;
  actionLabel?: string;
  secondaryActionLabel?: string;
  onAction?: () => void;
  onSecondaryAction?: () => void;
  className?: string;
  size?: "sm" | "md" | "lg";
}

function getDefaultIcon(title?: string): LucideIcon {
  if (!title) return FileX;
  
  const lowerTitle = title.toLowerCase();
  
  if (lowerTitle.includes("user")) return Users;
  if (lowerTitle.includes("product") || lowerTitle.includes("item")) return Package;
  if (lowerTitle.includes("cart") || lowerTitle.includes("order")) return ShoppingCart;
  if (lowerTitle.includes("notification")) return Bell;
  if (lowerTitle.includes("setting")) return Settings;
  if (lowerTitle.includes("search") || lowerTitle.includes("result")) return Search;
  
  return FileX;
}

function getIconSize(size: "sm" | "md" | "lg") {
  switch (size) {
    case "sm":
      return "h-8 w-8";
    case "md":
      return "h-12 w-12";
    case "lg":
      return "h-16 w-16";
    default:
      return "h-12 w-12";
  }
}

function getContainerSize(size: "sm" | "md" | "lg") {
  switch (size) {
    case "sm":
      return "h-12 w-12";
    case "md":
      return "h-16 w-16";
    case "lg":
      return "h-20 w-20";
    default:
      return "h-16 w-16";
  }
}

export function EmptyState({
  variant = "page",
  icon,
  title = "No items found",
  description = "There are no items to display at the moment.",
  actionLabel,
  secondaryActionLabel,
  onAction,
  onSecondaryAction,
  className,
  size = "md"
}: EmptyStateProps) {
  const Icon = icon || getDefaultIcon(title);
  const iconSize = getIconSize(size);
  const containerSize = getContainerSize(size);

  if (variant === "inline") {
    return (
      <div className={cn("flex items-center justify-center py-8", className)}>
        <div className="text-center space-y-3">
          <div className={cn("mx-auto flex items-center justify-center rounded-full bg-muted", containerSize)}>
            <Icon className={cn("text-muted-foreground", iconSize)} />
          </div>
          <div className="space-y-1">
            <Typography variant="smallText" className="font-medium">
              {title}
            </Typography>
            <Typography variant="mutedText" className="text-xs">
              {description}
            </Typography>
          </div>
          {actionLabel && onAction && (
            <Button size="sm" onClick={onAction}>
              <Plus className="h-3 w-3 mr-1" />
              {actionLabel}
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (variant === "card") {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader className="text-center pb-4">
          <div className={cn("mx-auto flex items-center justify-center rounded-full bg-muted", containerSize)}>
            <Icon className={cn("text-muted-foreground", iconSize)} />
          </div>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="space-y-2">
            <Typography variant="h5">{title}</Typography>
            <Typography variant="mutedText">{description}</Typography>
          </div>
          {(actionLabel || secondaryActionLabel) && (
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              {actionLabel && onAction && (
                <Button onClick={onAction}>
                  <Plus className="h-4 w-4 mr-2" />
                  {actionLabel}
                </Button>
              )}
              {secondaryActionLabel && onSecondaryAction && (
                <Button variant="outline" onClick={onSecondaryAction}>
                  {secondaryActionLabel}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (variant === "page") {
    return (
      <div className={cn("min-h-[400px] flex items-center justify-center p-4", className)}>
        <div className="text-center space-y-6 max-w-md">
          <div className={cn("mx-auto flex items-center justify-center rounded-full bg-muted", containerSize)}>
            <Icon className={cn("text-muted-foreground", iconSize)} />
          </div>
          <div className="space-y-2">
            <Typography variant="h4">{title}</Typography>
            <Typography variant="mutedText">{description}</Typography>
          </div>
          {(actionLabel || secondaryActionLabel) && (
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {actionLabel && onAction && (
                <Button onClick={onAction}>
                  <Plus className="h-4 w-4 mr-2" />
                  {actionLabel}
                </Button>
              )}
              {secondaryActionLabel && onSecondaryAction && (
                <Button variant="outline" onClick={onSecondaryAction}>
                  {secondaryActionLabel}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
