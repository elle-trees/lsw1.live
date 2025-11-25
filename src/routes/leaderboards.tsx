import { createFileRoute } from '@tanstack/react-router'
import Leaderboards from '@/pages/Leaderboards'

export const Route = createFileRoute('/leaderboards')({
  component: Leaderboards,
})

