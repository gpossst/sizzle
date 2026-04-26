import { describe, expect, it } from 'vitest'
import {
  filterGenerationsByQuery,
  getGroceryChecklist,
  getHistoryPreviewGenerations,
  getRecentGenerations,
  splitActiveAndReturningGenerations,
  type RecipeGeneration,
} from './recipe-generation-view'

function makeGeneration(
  id: string,
  title: string,
  summary: string,
  favorited: boolean,
): RecipeGeneration {
  return {
    id,
    favorited,
    createdAt: Date.now(),
    recipe: {
      title,
      summary,
      ingredients: [
        {
          name: 'Chicken breast',
          amount: '1 lb',
          note: '',
        },
      ],
      ingredientGroups: [
        {
          title: 'Main',
          ingredients: [
            {
              name: 'Chicken breast',
              amount: '1 lb',
              note: '',
            },
          ],
        },
      ],
      steps: ['Cook and serve'],
    },
  }
}

describe('getRecentGenerations', () => {
  it('returns up to the requested count from newest-first data', () => {
    const generations = [
      makeGeneration('1', 'Newest recipe', 'quick dinner', false),
      makeGeneration('2', 'Second recipe', 'healthy meal', true),
      makeGeneration('3', 'Third recipe', 'comfort food', false),
      makeGeneration('4', 'Fourth recipe', 'extra', false),
    ]
    expect(getRecentGenerations(generations, 3).map((row) => row.id)).toEqual([
      '1',
      '2',
      '3',
    ])
  })
})

describe('filterGenerationsByQuery', () => {
  it('matches title and summary text case-insensitively', () => {
    const generations = [
      makeGeneration('1', 'Spicy tofu bowl', 'weeknight friendly', false),
      makeGeneration('2', 'Creamy pasta', 'rich and cozy', false),
    ]
    expect(
      filterGenerationsByQuery(generations, 'TOFU').map((row) => row.id),
    ).toEqual(['1'])
    expect(
      filterGenerationsByQuery(generations, 'cozy').map((row) => row.id),
    ).toEqual(['2'])
  })

  it('matches ingredients and steps text', () => {
    const generation = makeGeneration(
      '1',
      'Simple chicken',
      'lean protein',
      false,
    )
    generation.recipe.steps = ['Marinate chicken breast']

    expect(
      filterGenerationsByQuery([generation], 'marinate').map((row) => row.id),
    ).toEqual(['1'])
    expect(
      filterGenerationsByQuery([generation], 'breast').map((row) => row.id),
    ).toEqual(['1'])
  })
})

describe('splitActiveAndReturningGenerations', () => {
  it('keeps active generations visible and pushes older ones to returning', () => {
    const generations = [
      makeGeneration('new-1', 'Latest 1', 'a', false),
      makeGeneration('new-2', 'Latest 2', 'b', false),
      makeGeneration('old-1', 'Older 1', 'c', true),
      makeGeneration('old-2', 'Older 2', 'd', false),
    ]

    const result = splitActiveAndReturningGenerations(generations, [
      'new-1',
      'new-2',
    ])

    expect(result.activeGenerations.map((row) => row.id)).toEqual([
      'new-1',
      'new-2',
    ])
    expect(result.returningGenerations.map((row) => row.id)).toEqual([
      'old-1',
      'old-2',
    ])
  })

  it('falls back to showing everything as active when no active ids are set', () => {
    const generations = [
      makeGeneration('1', 'One', 'a', false),
      makeGeneration('2', 'Two', 'b', false),
    ]

    const result = splitActiveAndReturningGenerations(generations, [])

    expect(result.activeGenerations.map((row) => row.id)).toEqual(['1', '2'])
    expect(result.returningGenerations).toEqual([])
  })
})

describe('getHistoryPreviewGenerations', () => {
  it('returns at most 3 non-active generations ordered newest-first', () => {
    const generations = [
      makeGeneration('new-1', 'Latest 1', 'a', false),
      makeGeneration('new-2', 'Latest 2', 'b', false),
      makeGeneration('old-1', 'Older 1', 'c', true),
      makeGeneration('old-2', 'Older 2', 'd', false),
      makeGeneration('old-3', 'Older 3', 'e', false),
      makeGeneration('old-4', 'Older 4', 'f', false),
    ]

    expect(
      getHistoryPreviewGenerations(generations, ['new-1', 'new-2']).map(
        (row) => row.id,
      ),
    ).toEqual(['old-1', 'old-2', 'old-3'])
  })
})

describe('getGroceryChecklist', () => {
  it('combines overlapping ingredients and sums compatible amounts', () => {
    const chickenBowl = makeGeneration('recipe-1', 'Chicken bowl', 'a', false)
    chickenBowl.recipe.ingredientGroups = [
      {
        title: 'Main',
        ingredients: [
          { name: 'Chicken breast', amount: '1 lb' },
          { name: 'Rice', amount: '2 cups' },
        ],
      },
    ]

    const chickenStirFry = makeGeneration('recipe-2', 'Chicken stir fry', 'b', false)
    chickenStirFry.recipe.ingredientGroups = [
      {
        title: 'Main',
        ingredients: [
          { name: 'Chicken breast', amount: '0.5 lb' },
          { name: 'Broccoli', amount: '1 head' },
        ],
      },
    ]

    const checklist = getGroceryChecklist(
      [chickenBowl, chickenStirFry],
      ['recipe-1', 'recipe-2'],
    )

    expect(checklist.map((item) => item.name)).toEqual([
      'Broccoli',
      'Chicken breast',
      'Rice',
    ])
    expect(checklist.find((item) => item.name === 'Chicken breast')?.amount).toBe(
      '1.5 lb',
    )
    expect(
      checklist.find((item) => item.name === 'Chicken breast')?.recipeIds.sort(),
    ).toEqual(['recipe-1', 'recipe-2'])
  })

  it('keeps shared ingredients when one selected recipe is removed', () => {
    const recipeA = makeGeneration('recipe-a', 'A', 'a', false)
    recipeA.recipe.ingredientGroups = [
      {
        title: 'Main',
        ingredients: [{ name: 'Onion', amount: '1' }],
      },
    ]
    const recipeB = makeGeneration('recipe-b', 'B', 'b', false)
    recipeB.recipe.ingredientGroups = [
      {
        title: 'Main',
        ingredients: [{ name: 'Onion', amount: '2' }],
      },
    ]

    const afterRemoval = getGroceryChecklist([recipeA, recipeB], ['recipe-b'])
    expect(afterRemoval).toEqual([
      expect.objectContaining({
        name: 'Onion',
        amount: '2',
        recipeIds: ['recipe-b'],
      }),
    ])
  })
})
