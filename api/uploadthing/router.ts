import { createUploadthing, type FileRouter } from "uploadthing/next";

// Initialize UploadThing - this will use UPLOADTHING_SECRET and UPLOADTHING_APP_ID from env
const f = createUploadthing();

export const ourFileRouter = {
  downloadFile: f({ 
    blob: { 
      maxFileSize: "100MB", 
      maxFileCount: 1 
    } 
  })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("File upload complete:", file.url);
      return { uploadedBy: metadata?.uploadedBy };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;

