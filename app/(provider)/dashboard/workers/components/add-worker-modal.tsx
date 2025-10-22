"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { WorkerProfileForm, type WorkerFormData } from "./worker-profile-form";

interface AddWorkerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (data: WorkerFormData) => Promise<void>;
  isLoading?: boolean;
}

export function AddWorkerModal({
  open,
  onOpenChange,
  onAdd,
  isLoading = false,
}: AddWorkerModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: WorkerFormData) => {
    setIsSubmitting(true);
    try {
      await onAdd(data);
      onOpenChange(false);
    } catch (error) {
      console.error("Error adding worker:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add worker profile</DialogTitle>
          <DialogDescription>
            Create a profile for a worker who doesn&apos;t need login access.
          </DialogDescription>
        </DialogHeader>

        <WorkerProfileForm
          mode="create"
          onSubmit={handleSubmit}
          isLoading={isLoading || isSubmitting}
        />

        <DialogFooter>
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
                Adding...
              </>
            ) : (
              "Add worker"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
