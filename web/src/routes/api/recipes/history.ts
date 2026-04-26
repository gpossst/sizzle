import { createFileRoute } from '@tanstack/react-router'
import { getSizzleSession } from '#/lib/central-auth'
import { listRecipeGenerationsForUser } from '#/lib/recipe-generation-store'

export const Route = createFileRoute('/api/recipes/history')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = await getSizzleSession(request)
        if (!session?.user.id) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }

        try {
          const url = new URL(request.url)
          const limitValue = url.searchParams.get('limit')
          const parsedLimit = limitValue ? Number(limitValue) : undefined
          const limit =
            typeof parsedLimit === 'number' &&
            Number.isFinite(parsedLimit) &&
            parsedLimit > 0
              ? parsedLimit
              : undefined

          const generations = await listRecipeGenerationsForUser({
            userId: session.user.id,
            limit,
          })
          return Response.json({ generations })
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Failed to load history'
          return Response.json({ error: message }, { status: 500 })
        }
      },
    },
  },
})
