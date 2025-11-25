import { createFileRoute } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'
import { LoadingSpinner } from '@/components/LoadingSpinner'

// Lazy load Stats page to reduce initial bundle size (contains Recharts)
const Stats = lazy(() => import('@/pages/Stats').then(m => ({ default: m.default })))

export const Route = createFileRoute('/stats')({
  component: () => (
    <Suspense fallback={<LoadingSpinner />}>
      <Stats />
    </Suspense>
  ),
})

