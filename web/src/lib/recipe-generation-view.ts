import type { Recipe } from '#/lib/types/recipe'

export type RecipeGeneration = {
  id: string
  recipe: Recipe
  favorited: boolean
  createdAt: number
}

export type GroceryChecklistItem = {
  key: string
  name: string
  amount: string
  note?: string
  recipeIds: string[]
}

type ParsedAmount = {
  value: number
  unit: string
}

function normalizeIngredientKey(name: string): string {
  return name.trim().toLowerCase()
}

function parseAmount(amount: string): ParsedAmount | null {
  const trimmed = amount.trim()
  if (!trimmed) return null
  const match = trimmed.match(/^(\d+(?:\.\d+)?)(?:\s+(.+))?$/)
  if (!match) return null
  const value = Number(match[1])
  if (Number.isNaN(value)) return null
  return {
    value,
    unit: (match[2] ?? '').trim().toLowerCase(),
  }
}

function formatSummedAmount(value: number, unit: string): string {
  const rounded = Number.isInteger(value) ? `${value}` : `${value}`
  return unit ? `${rounded} ${unit}` : rounded
}

export function getRecentGenerations(
  generations: RecipeGeneration[],
  count: number,
): RecipeGeneration[] {
  return generations.slice(0, count)
}

export function splitActiveAndReturningGenerations(
  generations: RecipeGeneration[],
  activeGenerationIds: string[],
): {
  activeGenerations: RecipeGeneration[]
  returningGenerations: RecipeGeneration[]
} {
  if (activeGenerationIds.length === 0) {
    return {
      activeGenerations: generations,
      returningGenerations: [],
    }
  }

  const activeIdSet = new Set(activeGenerationIds)

  return {
    activeGenerations: generations.filter((generation) =>
      activeIdSet.has(generation.id),
    ),
    returningGenerations: generations.filter(
      (generation) => !activeIdSet.has(generation.id),
    ),
  }
}

export function getHistoryPreviewGenerations(
  generations: RecipeGeneration[],
  activeGenerationIds: string[],
  count = 3,
): RecipeGeneration[] {
  if (count <= 0) {
    return []
  }

  if (activeGenerationIds.length === 0) {
    return getRecentGenerations(generations, count)
  }

  const activeIdSet = new Set(activeGenerationIds)
  const nonActiveGenerations = generations.filter(
    (generation) => !activeIdSet.has(generation.id),
  )

  return getRecentGenerations(nonActiveGenerations, count)
}

export function filterGenerationsByQuery(
  generations: RecipeGeneration[],
  query: string,
): RecipeGeneration[] {
  const normalized = query.trim().toLowerCase()
  if (!normalized) {
    return generations
  }

  return generations.filter((generation) => {
    const { recipe } = generation
    const haystacks = [
      recipe.title,
      recipe.summary ?? '',
      ...recipe.ingredientGroups.map((group) => group.title),
      ...recipe.ingredientGroups.flatMap((group) =>
        group.ingredients.map(
          (ingredient) =>
            `${ingredient.amount} ${ingredient.name} ${ingredient.note ?? ''}`,
        ),
      ),
      ...recipe.steps,
    ]

    return haystacks.some((value) => value.toLowerCase().includes(normalized))
  })
}

export function getGroceryChecklist(
  generations: RecipeGeneration[],
  selectedGenerationIds: string[],
): GroceryChecklistItem[] {
  if (selectedGenerationIds.length === 0) {
    return []
  }

  const selectedIdSet = new Set(selectedGenerationIds)
  const selectedGenerations = generations.filter((generation) =>
    selectedIdSet.has(generation.id),
  )
  const aggregates = new Map<
    string,
    {
      name: string
      note?: string
      recipeIds: Set<string>
      parsedAmount: ParsedAmount | null
      rawAmounts: string[]
    }
  >()

  for (const generation of selectedGenerations) {
    for (const group of generation.recipe.ingredientGroups) {
      for (const ingredient of group.ingredients) {
        const key = normalizeIngredientKey(ingredient.name)
        if (!key) continue
        const parsedAmount = parseAmount(ingredient.amount)
        const current = aggregates.get(key)
        if (!current) {
          aggregates.set(key, {
            name: ingredient.name.trim(),
            note: ingredient.note,
            recipeIds: new Set([generation.id]),
            parsedAmount,
            rawAmounts: parsedAmount ? [] : [ingredient.amount.trim()],
          })
          continue
        }

        current.recipeIds.add(generation.id)
        if (!current.note && ingredient.note) {
          current.note = ingredient.note
        }

        if (current.parsedAmount && parsedAmount) {
          if (current.parsedAmount.unit === parsedAmount.unit) {
            current.parsedAmount = {
              value: current.parsedAmount.value + parsedAmount.value,
              unit: current.parsedAmount.unit,
            }
          } else {
            current.rawAmounts.push(formatSummedAmount(current.parsedAmount.value, current.parsedAmount.unit))
            current.rawAmounts.push(ingredient.amount.trim())
            current.parsedAmount = null
          }
        } else if (parsedAmount && current.rawAmounts.length === 0) {
          current.parsedAmount = parsedAmount
        } else {
          current.rawAmounts.push(ingredient.amount.trim())
        }
      }
    }
  }

  return [...aggregates.entries()]
    .map(([key, value]) => {
      const amount =
        value.parsedAmount !== null
          ? formatSummedAmount(value.parsedAmount.value, value.parsedAmount.unit)
          : value.rawAmounts.filter(Boolean).join(' + ')

      return {
        key,
        name: value.name,
        note: value.note,
        amount,
        recipeIds: [...value.recipeIds].sort(),
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}
