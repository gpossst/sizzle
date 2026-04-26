import { ConvexHttpClient } from 'convex/browser'
import {
  applyPlanTransition,
  applyWeeklyReset,
  FREE_PLAN_TOKENS_PER_WEEK,
} from '#/lib/entitlements'
import type { PlanTier } from '#/lib/entitlements'

export type UserEntitlement = {
  userId: string
  planTier: PlanTier
  tokensRemaining: number
  tokensWeekKey: string
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  subscriptionStatus?: string
  currentPeriodEnd?: number
}

function getConvexClient() {
  const url = process.env.VITE_CONVEX_URL
  if (!url) {
    throw new Error('Missing VITE_CONVEX_URL for user entitlements.')
  }
  return new ConvexHttpClient(url)
}

async function upsertEntitlement(input: {
  userId: string
  planTier?: PlanTier
  tokensRemaining?: number
  tokensWeekKey?: string
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  subscriptionStatus?: string
  currentPeriodEnd?: number
}) {
  const client = getConvexClient()
  return (await (client as any).mutation('entitlements:upsertByUserId', {
    ...input,
  })) as UserEntitlement
}

export async function getOrCreateUserEntitlement(userId: string) {
  const client = getConvexClient()
  const existing = (await (client as any).query('entitlements:getByUserId', {
    userId,
  })) as UserEntitlement | null

  if (!existing) {
    const created = await upsertEntitlement({
      userId,
      planTier: 'free',
      tokensRemaining: FREE_PLAN_TOKENS_PER_WEEK,
      tokensWeekKey: '',
    })
    return created
  }

  return existing
}

export async function getRefreshedUserEntitlement(userId: string) {
  const entitlement = await getOrCreateUserEntitlement(userId)
  const reset = applyWeeklyReset({
    planTier: entitlement.planTier,
    tokensRemaining: entitlement.tokensRemaining,
    tokensWeekKey: entitlement.tokensWeekKey,
  })
  if (!reset.didReset) return entitlement

  return await upsertEntitlement({
    userId,
    tokensRemaining: reset.tokensRemaining,
    tokensWeekKey: reset.tokensWeekKey,
  })
}

export async function updateEntitlementForStripeCustomer(input: {
  stripeCustomerId: string
  planTier: PlanTier
  stripeSubscriptionId?: string
  subscriptionStatus?: string
  currentPeriodEnd?: number
}) {
  const client = getConvexClient()
  const entitlement = (await (client as any).query(
    'entitlements:getByStripeCustomerId',
    { stripeCustomerId: input.stripeCustomerId },
  )) as UserEntitlement | null

  if (!entitlement) return null

  const transition = applyPlanTransition({
    currentPlanTier: entitlement.planTier,
    nextPlanTier: input.planTier,
    tokensRemaining: entitlement.tokensRemaining,
    tokensWeekKey: entitlement.tokensWeekKey,
  })

  return await upsertEntitlement({
    userId: entitlement.userId,
    planTier: input.planTier,
    stripeCustomerId: input.stripeCustomerId,
    stripeSubscriptionId: input.stripeSubscriptionId,
    subscriptionStatus: input.subscriptionStatus,
    currentPeriodEnd: input.currentPeriodEnd,
    tokensRemaining: transition.tokensRemaining,
    tokensWeekKey: transition.tokensWeekKey,
  })
}

export async function updateUserEntitlementByUserId(input: {
  userId: string
  planTier?: PlanTier
  tokensRemaining?: number
  tokensWeekKey?: string
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  subscriptionStatus?: string
  currentPeriodEnd?: number
}) {
  return await upsertEntitlement(input)
}
