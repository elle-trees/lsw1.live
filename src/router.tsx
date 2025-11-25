import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

// Create a shared router instance for both client and server
// Using @tanstack/react-router for client compatibility
export const router = createRouter({ routeTree })

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

