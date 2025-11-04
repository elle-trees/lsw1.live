import { createRouteHandler } from "uploadthing/next";
import { ourFileRouter } from "./router";

// Create the route handler - this returns an object with GET and POST handlers
const { GET, POST } = createRouteHandler({
  router: ourFileRouter,
  // Add error handling
  errorFormatter: (err) => {
    console.error("UploadThing error:", err);
    return {
      message: err.message || "An error occurred during upload",
      status: err.status || 500,
    };
  },
});

// Export for Vercel serverless functions
// Vercel automatically detects named exports GET and POST
export { GET, POST };
