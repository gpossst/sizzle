import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  products: defineTable({
    title: v.string(),
    imageId: v.string(),
    price: v.number(),
  }),
  recipeGenerations: defineTable({
    userId: v.string(),
    recipeJson: v.string(),
    favorited: v.optional(v.boolean()),
    createdAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_createdAt', ['userId', 'createdAt']),
  userEntitlements: defineTable({
    userId: v.string(),
    planTier: v.union(v.literal('free'), v.literal('paid')),
    tokensRemaining: v.number(),
    tokensWeekKey: v.string(),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    subscriptionStatus: v.optional(v.string()),
    currentPeriodEnd: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_stripe_customer', ['stripeCustomerId'])
    .index('by_stripe_subscription', ['stripeSubscriptionId']),
  todos: defineTable({
    text: v.string(),
    completed: v.boolean(),
  }),
})
