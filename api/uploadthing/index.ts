import { createRouteHandler } from "uploadthing/next";
import { ourFileRouter } from "./router";

// Export the route handler for Vercel
// This works with Vercel's serverless functions
export const { GET, POST } = createRouteHandler({
  router: ourFileRouter,
});

