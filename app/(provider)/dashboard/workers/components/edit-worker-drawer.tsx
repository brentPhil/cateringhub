"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import type { WorkerProfile } from "../hooks/use-worker-profiles";
import { WorkerProfileForm, type WorkerFormData } from "./worker-profile-form";

interface EditWorkerDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  worker: WorkerProfile;
  onUpdate: (data: Partial<WorkerFormData>) => Promise<void>;
  isLoading?: boolean;
}

export function EditWorkerDrawer({
  open,
  onOpenChange,
  worker,
  onUpdate,
  isLoading = false,
}: EditWorkerDrawerProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: WorkerFormData) => {
    setIsSubmitting(true);
    try {
      await onUpdate(data);
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating worker:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[600px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit worker profile</SheetTitle>
          <SheetDescription>
            Update the worker&apos;s information
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          <WorkerProfileForm
            mode="edit"
            defaultValues={{
              name: worker.name,
              phone: worker.phone || "",
              role: worker.role || "",
              tags: worker.tags || [],
              certifications: worker.certifications || [],
              hourlyRate: worker.hourly_rate
                ? Number(worker.hourly_rate)
                : undefined,
              notes: worker.notes || "",
              status: worker.status,
            }}
            onSubmit={handleSubmit}
            isLoading={isLoading || isSubmitting}
          />
        </div>

        <SheetFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting || isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="worker-profile-form"
            disabled={isSubmitting || isLoading}
          >
            {isSubmitting || isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save changes"
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
