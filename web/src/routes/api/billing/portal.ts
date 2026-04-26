import { createFileRoute } from '@tanstack/react-router'
import { getSizzleSession } from '#/lib/central-auth'
import { getStripeClient } from '#/lib/stripe'
import { getRefreshedUserEntitlement } from '#/lib/user-entitlements-store'

export const Route = createFileRoute('/api/billing/portal')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const session = await getSizzleSession(request)
        if (!session?.user.id) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }

        try {
          const entitlement = await getRefreshedUserEntitlement(session.user.id)
          if (!entitlement.stripeCustomerId) {
            return Response.json(
              { error: 'No Stripe customer found for this account' },
              { status: 400 },
            )
          }

          const stripe = getStripeClient()
          const origin = new URL(request.url).origin
          const portal = await stripe.billingPortal.sessions.create({
            customer: entitlement.stripeCustomerId,
            return_url: `${origin}/`,
          })
          return Response.json({ url: portal.url })
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Failed to open billing portal'
          return Response.json({ error: message }, { status: 500 })
        }
      },
    },
  },
})
