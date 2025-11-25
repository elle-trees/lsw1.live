import { createFileRoute } from '@tanstack/react-router'
import Live from '@/pages/Live'

export const Route = createFileRoute('/live')({
  component: Live,
})

