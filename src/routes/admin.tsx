import { createFileRoute } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'
import { LoadingSpinner } from '@/components/LoadingSpinner'

// Lazy load Admin page to reduce initial bundle size
const Admin = lazy(() => import('@/pages/Admin').then(m => ({ default: m.default })))

export const Route = createFileRoute('/admin')({
  component: () => (
    <Suspense fallback={<LoadingSpinner />}>
      <Admin />
    </Suspense>
  ),
})

