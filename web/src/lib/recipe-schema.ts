export const RECIPE_EXTRACTION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['recipes'],
  properties: {
    recipes: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'ingredientGroups', 'steps'],
        properties: {
          title: { type: 'string' },
          summary: { type: 'string' },
          prepTime: { type: 'string' },
          cookTime: { type: 'string' },
          servings: { type: 'string' },
          sourceAttribution: { type: 'string' },
          ingredientGroups: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['title', 'ingredients'],
              properties: {
                title: { type: 'string' },
                ingredients: {
                  type: 'array',
                  minItems: 1,
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['name', 'amount'],
                    properties: {
                      name: { type: 'string' },
                      amount: { type: 'string' },
                      note: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
          ingredients: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['name', 'amount'],
              properties: {
                name: { type: 'string' },
                amount: { type: 'string' },
                note: { type: 'string' },
              },
            },
          },
          steps: {
            type: 'array',
            minItems: 1,
            items: { type: 'string' },
          },
        },
      },
    },
  },
} as const
