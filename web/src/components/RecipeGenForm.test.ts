import { describe, expect, it } from 'vitest'
import { canGenerateRecipes } from './RecipeGenForm'

describe('canGenerateRecipes', () => {
  it('returns false when hunger text is empty and no filters are selected', () => {
    expect(canGenerateRecipes('', new Set())).toBe(false)
    expect(canGenerateRecipes('   ', new Set())).toBe(false)
  })

  it('returns true when hunger text is present', () => {
    expect(canGenerateRecipes('chicken bowl', new Set())).toBe(true)
  })

  it('returns true when at least one filter is selected', () => {
    expect(canGenerateRecipes('', new Set(['vegan']))).toBe(true)
  })
})
