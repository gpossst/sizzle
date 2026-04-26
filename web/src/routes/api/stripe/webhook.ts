import { createFileRoute } from '@tanstack/react-router'
import type Stripe from 'stripe'
import { getStripeClient, getStripeWebhookSecret } from '#/lib/stripe'
import {
  PAID_PLAN_TOKENS_PER_WEEK,
  getCurrentWeekKey,
  getPlanTierFromSubscriptionStatus,
} from '#/lib/entitlements'
import {
  updateEntitlementForStripeCustomer,
  updateUserEntitlementByUserId,
} from '#/lib/user-entitlements-store'

export const Route = createFileRoute('/api/stripe/webhook')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const stripe = getStripeClient()
        const signature = request.headers.get('stripe-signature')
        if (!signature) {
          return new Response('Missing stripe-signature header', { status: 400 })
        }

        let event: Stripe.Event
        try {
          const payload = await request.text()
          event = stripe.webhooks.constructEvent(
            payload,
            signature,
            getStripeWebhookSecret(),
          )
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Invalid webhook signature'
          return new Response(message, { status: 400 })
        }

        try {
          switch (event.type) {
            case 'checkout.session.completed': {
              const session = event.data.object
              const userId = session.metadata?.userId ?? session.client_reference_id
              const customerId =
                typeof session.customer === 'string' ? session.customer : undefined
              const subscriptionId =
                typeof session.subscription === 'string'
                  ? session.subscription
                  : undefined
              if (userId) {
                await updateUserEntitlementByUserId({
                  userId,
                  planTier: 'paid',
                  tokensRemaining: PAID_PLAN_TOKENS_PER_WEEK,
                  tokensWeekKey: getCurrentWeekKey(),
                  stripeCustomerId: customerId,
                  stripeSubscriptionId: subscriptionId,
                  subscriptionStatus: 'active',
                })
              }
              break
            }
            case 'customer.subscription.updated':
            case 'customer.subscription.deleted': {
              const subscription = event.data.object
              const customerId =
                typeof subscription.customer === 'string'
                  ? subscription.customer
                  : null
              if (customerId) {
                await updateEntitlementForStripeCustomer({
                  stripeCustomerId: customerId,
                  planTier: getPlanTierFromSubscriptionStatus(subscription.status),
                  stripeSubscriptionId: subscription.id,
                  subscriptionStatus: subscription.status,
                  currentPeriodEnd: subscription.current_period_end * 1000,
                })
              }
              break
            }
            default:
              break
          }
          return Response.json({ received: true })
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Webhook processing failed'
          return Response.json({ error: message }, { status: 500 })
        }
      },
    },
  },
})
