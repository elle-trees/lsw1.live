import { createFileRoute } from '@tanstack/react-router'
import RunDetails from '@/pages/RunDetails'

export const Route = createFileRoute('/run/$runId')({
  component: () => {
    const { runId } = Route.useParams()
    return <RunDetails runId={runId} />
  },
})

