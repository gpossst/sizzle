import { createFileRoute } from '@tanstack/react-router'
import { createLoginRedirectResponse } from '#/lib/central-auth'

export const Route = createFileRoute('/auth/login')({
  server: {
    handlers: {
      GET: () => createLoginRedirectResponse(),
    },
  },
  component: () => null,
})

