export const mealGenerationSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'summary',
    'recipes',
    'inventory_used',
    'cost_minimization_notes',
    'planning_notes',
  ],
  properties: {
    summary: { type: 'string' },
    recipes: {
      type: 'array',
      minItems: 1,
      items: { $ref: '#/$defs/recipePreview' },
    },
    inventory_used: { type: 'array', items: { type: 'string' } },
    cost_minimization_notes: { type: 'array', items: { type: 'string' } },
    planning_notes: { type: 'array', items: { type: 'string' } },
  },
  $defs: {
    recipePreview: {
      type: 'object',
      additionalProperties: false,
      required: [
        'name',
        'cuisine',
        'description',
        'servings',
        'ingredients',
        'steps',
        'tags',
        'nutrition_estimate',
        'estimated_cost_tier',
        'cost_notes',
        'quality_tradeoffs',
        'assumptions',
      ],
      properties: {
        name: { type: 'string' },
        cuisine: { type: 'string' },
        description: { type: 'string' },
        servings: { type: 'integer', minimum: 1 },
        ingredients: {
          type: 'array',
          minItems: 1,
          items: { $ref: '#/$defs/dishIngredient' },
        },
        steps: {
          type: 'array',
          minItems: 1,
          items: { $ref: '#/$defs/recipeStep' },
        },
        tags: { type: 'array', items: { type: 'string' } },
        nutrition_estimate: {
          anyOf: [{ $ref: '#/$defs/nutritionEstimate' }, { type: 'null' }],
        },
        estimated_cost_tier: {
          type: 'string',
          enum: ['low', 'medium', 'high'],
        },
        cost_notes: { type: 'array', items: { type: 'string' } },
        quality_tradeoffs: { type: 'array', items: { type: 'string' } },
        assumptions: { type: 'array', items: { type: 'string' } },
      },
    },
    dishIngredient: {
      type: 'object',
      additionalProperties: false,
      required: [
        'canonical_ingredient',
        'amount',
        'unit',
        'display_ingredient',
        'preparation',
        'optional',
        'group',
      ],
      properties: {
        canonical_ingredient: { type: 'string' },
        amount: { type: 'number', exclusiveMinimum: 0 },
        unit: { type: 'string' },
        display_ingredient: { anyOf: [{ type: 'string' }, { type: 'null' }] },
        preparation: { anyOf: [{ type: 'string' }, { type: 'null' }] },
        optional: { type: 'boolean' },
        group: { anyOf: [{ type: 'string' }, { type: 'null' }] },
      },
    },
    recipeStep: {
      type: 'object',
      additionalProperties: false,
      required: ['step', 'what_to_do'],
      properties: {
        step: { type: 'integer', minimum: 1 },
        what_to_do: { type: 'string' },
      },
    },
    nutritionEstimate: {
      type: 'object',
      additionalProperties: false,
      required: [
        'calories',
        'protein_g',
        'carbs_g',
        'fat_g',
        'fiber_g',
        'sodium_mg',
      ],
      properties: {
        calories: { anyOf: [{ type: 'number' }, { type: 'null' }] },
        protein_g: { anyOf: [{ type: 'number' }, { type: 'null' }] },
        carbs_g: { anyOf: [{ type: 'number' }, { type: 'null' }] },
        fat_g: { anyOf: [{ type: 'number' }, { type: 'null' }] },
        fiber_g: { anyOf: [{ type: 'number' }, { type: 'null' }] },
        sodium_mg: { anyOf: [{ type: 'number' }, { type: 'null' }] },
      },
    },
  },
} as const;

export const ingredientSwapSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'confirmation_message',
    'original_ingredient',
    'replacement_ingredient',
    'should_apply',
    'downsides',
    'benefits',
    'updated_recipe',
    'ingredient_delta_notes',
  ],
  properties: {
    confirmation_message: { type: 'string' },
    original_ingredient: { type: 'string' },
    replacement_ingredient: { type: 'string' },
    should_apply: { type: 'boolean' },
    downsides: { type: 'array', items: { type: 'string' } },
    benefits: { type: 'array', items: { type: 'string' } },
    updated_recipe: { $ref: '#/$defs/recipePreview' },
    ingredient_delta_notes: { type: 'array', items: { type: 'string' } },
  },
  $defs: mealGenerationSchema.$defs,
} as const;

export const chatSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['message', 'follow_up_prompts', 'safety_notes'],
  properties: {
    message: { type: 'string' },
    follow_up_prompts: { type: 'array', items: { type: 'string' } },
    safety_notes: { type: 'array', items: { type: 'string' } },
  },
} as const;

export const recipeImportSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'source_url',
    'platform',
    'source_title',
    'source_creator',
    'source_description',
    'imported_recipe',
    'extraction_notes',
  ],
  properties: {
    source_url: { type: 'string' },
    platform: {
      type: 'string',
      enum: ['youtube', 'instagram', 'tiktok', 'generic'],
    },
    source_title: { type: 'string' },
    source_creator: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    source_description: { type: 'string' },
    imported_recipe: { $ref: '#/$defs/recipePreview' },
    extraction_notes: { type: 'array', items: { type: 'string' } },
  },
  $defs: mealGenerationSchema.$defs,
} as const;
