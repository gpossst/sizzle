import { describe, expect, it } from 'vitest'
import {
  recipeFavoriteInputSchema,
  recipeGenerateInputSchema,
  recipeGenerationIdSchema,
} from './recipes-contract'

describe('recipe generate input schema', () => {
  it('accepts valid payload', () => {
    const parsed = recipeGenerateInputSchema.parse({
      preference: 'high protein vegetarian dinner',
      recipeCount: 2,
    })
    expect(parsed.preference).toBe('high protein vegetarian dinner')
    expect(parsed.recipeCount).toBe(2)
  })

  it('trims preference and defaults recipe count', () => {
    const parsed = recipeGenerateInputSchema.parse({
      preference: '  easy pasta weeknight meals  ',
    })
    expect(parsed.preference).toBe('easy pasta weeknight meals')
    expect(parsed.recipeCount).toBe(3)
  })

  it('rejects too-short preference', () => {
    const result = recipeGenerateInputSchema.safeParse({
      preference: 'hi',
      recipeCount: 1,
    })
    expect(result.success).toBe(false)
  })
})

describe('recipe favorite input schema', () => {
  it('accepts explicit boolean state', () => {
    const parsed = recipeFavoriteInputSchema.parse({ favorited: true })
    expect(parsed.favorited).toBe(true)
  })

  it('rejects missing favorited state', () => {
    const result = recipeFavoriteInputSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

describe('recipe generation id schema', () => {
  it('accepts non-empty generation id', () => {
    const parsed = recipeGenerationIdSchema.parse({ generationId: 'abc123' })
    expect(parsed.generationId).toBe('abc123')
  })

  it('rejects empty generation id', () => {
    const result = recipeGenerationIdSchema.safeParse({ generationId: '' })
    expect(result.success).toBe(false)
  })
})
