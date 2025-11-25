import { createFileRoute } from '@tanstack/react-router'
import SubmitRun from '@/pages/SubmitRun'

export const Route = createFileRoute('/submit')({
  component: SubmitRun,
})

