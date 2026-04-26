import Stripe from 'stripe'

let stripeClient: Stripe | null = null

function readRequiredEnv(name: string) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

export function getStripeClient() {
  if (stripeClient) return stripeClient
  stripeClient = new Stripe(readRequiredEnv('STRIPE_SECRET_KEY'))
  return stripeClient
}

export function getStripeWebhookSecret() {
  return readRequiredEnv('STRIPE_WEBHOOK_SECRET')
}

export function getStripePriceId(plan: 'monthly' | 'yearly') {
  return plan === 'yearly'
    ? readRequiredEnv('STRIPE_PRICE_YEARLY')
    : readRequiredEnv('STRIPE_PRICE_MONTHLY')
}
