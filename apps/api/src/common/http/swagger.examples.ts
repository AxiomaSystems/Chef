export const recipeExample = {
  id: 'recipe-1',
  owner_user_id: 'user-1',
  is_system_recipe: false,
  name: 'Arroz con pollo casero',
  cuisine: 'Peruvian',
  description: 'Comforting chicken and rice dish.',
  servings: 4,
  ingredients: [
    {
      canonical_ingredient: 'rice',
      amount: 2,
      unit: 'cup',
      display_ingredient: '2 cups white rice',
      preparation: 'rinsed',
      group: 'base',
    },
    {
      canonical_ingredient: 'chicken thigh',
      amount: 800,
      unit: 'g',
      display_ingredient: '800 g chicken thighs',
      group: 'protein',
    },
  ],
  steps: [
    {
      step: 1,
      what_to_do: 'Brown the chicken thighs.',
    },
    {
      step: 2,
      what_to_do: 'Add rice and simmer until cooked.',
    },
  ],
  tags: ['dinner', 'comfort food'],
  created_at: '2026-03-19T03:12:00.000Z',
  updated_at: '2026-03-19T03:12:00.000Z',
};

export const recipeListExample = [recipeExample];

export const createRecipeRequestExample = {
  name: 'Arroz con pollo casero',
  cuisine: 'Peruvian',
  description: 'Comforting chicken and rice dish.',
  servings: 4,
  ingredients: [
    {
      canonical_ingredient: 'rice',
      amount: 2,
      unit: 'cup',
      display_ingredient: '2 cups white rice',
      preparation: 'rinsed',
      group: 'base',
    },
    {
      canonical_ingredient: 'chicken thigh',
      amount: 800,
      unit: 'g',
      display_ingredient: '800 g chicken thighs',
      group: 'protein',
    },
  ],
  steps: [
    {
      step: 1,
      what_to_do: 'Brown the chicken thighs.',
    },
    {
      step: 2,
      what_to_do: 'Add rice and simmer until cooked.',
    },
  ],
  tags: ['dinner', 'comfort food'],
};

export const updateRecipeRequestExample = {
  name: 'Arroz con pollo actualizado',
  description: 'Updated family version with clearer steps.',
  servings: 6,
  ingredients: [
    {
      canonical_ingredient: 'rice',
      amount: 3,
      unit: 'cup',
      display_ingredient: '3 cups white rice',
      preparation: 'rinsed',
      group: 'base',
    },
    {
      canonical_ingredient: 'chicken thigh',
      amount: 1200,
      unit: 'g',
      display_ingredient: '1200 g chicken thighs',
      group: 'protein',
    },
  ],
  steps: [
    {
      step: 1,
      what_to_do: 'Brown the chicken thighs.',
    },
    {
      step: 2,
      what_to_do: 'Add rice, stock, and simmer until cooked.',
    },
  ],
  tags: ['dinner', 'updated'],
};

export const cartDraftExample = {
  id: 'draft-1',
  user_id: 'user-1',
  name: 'Weekly dinner plan',
  selections: [
    {
      recipe_id: 'recipe-1',
      recipe_type: 'base',
      quantity: 2,
      servings_override: 4,
    },
  ],
  retailer: 'walmart',
  created_at: '2026-03-19T03:12:00.000Z',
  updated_at: '2026-03-19T03:12:00.000Z',
};

export const createCartDraftRequestExample = {
  name: 'Weekly dinner plan',
  selections: [
    {
      recipe_id: 'recipe-1',
      recipe_type: 'base',
      quantity: 2,
      servings_override: 4,
    },
  ],
  retailer: 'walmart',
};

export const generateCartRequestExample = {
  selections: [
    {
      recipe_id: 'recipe-1',
      recipe_type: 'base',
      quantity: 2,
      servings_override: 4,
    },
  ],
  retailer: 'walmart',
};

export const generatedCartExample = {
  cart_draft_id: 'draft-1',
  dishes: [
    {
      id: 'recipe-1',
      name: 'Arroz con pollo casero',
      cuisine: 'Peruvian',
      servings: 4,
      tags: ['dinner', 'comfort food'],
      ingredients: [
        {
          canonical_ingredient: 'rice',
          amount: 2,
          unit: 'cup',
        },
        {
          canonical_ingredient: 'chicken thigh',
          amount: 800,
          unit: 'g',
        },
      ],
      steps: [
        {
          step: 1,
          what_to_do: 'Brown the chicken thighs.',
        },
      ],
    },
  ],
  overview: [
    {
      canonical_ingredient: 'chicken thigh',
      total_amount: 800,
      unit: 'g',
      source_dishes: [
        {
          dish_name: 'Arroz con pollo casero',
          amount: 800,
          unit: 'g',
        },
      ],
    },
    {
      canonical_ingredient: 'rice',
      total_amount: 2,
      unit: 'cup',
      source_dishes: [
        {
          dish_name: 'Arroz con pollo casero',
          amount: 2,
          unit: 'cup',
        },
      ],
      purchase_unit_hint: 'cup',
    },
  ],
  matched_items: [
    {
      canonical_ingredient: 'chicken thigh',
      needed_amount: 800,
      needed_unit: 'g',
      matched_amount: 1000,
      matched_unit: 'g',
      walmart_search_query: 'chicken thigh',
      selected_product: {
        product_id: 'walmart-chicken-thigh-1',
        title: 'Chicken Thighs',
        brand: 'Freshness Guaranteed',
        price: 7.96,
        size_value: 1000,
        size_unit: 'g',
        quantity_text: '1000 g tray',
      },
      selected_quantity: 1,
      estimated_line_total: 7.96,
    },
    {
      canonical_ingredient: 'rice',
      needed_amount: 2,
      needed_unit: 'cup',
      matched_amount: 5,
      matched_unit: 'cup',
      purchase_unit_hint: 'cup',
      walmart_search_query: 'rice',
      selected_product: {
        product_id: 'walmart-rice-1',
        title: 'Long Grain White Rice',
        brand: 'Mahatma',
        price: 3.98,
        size_value: 5,
        size_unit: 'cup',
        quantity_text: '5 cups bag',
      },
      selected_quantity: 1,
      estimated_line_total: 3.98,
    },
  ],
  estimated_subtotal: 11.94,
  retailer: 'walmart',
};

export const persistedGeneratedCartExample = {
  id: 'cart-1',
  user_id: 'user-1',
  ...generatedCartExample,
  created_at: '2026-03-19T03:15:00.000Z',
  updated_at: '2026-03-19T03:15:00.000Z',
};

export const generatedCartListExample = [persistedGeneratedCartExample];

export const generatedCartHistoryExample = [
  {
    id: 'cart-1',
    user_id: 'user-1',
    cart_draft_id: 'draft-1',
    retailer: 'walmart',
    estimated_subtotal: 11.94,
    dish_count: 1,
    overview_count: 2,
    matched_item_count: 2,
    created_at: '2026-03-19T03:15:00.000Z',
    updated_at: '2026-03-19T03:15:00.000Z',
  },
];

export const notFoundErrorExample = {
  statusCode: 404,
  message: 'Recipe recipe-1 not found',
  error: 'Not Found',
};

export const badRequestErrorExample = {
  statusCode: 400,
  message: ['servings must not be less than 1'],
  error: 'Bad Request',
};

export const forbiddenErrorExample = {
  statusCode: 403,
  message: 'System recipes cannot be edited',
  error: 'Forbidden',
};
