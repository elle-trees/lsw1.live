import { hydrateRoot, createRoot } from 'react-dom/client'
import { App } from './app'
import { QueryClient, HydrationBoundary } from '@tanstack/react-query'
import { auth } from './lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { getAdminUid } from './lib/env'

const ADMIN_UID = getAdminUid()

onAuthStateChanged(auth, async (user) => {
  if (user && ADMIN_UID && user.uid === ADMIN_UID) {
    try {
      const { setPlayerAdminStatus } = await import('./lib/db/players')
      await setPlayerAdminStatus(ADMIN_UID, true)
    } catch (_error) {
      // Silent fail - admin status will be set on next auth check
    }
  }
})

const rootElement = document.getElementById('root')!

// Check if we have server-rendered HTML (SSR)
const hasServerRenderedContent = rootElement.hasChildNodes()

// Get dehydrated state from server if available
const dehydratedState = typeof window !== 'undefined' && (window as any).__REACT_QUERY_STATE__

// Create QueryClient
const queryClient = new QueryClient({
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

// If we have server-rendered content, hydrate; otherwise, render fresh
if (hasServerRenderedContent && dehydratedState) {
  // Hydrate the server-rendered HTML with React Query state
  hydrateRoot(
    rootElement,
    <HydrationBoundary state={dehydratedState}>
      <App queryClient={queryClient} />
    </HydrationBoundary>
  )
} else {
  // Client-side only rendering (no SSR)
  // Still use HydrationBoundary if we have state (for consistency)
  const app = dehydratedState ? (
    <HydrationBoundary state={dehydratedState}>
      <App queryClient={queryClient} />
    </HydrationBoundary>
  ) : (
    <App queryClient={queryClient} />
  )
  createRoot(rootElement).render(app)
}

