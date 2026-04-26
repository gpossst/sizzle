import { ConvexHttpClient } from 'convex/browser'
import type { Recipe } from '#/lib/types/recipe'

type SavedGeneration = {
  id: string
  recipe: Recipe
  favorited: boolean
  createdAt: number
}

function getConvexClient() {
  const url = process.env.VITE_CONVEX_URL
  if (!url) {
    throw new Error('Missing VITE_CONVEX_URL for recipe persistence.')
  }
  return new ConvexHttpClient(url)
}

export async function saveRecipeGeneration(input: {
  userId: string
  recipes: Recipe[]
}) {
  const client = getConvexClient()
  await (client as any).mutation('recipes:saveGeneration', {
    userId: input.userId,
    recipesJson: input.recipes.map((recipe) => JSON.stringify(recipe)),
  })
}

export async function listRecipeGenerationsForUser(input: {
  userId: string
  limit?: number
}): Promise<SavedGeneration[]> {
  const client = getConvexClient()
  const args: { userId: string; limit?: number } = { userId: input.userId }
  if (typeof input.limit === 'number') {
    args.limit = input.limit
  }

  const rows = (await (client as any).query(
    'recipes:listGenerationsByUser',
    args,
  )) as Array<{
    _id: string
    recipeJson?: string
    recipesJson?: string
    favorited?: boolean
    createdAt: number
  }>

  return rows
    .map((row) => {
      const singleRecipe =
        row.recipeJson != null
          ? (JSON.parse(row.recipeJson) as Recipe)
          : (() => {
              if (typeof row.recipesJson !== 'string') return null
              const legacyRecipes = JSON.parse(row.recipesJson) as Recipe[]
              return legacyRecipes[0] ?? null
            })()
      if (!singleRecipe) return null
      return {
        id: row._id,
        recipe: singleRecipe,
        favorited: row.favorited ?? false,
        createdAt: row.createdAt,
      }
    })
    .filter((row): row is SavedGeneration => row !== null)
}

export async function countRecipeGenerationsForUser(input: { userId: string }) {
  const client = getConvexClient()
  return (await (client as any).query('recipes:countGenerationsByUser', {
    userId: input.userId,
  })) as number
}

export async function setRecipeGenerationFavorite(input: {
  userId: string
  generationId: string
  favorited: boolean
}): Promise<boolean> {
  const client = getConvexClient()
  return await (client as any).mutation('recipes:setGenerationFavorite', input)
}

export async function deleteRecipeGeneration(input: {
  userId: string
  generationId: string
}): Promise<boolean> {
  const client = getConvexClient()
  return await (client as any).mutation('recipes:deleteGeneration', input)
}
