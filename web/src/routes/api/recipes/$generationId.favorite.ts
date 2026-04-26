import { createFileRoute } from '@tanstack/react-router'
import { getSizzleSession } from '#/lib/central-auth'
import {
  recipeFavoriteInputSchema,
  recipeGenerationIdSchema,
} from '#/lib/recipes-contract'
import { setRecipeGenerationFavorite } from '#/lib/recipe-generation-store'

export const Route = createFileRoute('/api/recipes/$generationId/favorite')({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const session = await getSizzleSession(request)
        if (!session?.user.id) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const parsedParams = recipeGenerationIdSchema.safeParse(params)
        if (!parsedParams.success) {
          return Response.json({ error: 'Invalid generation id' }, { status: 400 })
        }

        const body = await request.json().catch(() => null)
        const parsedBody = recipeFavoriteInputSchema.safeParse(body)
        if (!parsedBody.success) {
          return Response.json({ error: 'Invalid request payload' }, { status: 400 })
        }

        try {
          const updated = await setRecipeGenerationFavorite({
            userId: session.user.id,
            generationId: parsedParams.data.generationId,
            favorited: parsedBody.data.favorited,
          })
          if (!updated) {
            return Response.json({ error: 'Recipe generation not found' }, { status: 404 })
          }
          return Response.json({ ok: true })
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Failed to update favorite'
          return Response.json({ error: message }, { status: 500 })
        }
      },
    },
  },
})
