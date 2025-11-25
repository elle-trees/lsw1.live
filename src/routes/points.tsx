import { createFileRoute } from '@tanstack/react-router'
import PointsLeaderboard from '@/pages/PointsLeaderboard'

export const Route = createFileRoute('/points')({
  component: PointsLeaderboard,
})

