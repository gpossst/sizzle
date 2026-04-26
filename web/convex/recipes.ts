import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import type { Id } from './_generated/dataModel'

export const saveGeneration = mutation({
  args: {
    userId: v.string(),
    recipesJson: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const createdAt = Date.now()
    const ids = await Promise.all(
      args.recipesJson.map((recipeJson) =>
        ctx.db.insert('recipeGenerations', {
          userId: args.userId,
          recipeJson,
          favorited: false,
          createdAt,
        }),
      ),
    )
    return ids
  },
})

export const listGenerationsByUser = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const baseQuery = ctx.db
      .query('recipeGenerations')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .order('desc')

    const rows =
      typeof args.limit === 'number'
        ? await baseQuery.take(args.limit)
        : await baseQuery.collect()

    return rows
  },
})

export const countGenerationsByUser = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query('recipeGenerations')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect()
    return rows.length
  },
})

export const setGenerationFavorite = mutation({
  args: {
    generationId: v.string(),
    userId: v.string(),
    favorited: v.boolean(),
  },
  handler: async (ctx, args) => {
    const generationId = args.generationId as Id<'recipeGenerations'>
    const generation = await ctx.db.get(generationId)
    if (!generation || generation.userId !== args.userId) {
      return false
    }
    await ctx.db.patch(generationId, { favorited: args.favorited })
    return true
  },
})

export const deleteGeneration = mutation({
  args: {
    generationId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const generationId = args.generationId as Id<'recipeGenerations'>
    const generation = await ctx.db.get(generationId)
    if (!generation || generation.userId !== args.userId) {
      return false
    }
    await ctx.db.delete(generationId)
    return true
  },
})
