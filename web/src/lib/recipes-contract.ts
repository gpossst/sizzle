import { z } from 'zod'

export const recipeGenerateInputSchema = z.object({
  preference: z.string().trim().min(3).max(600),
  recipeCount: z.coerce.number().int().min(1).max(8).default(3),
})

export const recipeFavoriteInputSchema = z.object({
  favorited: z.boolean(),
})

export const recipeGenerationIdSchema = z.object({
  generationId: z.string().trim().min(1),
})

export type RecipeGenerateInput = z.infer<typeof recipeGenerateInputSchema>
export type RecipeFavoriteInput = z.infer<typeof recipeFavoriteInputSchema>
