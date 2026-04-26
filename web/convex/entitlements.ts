import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { FREE_PLAN_TOKENS_PER_WEEK } from '../src/lib/entitlements'

export const getByUserId = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('userEntitlements')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .first()
  },
})

export const getByStripeCustomerId = query({
  args: { stripeCustomerId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('userEntitlements')
      .withIndex('by_stripe_customer', (q) =>
        q.eq('stripeCustomerId', args.stripeCustomerId),
      )
      .first()
  },
})

export const upsertByUserId = mutation({
  args: {
    userId: v.string(),
    planTier: v.optional(v.union(v.literal('free'), v.literal('paid'))),
    tokensRemaining: v.optional(v.number()),
    tokensWeekKey: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    subscriptionStatus: v.optional(v.string()),
    currentPeriodEnd: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('userEntitlements')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .first()
    const updatedAt = Date.now()

    if (!existing) {
      const id = await ctx.db.insert('userEntitlements', {
        userId: args.userId,
        planTier: args.planTier ?? 'free',
        tokensRemaining: args.tokensRemaining ?? FREE_PLAN_TOKENS_PER_WEEK,
        tokensWeekKey: args.tokensWeekKey ?? '',
        stripeCustomerId: args.stripeCustomerId,
        stripeSubscriptionId: args.stripeSubscriptionId,
        subscriptionStatus: args.subscriptionStatus,
        currentPeriodEnd: args.currentPeriodEnd,
        updatedAt,
      })
      return await ctx.db.get(id)
    }

    const patch: Record<string, unknown> = { updatedAt }
    if (args.planTier !== undefined) patch.planTier = args.planTier
    if (args.tokensRemaining !== undefined) patch.tokensRemaining = args.tokensRemaining
    if (args.tokensWeekKey !== undefined) patch.tokensWeekKey = args.tokensWeekKey
    if (args.stripeCustomerId !== undefined) {
      patch.stripeCustomerId = args.stripeCustomerId
    }
    if (args.stripeSubscriptionId !== undefined) {
      patch.stripeSubscriptionId = args.stripeSubscriptionId
    }
    if (args.subscriptionStatus !== undefined) {
      patch.subscriptionStatus = args.subscriptionStatus
    }
    if (args.currentPeriodEnd !== undefined) {
      patch.currentPeriodEnd = args.currentPeriodEnd
    }

    await ctx.db.patch(existing._id, patch)
    return await ctx.db.get(existing._id)
  },
})
