import type { Recipe, RecipeIngredient, RecipeMacroSummary } from '#/lib/types/recipe'

const USDA_FDC_SEARCH_URL = 'https://api.nal.usda.gov/fdc/v1/foods/search'

type NutrientHit = {
  nutrientId?: number
  nutrientName?: string
  value?: number
  amount?: number
}

type FdcFood = {
  foodNutrients?: NutrientHit[]
}

type FdcSearchResponse = {
  foods?: FdcFood[]
}

type EstimateOptions = {
  apiKey?: string
  fetchImpl?: typeof fetch
}

type Per100gMacros = RecipeMacroSummary

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

function parseServings(servings?: string): number | null {
  if (!servings) return null
  const match = servings.match(/(\d+(\.\d+)?)/)
  if (!match) return null
  const value = Number(match[1])
  return Number.isFinite(value) && value > 0 ? value : null
}

function normalizeIngredientName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

function ingredientToGrams(ingredient: RecipeIngredient): number | null {
  const raw = ingredient.amount.toLowerCase().trim()
  const valueMatch = raw.match(/(\d+(\.\d+)?)/)
  if (!valueMatch) return null
  const amount = Number(valueMatch[1])
  if (!Number.isFinite(amount) || amount <= 0) return null

  const unitMap: Array<{ re: RegExp; multiplier: number }> = [
    { re: /\bkg\b|\bkilogram/, multiplier: 1000 },
    { re: /\bg\b|\bgram/, multiplier: 1 },
    { re: /\blb\b|\bpound/, multiplier: 453.592 },
    { re: /\boz\b|\bounces?\b/, multiplier: 28.3495 },
    { re: /\bcups?\b/, multiplier: 240 },
    { re: /\btbsp\b|\btablespoons?\b/, multiplier: 15 },
    { re: /\btsp\b|\bteaspoons?\b/, multiplier: 5 },
    { re: /\bml\b/, multiplier: 1 },
    { re: /\bl\b|\bliter/, multiplier: 1000 },
  ]

  const matched = unitMap.find((unit) => unit.re.test(raw))
  if (!matched) return null
  return amount * matched.multiplier
}

function getNutrientValue(nutrients: NutrientHit[], ids: number[], names: string[]): number {
  const byId = nutrients.find(
    (nutrient) =>
      typeof nutrient.nutrientId === 'number' &&
      ids.includes(nutrient.nutrientId) &&
      typeof (nutrient.value ?? nutrient.amount) === 'number',
  )
  if (byId) {
    return Number(byId.value ?? byId.amount ?? 0)
  }
  const byName = nutrients.find((nutrient) => {
    if (!nutrient.nutrientName) return false
    const lowered = nutrient.nutrientName.toLowerCase()
    return names.some((name) => lowered.includes(name))
  })
  return Number(byName?.value ?? byName?.amount ?? 0)
}

function toSummary(values: { calories: number; protein: number; carbs: number; fat: number }): RecipeMacroSummary {
  return {
    calories: round1(values.calories),
    protein: round1(values.protein),
    carbs: round1(values.carbs),
    fat: round1(values.fat),
  }
}

function scaleMacros(per100g: Per100gMacros, grams: number): RecipeMacroSummary {
  const factor = grams / 100
  return toSummary({
    calories: per100g.calories * factor,
    protein: per100g.protein * factor,
    carbs: per100g.carbs * factor,
    fat: per100g.fat * factor,
  })
}

function addSummaries(parts: RecipeMacroSummary[]): RecipeMacroSummary {
  return toSummary(
    parts.reduce(
      (acc, part) => ({
        calories: acc.calories + part.calories,
        protein: acc.protein + part.protein,
        carbs: acc.carbs + part.carbs,
        fat: acc.fat + part.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    ),
  )
}

async function lookupPer100g(
  ingredientName: string,
  apiKey: string,
  fetchImpl: typeof fetch,
): Promise<Per100gMacros | null> {
  const url = `${USDA_FDC_SEARCH_URL}?api_key=${encodeURIComponent(apiKey)}`
  const res = await fetchImpl(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: ingredientName,
      pageSize: 1,
    }),
  })
  if (!res.ok) return null
  const json = (await res.json()) as FdcSearchResponse
  const food = json.foods?.[0]
  const nutrients = food?.foodNutrients ?? []
  if (nutrients.length === 0) return null

  return toSummary({
    calories: getNutrientValue(nutrients, [1008], ['energy']),
    protein: getNutrientValue(nutrients, [1003], ['protein']),
    carbs: getNutrientValue(nutrients, [1005], ['carbohydrate']),
    fat: getNutrientValue(nutrients, [1004], ['total lipid', 'fat']),
  })
}

export async function estimateMacrosForRecipes(
  recipes: Recipe[],
  options: EstimateOptions = {},
): Promise<Recipe[]> {
  const apiKey = options.apiKey ?? process.env.FDC_API_KEY
  if (!apiKey) return recipes
  const fetchImpl = options.fetchImpl ?? fetch

  const uniqueNames = new Set<string>()
  for (const recipe of recipes) {
    for (const ingredient of recipe.ingredients) {
      uniqueNames.add(normalizeIngredientName(ingredient.name))
    }
  }

  const per100gByIngredient = new Map<string, Per100gMacros | null>()
  await Promise.all(
    Array.from(uniqueNames).map(async (name) => {
      try {
        const macros = await lookupPer100g(name, apiKey, fetchImpl)
        per100gByIngredient.set(name, macros)
      } catch {
        per100gByIngredient.set(name, null)
      }
    }),
  )

  return recipes.map((recipe) => {
    const enrichedIngredients = recipe.ingredients.map((ingredient) => {
      const normalizedName = normalizeIngredientName(ingredient.name)
      const per100g = per100gByIngredient.get(normalizedName) ?? null
      const grams = ingredientToGrams(ingredient)
      if (!per100g || !grams) {
        return ingredient
      }
      return {
        ...ingredient,
        macroSummary: scaleMacros(per100g, grams),
      }
    })

    const macroParts = enrichedIngredients
      .map((ingredient) => ingredient.macroSummary)
      .filter((macro): macro is RecipeMacroSummary => Boolean(macro))
    const recipeSummary = macroParts.length > 0 ? addSummaries(macroParts) : undefined
    const servings = parseServings(recipe.servings)
    const perServing =
      recipeSummary && servings
        ? toSummary({
            calories: recipeSummary.calories / servings,
            protein: recipeSummary.protein / servings,
            carbs: recipeSummary.carbs / servings,
            fat: recipeSummary.fat / servings,
          })
        : undefined

    const ingredientMap = new Map(
      enrichedIngredients.map((ingredient) => [ingredient.name, ingredient]),
    )
    const enrichedGroups = recipe.ingredientGroups.map((group) => ({
      ...group,
      ingredients: group.ingredients.map((ingredient) => {
        const hit = ingredientMap.get(ingredient.name)
        return hit?.macroSummary ? { ...ingredient, macroSummary: hit.macroSummary } : ingredient
      }),
    }))

    return {
      ...recipe,
      ingredients: enrichedIngredients,
      ingredientGroups: enrichedGroups,
      macroSummary: recipeSummary,
      macroSummaryPerServing: perServing,
    }
  })
}
