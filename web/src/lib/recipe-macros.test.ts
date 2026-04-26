import { describe, expect, it, vi } from 'vitest'
import { estimateMacrosForRecipes } from './recipe-macros'
import type { Recipe } from './types/recipe'

function makeRecipe(title: string, ingredients: Array<{ name: string; amount: string }>): Recipe {
  return {
    title,
    ingredientGroups: [
      {
        title: 'Ingredients',
        ingredients: ingredients.map((ingredient) => ({
          name: ingredient.name,
          amount: ingredient.amount,
        })),
      },
    ],
    ingredients: ingredients.map((ingredient) => ({
      name: ingredient.name,
      amount: ingredient.amount,
    })),
    steps: ['Cook and serve'],
  }
}

describe('estimateMacrosForRecipes', () => {
  it('dedupes ingredient lookups and returns per-ingredient + recipe macros', async () => {
    const recipes = [
      makeRecipe('Chicken rice bowl', [
        { name: 'Chicken breast', amount: '200 g' },
        { name: 'Cooked rice', amount: '100 g' },
      ]),
      makeRecipe('Chicken snack', [{ name: 'Chicken breast', amount: '100 g' }]),
    ]

    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { query?: string }
      const query = (body.query ?? '').toLowerCase()
      const byName =
        query.includes('chicken')
          ? {
              foods: [
                {
                  foodNutrients: [
                    { nutrientId: 1008, value: 165 },
                    { nutrientId: 1003, value: 31 },
                    { nutrientId: 1005, value: 0 },
                    { nutrientId: 1004, value: 3.6 },
                  ],
                },
              ],
            }
          : {
              foods: [
                {
                  foodNutrients: [
                    { nutrientId: 1008, value: 130 },
                    { nutrientId: 1003, value: 2.4 },
                    { nutrientId: 1005, value: 28.2 },
                    { nutrientId: 1004, value: 0.3 },
                  ],
                },
              ],
            }
      return new Response(JSON.stringify(byName), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    })

    const result = await estimateMacrosForRecipes(recipes, {
      apiKey: 'test-key',
      fetchImpl,
    })

    expect(fetchImpl).toHaveBeenCalledTimes(2)

    const chickenRice = result[0]
    expect(chickenRice.macroSummary?.calories).toBeCloseTo(460, 1)
    expect(chickenRice.macroSummary?.protein).toBeCloseTo(64.4, 1)
    expect(chickenRice.macroSummary?.carbs).toBeCloseTo(28.2, 1)
    expect(chickenRice.macroSummary?.fat).toBeCloseTo(7.5, 1)
    expect(chickenRice.ingredients[0].macroSummary?.calories).toBeCloseTo(330, 1)
    expect(chickenRice.ingredients[1].macroSummary?.calories).toBeCloseTo(130, 1)

    const chickenSnack = result[1]
    expect(chickenSnack.macroSummary?.calories).toBeCloseTo(165, 1)
    expect(chickenSnack.ingredients[0].macroSummary?.protein).toBeCloseTo(31, 1)
  })
})
