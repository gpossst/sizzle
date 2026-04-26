import { createFileRoute } from '@tanstack/react-router'
import { createLogoutResponse } from '#/lib/central-auth'

export const Route = createFileRoute('/auth/logout')({
  server: {
    handlers: {
      POST: () => createLogoutResponse(),
    },
  },
  component: () => null,
})

