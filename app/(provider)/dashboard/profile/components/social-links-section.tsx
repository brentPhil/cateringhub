"use client";

import * as React from "react";
import { Facebook, Instagram, Globe, Music, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ButtonGroup } from "@/components/ui/button-group";
import { Skeleton } from "@/components/ui/skeleton";
import type { LucideIcon } from "lucide-react";
import type { SocialPlatform } from "../hooks/use-social-links";

// Social platform configuration
const SOCIAL_PLATFORMS = [
  { value: "facebook" as const, label: "Facebook", icon: Facebook },
  { value: "instagram" as const, label: "Instagram", icon: Instagram },
  { value: "website" as const, label: "Website", icon: Globe },
  { value: "tiktok" as const, label: "TikTok", icon: Music },
] as const;

export interface SocialLink {
  id: string;
  platform: SocialPlatform;
  url: string;
}

interface SocialLinksSectionProps {
  socialLinks: SocialLink[];
  onAddLink: (platform: SocialPlatform) => void;
  onUpdateLink: (id: string, value: string) => void;
  onRemoveLink: (id: string) => void;
  isLoading?: boolean;
}

// Helper functions
function getPlatformIcon(platform: string): LucideIcon {
  const platformConfig = SOCIAL_PLATFORMS.find((p) => p.value === platform);
  return platformConfig?.icon || Globe;
}

function getPlatformLabel(platform: string): string {
  const platformConfig = SOCIAL_PLATFORMS.find((p) => p.value === platform);
  return platformConfig?.label || platform;
}

function isValidUrl(url: string): boolean {
  return url.startsWith("https://");
}

// Get available platforms (not already added)
function getAvailablePlatforms(existingLinks: SocialLink[]) {
  const existingPlatforms = existingLinks.map((l) => l.platform);
  return SOCIAL_PLATFORMS.filter((p) => !existingPlatforms.includes(p.value));
}

export function SocialLinksSection({
  socialLinks,
  onAddLink,
  onUpdateLink,
  onRemoveLink,
  isLoading = false,
}: SocialLinksSectionProps) {
  const availablePlatforms = getAvailablePlatforms(socialLinks);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-full max-w-md" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Social media links
        </h2>
        <p className="text-sm text-muted-foreground">
          Add your social links that will be visible on your business profile
        </p>
      </div>

      <div className="space-y-3">
        {availablePlatforms.length > 0 && (
          <Select onValueChange={(value) => onAddLink(value as SocialPlatform)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Add social link" />
            </SelectTrigger>
            <SelectContent>
              {availablePlatforms.map((platform) => {
                const Icon = platform.icon;
                return (
                  <SelectItem key={platform.value} value={platform.value}>
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      {platform.label}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        )}

        {socialLinks.length > 0 && (
          <div className="space-y-2 pt-2">
            {socialLinks.map((link) => {
              const Icon = getPlatformIcon(link.platform);
              const hasError = link.url.trim() && !isValidUrl(link.url);

              return (
                <div key={link.id} className="space-y-2">
                  <ButtonGroup className="w-full">
                    <Button
                      variant="outline"
                      size="icon"
                      className="pointer-events-none bg-transparent"
                      aria-label={getPlatformLabel(link.platform)}
                    >
                      <Icon className="w-4 h-4" />
                    </Button>
                    <Input
                      placeholder="https://..."
                      value={link.url}
                      onChange={(e) => onUpdateLink(link.id, e.target.value)}
                      className={
                        hasError
                          ? "border-destructive focus-visible:ring-destructive"
                          : ""
                      }
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => onRemoveLink(link.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      aria-label="Remove link"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </ButtonGroup>
                  {hasError && (
                    <p className="text-xs text-destructive font-medium pl-12">
                      URL must start with https://
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {socialLinks.length === 0 && availablePlatforms.length === 0 && (
          <p className="text-sm text-muted-foreground">
            All social platforms have been added
          </p>
        )}
      </div>
    </div>
  );
}
