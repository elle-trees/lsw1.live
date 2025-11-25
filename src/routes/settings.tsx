import { createFileRoute } from '@tanstack/react-router'
import UserSettings from '@/pages/UserSettings'

export const Route = createFileRoute('/settings')({
  component: UserSettings,
})

