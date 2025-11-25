import { renderToString } from 'react-dom/server'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider, dehydrate } from '@tanstack/react-query'
import { routeTree } from './routeTree.gen'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'

// Register router for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createRouter<typeof routeTree>>
  }
}

// Create a new QueryClient for each request to avoid state leakage
function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 30,
        retry: 1,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
      mutations: {
        retry: 1,
      },
    },
  })
}


export async function render(url: string): Promise<{ html: string; dehydratedState: unknown }> {
  const queryClient = createQueryClient()
  
  // Parse URL
  const [pathname, search] = url.split('?')
  const fullPath = pathname || '/'
  
  // Create a new router instance for this request to avoid state leakage
  const requestRouter = createRouter({ 
    routeTree,
    context: {
      queryClient,
    },
  })
  
  // Navigate to the requested URL
  await requestRouter.navigate({
    to: fullPath,
    search: search ? new URLSearchParams(search) : undefined,
  })

  // Wait for router to load route data
  await requestRouter.load()

  // Render the app to string with the request-specific router
  const html = renderToString(
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <RouterProvider router={requestRouter} />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )

  // Dehydrate React Query state for hydration on client
  const dehydratedState = dehydrate(queryClient)

  return { html, dehydratedState }
}

