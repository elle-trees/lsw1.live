import { createFileRoute } from '@tanstack/react-router'
import PlayerDetails from '@/pages/PlayerDetails'

export const Route = createFileRoute('/player/$playerId')({
  component: () => {
    const { playerId } = Route.useParams()
    return <PlayerDetails playerId={playerId} />
  },
})

