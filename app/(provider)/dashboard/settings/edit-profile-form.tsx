"use client";

import { useState, useMemo, useCallback } from "react";
import { IS_DEV } from "@/lib/constants";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { User } from "@supabase/supabase-js";

import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import useToast from "@/hooks/useToast";
import { updateProfile } from "./actions";
import { getInitials, getAvatarUrl } from "@/lib/utils/avatar";
import { profileSchema, type ProfileFormData } from "@/lib/validations";
import type { Profile } from "@/types";

interface EditProfileFormProps {
  user: User | null;
  profile: Profile | null;
}

export function EditProfileForm({ user, profile }: EditProfileFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Default values from the existing profile - memoized to prevent unnecessary re-renders
  const defaultValues: Partial<ProfileFormData> = useMemo(
    () => ({
      full_name: profile?.full_name ?? "",
      username: profile?.username ?? "",
      bio: profile?.bio ?? "",
      avatar_url: profile?.avatar_url ?? "",
    }),
    [profile]
  );

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues,
  });

  // Memoized submit handler to prevent unnecessary re-renders
  const onSubmit = useCallback(
    async (data: ProfileFormData) => {
      setIsLoading(true);

      try {
        await updateProfile({
          id: user?.id,
          full_name: data.full_name,
          username: data.username || undefined,
          bio: data.bio || undefined,
          avatar_url: data.avatar_url || undefined,
        });

        toast.success("Your profile has been updated successfully.");

        // Use router.refresh() to refresh the page data without losing URL state
        router.refresh();
      } catch (error) {
        if (IS_DEV) {
          console.error(error);
        }
        toast.error("Failed to update profile. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [user?.id, toast, router]
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <Avatar className="h-24 w-24 border-2 border-border">
            <AvatarImage
              src={getAvatarUrl(
                form.watch("avatar_url"),
                form.watch("full_name") || user?.email || ""
              )}
              alt={form.watch("full_name") || user?.email || ""}
            />
            <AvatarFallback className="text-xl font-semibold bg-primary/10">
              {getInitials(form.watch("full_name") || user?.email || "")}
            </AvatarFallback>
          </Avatar>

          <Field
            control={form.control}
            name="avatar_url"
            render={({ field }) => (
              <div className="flex-1 w-full space-y-2">
                <FieldLabel>Profile Picture URL</FieldLabel>
                <Input
                  placeholder="https://example.com/avatar.jpg"
                  {...field}
                  value={field.value || ""}
                  className="w-full"
                />
                <FieldDescription>
                  Enter a URL for your profile picture. Use services like Imgur
                  or Cloudinary to host your images.
                </FieldDescription>
                <FieldError />
              </div>
            )}
          />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <Field
            control={form.control}
            name="full_name"
            render={({ field }) => (
              <>
                <FieldLabel>Full Name</FieldLabel>
                <Input placeholder="Your name" {...field} />
                <FieldDescription>
                  This is your public display name.
                </FieldDescription>
                <FieldError />
              </>
            )}
          />

          <Field
            control={form.control}
            name="username"
            render={({ field }) => (
              <>
                <FieldLabel>Username</FieldLabel>
                <Input
                  placeholder="username"
                  {...field}
                  value={field.value || ""}
                />
                <FieldDescription>
                  This is your public username.
                </FieldDescription>
                <FieldError />
              </>
            )}
          />
        </div>

        <Field
          control={form.control}
          name="bio"
          render={({ field }) => (
            <>
              <FieldLabel>Bio</FieldLabel>
              <Textarea
                placeholder="Tell us a little bit about yourself"
                className="resize-none min-h-[120px]"
                {...field}
                value={field.value || ""}
              />
              <FieldDescription>
                Brief description for your profile. Max 160 characters.
              </FieldDescription>
              <FieldError />
            </>
          )}
        />

        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading} className="min-w-[120px]">
            {isLoading ? "Updating..." : "Update profile"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
