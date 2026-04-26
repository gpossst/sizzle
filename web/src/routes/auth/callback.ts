import { createFileRoute } from '@tanstack/react-router'
import { handleAuthCallback } from '#/lib/central-auth'

export const Route = createFileRoute('/auth/callback')({
  server: {
    handlers: {
      GET: ({ request }) => handleAuthCallback(request),
    },
  },
  component: () => null,
})

