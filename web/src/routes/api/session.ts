import { createFileRoute } from '@tanstack/react-router'
import { getSizzleSession } from '#/lib/central-auth'
import { getRefreshedUserEntitlement } from '#/lib/user-entitlements-store'

export const Route = createFileRoute('/api/session')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = await getSizzleSession(request)
        if (!session?.user.id) {
          return Response.json({ session: null })
        }
        const entitlement = await getRefreshedUserEntitlement(session.user.id)
        return Response.json({ session: { ...session, entitlement } })
      },
    },
  },
})

