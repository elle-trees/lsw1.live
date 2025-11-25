import { RouterProvider } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Analytics } from '@vercel/analytics/react'
import { GameDetails } from '@/components/GameDetails'
import { AuthProvider } from '@/components/AuthProvider'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { initializeRoutePrefetches } from '@/lib/prefetch'
import { useEffect } from 'react'
import { router } from './router'
import './globals.css'

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 30, // 30 minutes
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

export function App({ queryClient: providedQueryClient }: { queryClient?: QueryClient } = {}) {
  const queryClient = providedQueryClient || createQueryClient()
  // Initialize prefetch system on mount
  useEffect(() => {
    initializeRoutePrefetches()
  }, [])

  // Initialize real-time points system
  useEffect(() => {
    (async () => {
      // Initialize points config subscription for real-time updates
      const { initializePointsConfigSubscription } = await import('@/lib/utils')
      initializePointsConfigSubscription()

      // Start the points recalculation service (listens for config changes)
      const {
        startPointsRecalculationService,
        startRankUpdateService,
      } = await import('@/lib/data/firestore/points-realtime')
      startPointsRecalculationService()
      startRankUpdateService()
    })()

    // Cleanup on unmount
    return () => {
      ;(async () => {
        const {
          stopPointsRecalculationService,
          stopRankUpdateService,
        } = await import('@/lib/data/firestore/points-realtime')
        stopPointsRecalculationService()
        stopRankUpdateService()
      })()
    }
  }, [])

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <RouterProvider router={router} />
            <Analytics />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

