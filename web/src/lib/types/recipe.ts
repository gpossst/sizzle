export type RecipeSourceRef = {
  name: string
  link: string
  preview?: string
}

export type RecipeIngredient = {
  name: string
  amount: string
  note?: string
  macroSummary?: RecipeMacroSummary
}

export type RecipeIngredientGroup = {
  title: string
  ingredients: RecipeIngredient[]
}

export type Recipe = {
  title: string
  summary?: string
  prepTime?: string
  cookTime?: string
  servings?: string
  ingredients: RecipeIngredient[]
  ingredientGroups: RecipeIngredientGroup[]
  steps: string[]
  sourceAttribution?: string
  macroSummary?: RecipeMacroSummary
  macroSummaryPerServing?: RecipeMacroSummary
}

export type RecipeMacroSummary = {
  calories: number
  protein: number
  carbs: number
  fat: number
}
