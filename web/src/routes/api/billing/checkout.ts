import { createFileRoute } from '@tanstack/react-router'
import { getSizzleSession } from '#/lib/central-auth'
import { getStripeClient, getStripePriceId } from '#/lib/stripe'
import {
  getRefreshedUserEntitlement,
  updateUserEntitlementByUserId,
} from '#/lib/user-entitlements-store'

export const Route = createFileRoute('/api/billing/checkout')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const session = await getSizzleSession(request)
        if (!session?.user.id) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }

        try {
          const body = (await request.json().catch(() => ({}))) as {
            plan?: 'monthly' | 'yearly'
          }
          const plan = body.plan === 'yearly' ? 'yearly' : 'monthly'
          const stripe = getStripeClient()
          const entitlement = await getRefreshedUserEntitlement(session.user.id)

          let customerId = entitlement.stripeCustomerId
          if (!customerId) {
            const customer = await stripe.customers.create({
              email: session.user.email,
              name: session.user.name,
              metadata: { userId: session.user.id },
            })
            customerId = customer.id
            await updateUserEntitlementByUserId({
              userId: session.user.id,
              stripeCustomerId: customerId,
            })
          }

          const origin = new URL(request.url).origin
          const checkout = await stripe.checkout.sessions.create({
            mode: 'subscription',
            customer: customerId,
            line_items: [{ price: getStripePriceId(plan), quantity: 1 }],
            success_url: `${origin}/?billing=success`,
            cancel_url: `${origin}/?billing=cancel`,
            client_reference_id: session.user.id,
            metadata: { userId: session.user.id, plan },
            subscription_data: { metadata: { userId: session.user.id, plan } },
            allow_promotion_codes: true,
          })

          if (!checkout.url) {
            throw new Error('Stripe checkout URL missing')
          }
          return Response.json({ url: checkout.url })
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Failed to start checkout'
          return Response.json({ error: message }, { status: 500 })
        }
      },
    },
  },
})
