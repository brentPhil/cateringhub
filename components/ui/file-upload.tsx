import { cn } from "@/lib/utils";
import React, { useRef, useState } from "react";
import { motion } from "motion/react";
import {
  IconUpload,
  IconX,
  IconFileTypePdf,
  IconPhoto,
} from "@tabler/icons-react";
import { useDropzone } from "react-dropzone";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import Image from "next/image";

const mainVariant = {
  initial: {
    x: 0,
    y: 0,
  },
  animate: {
    x: 20,
    y: -20,
    opacity: 0.9,
  },
};

const secondaryVariant = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
  },
};

interface FileUploadProps {
  onChange?: (files: File[]) => void;
  accept?: string;
  maxSize?: number; // in bytes
  showPreview?: boolean;
  disabled?: boolean;
}

export const FileUpload = ({
  onChange,
  accept,
  maxSize = 5 * 1024 * 1024, // Default 5MB
  showPreview = true,
  disabled = false,
}: FileUploadProps) => {
  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxSize) {
      return `File size must be less than ${(maxSize / (1024 * 1024)).toFixed(0)}MB`;
    }

    // Check file type if accept is specified
    if (accept) {
      const acceptedTypes = accept.split(",").map((type) => type.trim());
      const fileType = file.type;
      const fileExtension = `.${file.name.split(".").pop()}`;

      const isAccepted = acceptedTypes.some((type) => {
        if (type.startsWith(".")) {
          return fileExtension.toLowerCase() === type.toLowerCase();
        }
        if (type.endsWith("/*")) {
          const category = type.split("/")[0];
          return fileType.startsWith(category);
        }
        return fileType === type;
      });

      if (!isAccepted) {
        return `File type not accepted. Accepted types: ${accept}`;
      }
    }

    return null;
  };

  const generatePreview = (file: File) => {
    if (file.type.startsWith("image/") && showPreview) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
    }
  };

  const simulateUploadProgress = () => {
    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 100);
  };

  const handleFileChange = (newFiles: File[]) => {
    if (disabled) return;

    setError(null);
    const file = newFiles[0];

    if (!file) return;

    // Validate file
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    // Simulate upload progress
    simulateUploadProgress();

    // Generate preview for images
    generatePreview(file);

    setFiles([file]);
    if (onChange) {
      onChange([file]);
    }
  };

  const handleRemoveFile = () => {
    setFiles([]);
    setPreviewUrl(null);
    setUploadProgress(0);
    setError(null);
    if (onChange) {
      onChange([]);
    }
  };

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const { getRootProps, isDragActive } = useDropzone({
    multiple: false,
    noClick: true,
    onDrop: handleFileChange,
    onDropRejected: (fileRejections) => {
      const rejection = fileRejections[0];
      if (rejection) {
        setError(rejection.errors[0]?.message || "File rejected");
      }
    },
    disabled,
    accept: accept
      ? accept.split(",").reduce(
          (acc, type) => {
            acc[type.trim()] = [];
            return acc;
          },
          {} as Record<string, string[]>
        )
      : undefined,
    maxSize,
  });

  return (
    <div className="w-full">
      {/* Error message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm"
        >
          {error}
        </motion.div>
      )}

      <div {...getRootProps()}>
        <motion.div
          onClick={handleClick}
          whileHover={disabled ? undefined : "animate"}
          className={cn(
            "p-10 group/file block rounded-lg w-full relative overflow-hidden",
            disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
          )}
        >
          <input
            ref={fileInputRef}
            id="file-upload-handle"
            type="file"
            aria-label="Upload file"
            onChange={(e) => handleFileChange(Array.from(e.target.files || []))}
            className="hidden"
            accept={accept}
            disabled={disabled}
          />
          <div className="absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,white,transparent)]">
            <GridPattern />
          </div>
          <div className="flex flex-col items-center justify-center">
            <p className="relative z-20 font-sans font-bold text-neutral-700 dark:text-neutral-300 text-base">
              Upload file
            </p>
            <p className="relative z-20 font-sans font-normal text-neutral-400 dark:text-neutral-400 text-base mt-2">
              Drag or drop your files here or click to upload
            </p>
            {accept && (
              <p className="relative z-20 font-sans font-normal text-neutral-500 dark:text-neutral-500 text-xs mt-1">
                Accepted: {accept}
              </p>
            )}
            <div className="relative w-full mt-10 max-w-xl mx-auto">
              {files.length > 0 &&
                files.map((file, idx) => (
                  <motion.div
                    key={"file" + idx}
                    layoutId={idx === 0 ? "file-upload" : "file-upload-" + idx}
                    className={cn(
                      "relative overflow-hidden z-40 bg-white dark:bg-neutral-900 flex flex-col items-start justify-start p-4 mt-4 w-full mx-auto rounded-md",
                      "shadow-sm"
                    )}
                  >
                    {/* Image preview */}
                    {previewUrl && (
                      <div className="w-full mb-3 rounded-md overflow-hidden">
                        <Image
                          src={previewUrl}
                          alt={file.name}
                          width={400}
                          height={200}
                          className="w-full h-auto object-cover"
                        />
                      </div>
                    )}

                    {/* File info */}
                    <div className="flex justify-between w-full items-center gap-4">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {file.type.startsWith("image/") ? (
                          <IconPhoto className="h-5 w-5 text-neutral-600 dark:text-neutral-400 shrink-0" />
                        ) : file.type === "application/pdf" ? (
                          <IconFileTypePdf className="h-5 w-5 text-neutral-600 dark:text-neutral-400 shrink-0" />
                        ) : (
                          <IconUpload className="h-5 w-5 text-neutral-600 dark:text-neutral-400 shrink-0" />
                        )}
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          layout
                          className="text-base text-neutral-700 dark:text-neutral-300 truncate"
                        >
                          {file.name}
                        </motion.p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          layout
                          className="rounded-lg px-2 py-1 text-sm text-neutral-600 dark:bg-neutral-800 dark:text-white shadow-input"
                        >
                          {(file.size / (1024 * 1024)).toFixed(2)} MB
                        </motion.p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFile();
                          }}
                          className="h-8 w-8 p-0"
                          disabled={disabled}
                        >
                          <IconX className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Upload progress */}
                    {uploadProgress > 0 && uploadProgress < 100 && (
                      <div className="w-full mt-3">
                        <Progress value={uploadProgress} className="h-1" />
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                          Uploading... {uploadProgress}%
                        </p>
                      </div>
                    )}

                    {/* File metadata */}
                    <div className="flex text-sm md:flex-row flex-col items-start md:items-center w-full mt-2 justify-between text-neutral-600 dark:text-neutral-400">
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        layout
                        className="px-1 py-0.5 rounded-md bg-gray-100 dark:bg-neutral-800 "
                      >
                        {file.type || "Unknown type"}
                      </motion.p>

                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        layout
                      >
                        modified{" "}
                        {new Date(file.lastModified).toLocaleDateString()}
                      </motion.p>
                    </div>
                  </motion.div>
                ))}
              {!files.length && (
                <motion.div
                  layoutId="file-upload"
                  variants={mainVariant}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 20,
                  }}
                  className={cn(
                    "relative group-hover/file:shadow-2xl z-40 bg-white dark:bg-neutral-900 flex items-center justify-center h-32 mt-4 w-full max-w-[8rem] mx-auto rounded-md",
                    "shadow-[0px_10px_50px_rgba(0,0,0,0.1)]"
                  )}
                >
                  {isDragActive ? (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-neutral-600 flex flex-col items-center"
                    >
                      Drop it
                      <IconUpload className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
                    </motion.p>
                  ) : (
                    <IconUpload className="h-4 w-4 text-neutral-600 dark:text-neutral-300" />
                  )}
                </motion.div>
              )}

              {!files.length && (
                <motion.div
                  variants={secondaryVariant}
                  className="absolute opacity-0 border border-dashed border-sky-400 inset-0 z-30 bg-transparent flex items-center justify-center h-32 mt-4 w-full max-w-[8rem] mx-auto rounded-md"
                ></motion.div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export function GridPattern() {
  const columns = 41;
  const rows = 11;
  return (
    <div className="flex bg-gray-100 dark:bg-neutral-900 shrink-0 flex-wrap justify-center items-center gap-x-px gap-y-px  scale-105">
      {Array.from({ length: rows }).map((_, row) =>
        Array.from({ length: columns }).map((_, col) => {
          const index = row * columns + col;
          return (
            <div
              key={`${col}-${row}`}
              className={`w-10 h-10 flex shrink-0 rounded-[2px] ${
                index % 2 === 0
                  ? "bg-gray-50 dark:bg-neutral-950"
                  : "bg-gray-50 dark:bg-neutral-950 shadow-[0px_0px_1px_3px_rgba(255,255,255,1)_inset] dark:shadow-[0px_0px_1px_3px_rgba(0,0,0,1)_inset]"
              }`}
            />
          );
        })
      )}
    </div>
  );
}
