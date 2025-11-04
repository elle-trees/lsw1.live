import { generateReactHelpers } from "@uploadthing/react";
import type { OurFileRouter } from "../../api/uploadthing/router";

export const { useUploadThing, uploadFiles } = generateReactHelpers<OurFileRouter>({
  url: "/api/uploadthing",
});

