import { createFileRoute } from '@tanstack/react-router'
import { generateRecipesFromPreference } from '#/lib/alder'
import { getSizzleSession } from '#/lib/central-auth'
import { canSaveRecipes, consumeTokens } from '#/lib/entitlements'
import { recipeGenerateInputSchema } from '#/lib/recipes-contract'
import {
  countRecipeGenerationsForUser,
  saveRecipeGeneration,
} from '#/lib/recipe-generation-store'
import {
  getRefreshedUserEntitlement,
  updateUserEntitlementByUserId,
} from '#/lib/user-entitlements-store'

export const Route = createFileRoute('/api/recipes/generate')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const session = await getSizzleSession(request)
        if (!session?.user.id) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json().catch(() => null)
        const parsed = recipeGenerateInputSchema.safeParse(body)
        if (!parsed.success) {
          return Response.json(
            {
              error: 'Invalid request payload',
              details: parsed.error.issues.map((issue) => issue.message),
            },
            { status: 400 },
          )
        }

        try {
          const entitlement = await getRefreshedUserEntitlement(session.user.id)
          const tokenCheck = consumeTokens({
            tokensRemaining: entitlement.tokensRemaining,
            amount: parsed.data.recipeCount,
          })
          if (!tokenCheck.ok) {
            return Response.json(
              { error: tokenCheck.error, code: 'insufficient_tokens' },
              { status: 403 },
            )
          }

          const savedCount = await countRecipeGenerationsForUser({
            userId: session.user.id,
          })
          const saveCheck = canSaveRecipes({
            planTier: entitlement.planTier,
            existingSavedCount: savedCount,
            incomingCount: parsed.data.recipeCount,
          })
          if (!saveCheck.ok) {
            return Response.json(
              { error: saveCheck.error, code: 'recipe_save_limit' },
              { status: 403 },
            )
          }

          const result = await generateRecipesFromPreference(
            parsed.data.preference,
            parsed.data.recipeCount,
          )

          await saveRecipeGeneration({
            userId: session.user.id,
            recipes: result.recipes,
          })

          const finalTokenUpdate = consumeTokens({
            tokensRemaining: entitlement.tokensRemaining,
            amount: result.recipes.length,
          })
          const nextTokens = finalTokenUpdate.ok
            ? finalTokenUpdate.tokensRemaining
            : entitlement.tokensRemaining
          await updateUserEntitlementByUserId({
            userId: session.user.id,
            tokensRemaining: nextTokens,
          })

          return Response.json({
            recipes: result.recipes,
            sources: result.sources,
            charge: result.charge,
            recipeCount: parsed.data.recipeCount,
            tokensRemaining: nextTokens,
          })
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Failed to generate recipes'
          return Response.json({ error: message }, { status: 500 })
        }
      },
    },
  },
})
