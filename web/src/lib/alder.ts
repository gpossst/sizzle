import { RECIPE_EXTRACTION_SCHEMA } from '#/lib/recipe-schema'
import { estimateMacrosForRecipes } from '#/lib/recipe-macros'
import type {
  Recipe,
  RecipeIngredient,
  RecipeSourceRef,
} from '#/lib/types/recipe'

type AlderParseResponse = {
  status?: number
  charge?: number
  data?: unknown
  sources?: RecipeSourceRef[] | null
}

type JsonValue =
  | null
  | boolean
  | number
  | string
  | readonly JsonValue[]
  | { [key: string]: JsonValue }

/**
 * Some model providers behind Alder reject certain JSON Schema keywords (for example
 * `additionalProperties` inside response_schema). We keep the strict authoring schema
 * locally, but remove unsupported keys before sending to the parse endpoint.
 */
function sanitizeSchemaForAlder(value: JsonValue): JsonValue {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeSchemaForAlder(item))
  }
  if (value && typeof value === 'object') {
    const output: Record<string, JsonValue> = {}
    for (const [key, child] of Object.entries(value)) {
      if (key === 'additionalProperties') continue
      output[key] = sanitizeSchemaForAlder(child)
    }
    return output
  }
  return value
}

function normalizeParsedData(raw: unknown): { recipes: Recipe[] } {
  if (raw == null) return { recipes: [] }
  if (typeof raw === 'string') {
    try {
      return normalizeParsedData(JSON.parse(raw))
    } catch {
      return { recipes: [] }
    }
  }
  if (hasRecipes(raw)) {
    const recipes = raw.recipes
    if (!Array.isArray(recipes)) return { recipes: [] }
    return {
      recipes: recipes.filter(isRecipeLike).map(coerceRecipe),
    }
  }
  return { recipes: [] }
}

function hasRecipes(raw: unknown): raw is { recipes: unknown } {
  return typeof raw === 'object' && raw !== null && 'recipes' in raw
}

function isRecipeLike(r: unknown): r is Record<string, unknown> {
  return typeof r === 'object' && r !== null
}

/** Keyword-style query for retrieval (like a web search); ensures a `recipe` term. */
function normalizeRecipeSearchQuery(preference: string): string {
  const q = preference.trim().replace(/\s+/g, ' ')
  if (!q) return 'recipe'
  return q.toLowerCase().endsWith(' recipe') ? q : `${q} recipe`
}

function coerceIngredient(i: unknown): RecipeIngredient | null {
  if (typeof i !== 'object' || i === null) return null
  const item = i as Record<string, unknown>
  const name = String(item.name ?? '').trim()
  const amount = String(item.amount ?? '').trim()
  if (!name || !amount) return null
  return {
    name,
    amount,
    note: item.note != null ? String(item.note).trim() : undefined,
  }
}

function isRecipeIngredient(
  ingredient: RecipeIngredient | null,
): ingredient is RecipeIngredient {
  return ingredient !== null
}

function coerceRecipe(r: Record<string, unknown>): Recipe {
  const ingredientGroupsRaw = r.ingredientGroups
  const ingredientsRaw = r.ingredients
  const stepsRaw = r.steps
  const ingredientGroups = Array.isArray(ingredientGroupsRaw)
    ? ingredientGroupsRaw
        .filter(
          (group): group is Record<string, unknown> =>
            typeof group === 'object' && group !== null,
        )
        .map((group) => ({
          title: String(group.title ?? '').trim(),
          ingredients: Array.isArray(group.ingredients)
            ? group.ingredients.map(coerceIngredient).filter(isRecipeIngredient)
            : [],
        }))
        .filter((group) => group.title && group.ingredients.length > 0)
    : []
  const ingredients = Array.isArray(ingredientsRaw)
    ? ingredientsRaw.map(coerceIngredient).filter(isRecipeIngredient)
    : ingredientGroups.flatMap((group) => group.ingredients)
  const steps = Array.isArray(stepsRaw)
    ? stepsRaw.map((s) => String(s)).filter(Boolean)
    : []

  const normalizedGroups =
    ingredientGroups.length > 0
      ? ingredientGroups
      : ingredients.length > 0
        ? [{ title: 'Ingredients', ingredients }]
        : []

  return {
    title: String(r.title ?? 'Untitled recipe'),
    summary: r.summary != null ? String(r.summary) : undefined,
    prepTime: r.prepTime != null ? String(r.prepTime) : undefined,
    cookTime: r.cookTime != null ? String(r.cookTime) : undefined,
    servings: r.servings != null ? String(r.servings) : undefined,
    ingredients,
    ingredientGroups: normalizedGroups,
    steps,
    sourceAttribution:
      r.sourceAttribution != null ? String(r.sourceAttribution) : undefined,
  }
}

/**
 * Calls Alder’s Parse API: https://alder.so/documentation/api/parse
 * Set ALDER_API_URL to the full parse URL (e.g. https://api.alder.so/v1/parse).
 */
export async function generateRecipesFromPreference(
  preference: string,
  recipeCount: number,
): Promise<{
  recipes: Recipe[]
  sources: RecipeSourceRef[]
  charge?: number
  requestedRecipeCount: number
}> {
  const url = process.env.ALDER_API_URL
  const key = process.env.ALDER_API_KEY
  if (!url || !key) {
    throw new Error(
      'Recipe search is not configured. Set ALDER_API_URL and ALDER_API_KEY.',
    )
  }

  // Web-search-style keywords (not an instruction); recipe count is only in `prompt` + `limit`.
  const query = normalizeRecipeSearchQuery(preference)
  const prompt = `Extract exactly ${recipeCount} complete recipe${recipeCount === 1 ? '' : 's'} from the sources. Each recipe must include title, ingredientGroups, and step-by-step instructions. ingredientGroups should separate recipe components such as Main, Sauce, Toppings, or Filling; if only one component exists, use a single group named Ingredients. For each recipe, every ingredient line must include name and amount (optional note). Recipe ingredient amounts must be specific quantities with units (e.g. 2 cups, 15 ml, 3 cloves, 1 lb boneless chicken)—infer from context when sources omit them. Use the exact phrase "to taste" ONLY for salt, pepper, and similar finishing seasonings or optional heat; NEVER use "to taste" for primary foods in the recipe: proteins, pasta/grains/starches, bulk produce, citrus or juice in the dish, cooking fats/oils in quantity, wine/stock/broth, dairy used as a main component, or any ingredient that defines the portion of the meal. Never apply "to taste" to every line or to non-seasoning items. Never vague quantities like "some", "a little", or "a bit". Return exactly ${recipeCount} recipes in the "recipes" array.`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
    },
    body: JSON.stringify({
      query,
      prompt,
      schema: sanitizeSchemaForAlder(RECIPE_EXTRACTION_SCHEMA),
      limit: Math.max(recipeCount, 1),
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(
      `Alder request failed (${res.status}): ${text.slice(0, 500)}`,
    )
  }

  const json = (await res.json()) as AlderParseResponse
  const { recipes } = normalizeParsedData(json.data)
  if (recipes.length === 0) {
    throw new Error(
      'No recipes could be extracted from sources. Try a more specific query or different wording.',
    )
  }
  const sources = Array.isArray(json.sources) ? json.sources : []
  const capped =
    recipes.length > recipeCount ? recipes.slice(0, recipeCount) : recipes
  const macroEnriched = await estimateMacrosForRecipes(capped)

  return {
    recipes: macroEnriched,
    sources,
    charge: json.charge,
    requestedRecipeCount: recipeCount,
  }
}
