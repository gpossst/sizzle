import { createFileRoute } from '@tanstack/react-router'
import { getSizzleSession } from '#/lib/central-auth'
import { recipeGenerationIdSchema } from '#/lib/recipes-contract'
import { deleteRecipeGeneration } from '#/lib/recipe-generation-store'

export const Route = createFileRoute('/api/recipes/$generationId')({
  server: {
    handlers: {
      DELETE: async ({ request, params }) => {
        const session = await getSizzleSession(request)
        if (!session?.user.id) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const parsedParams = recipeGenerationIdSchema.safeParse(params)
        if (!parsedParams.success) {
          return Response.json({ error: 'Invalid generation id' }, { status: 400 })
        }

        try {
          const deleted = await deleteRecipeGeneration({
            userId: session.user.id,
            generationId: parsedParams.data.generationId,
          })
          if (!deleted) {
            return Response.json({ error: 'Recipe generation not found' }, { status: 404 })
          }
          return Response.json({ ok: true })
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Failed to delete generation'
          return Response.json({ error: message }, { status: 500 })
        }
      },
    },
  },
})
