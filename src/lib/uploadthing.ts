import { generateReactHelpers } from "@uploadthing/react";
import type { OurFileRouter } from "../../api/uploadthing/router";

// Use full URL in development, relative path in production
const getUploadUrl = () => {
  if (import.meta.env.DEV) {
    // In development, use the full URL if you're running a separate API server
    // Otherwise, Vite will proxy it
    return "/api/uploadthing";
  }
  return "/api/uploadthing";
};

export const { useUploadThing, uploadFiles } = generateReactHelpers<OurFileRouter>({
  url: getUploadUrl(),
});

