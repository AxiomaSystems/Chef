export const peruvianCuisineExample = {
  id: 'cuisine-peruvian',
  slug: 'peruvian',
  label: 'Peruvian',
  kind: 'national',
  created_at: '2026-03-19T03:12:00.000Z',
  updated_at: '2026-03-19T03:12:00.000Z',
};

export const otherCuisineExample = {
  id: 'cuisine-other',
  slug: 'other',
  label: 'Other',
  kind: 'other',
  created_at: '2026-03-19T03:12:00.000Z',
  updated_at: '2026-03-19T03:12:00.000Z',
};

export const cuisineListExample = [
  peruvianCuisineExample,
  {
    id: 'cuisine-mediterranean',
    slug: 'mediterranean',
    label: 'Mediterranean',
    kind: 'style',
    created_at: '2026-03-19T03:12:00.000Z',
    updated_at: '2026-03-19T03:12:00.000Z',
  },
  otherCuisineExample,
];

export const recipeExample = {
  id: 'recipe-1',
  owner_user_id: 'user-1',
  forked_from_recipe_id: undefined,
  is_system_recipe: false,
  name: 'Arroz con pollo casero',
  cuisine_id: 'cuisine-peruvian',
  cuisine: peruvianCuisineExample,
  description: 'Comforting chicken and rice dish.',
  cover_image_url: 'https://images.example.com/recipes/arroz-con-pollo.jpg',
  nutrition_data: {
    calories: 640,
    protein_g: 42,
    carbs_g: 36,
    fat_g: 28,
  },
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
  tag_ids: ['tag-system-dinner', 'tag-user-comfort-food'],
  tags: [
    {
      id: 'tag-system-dinner',
      owner_user_id: undefined,
      name: 'Dinner',
      slug: 'dinner',
      scope: 'system',
      created_at: '2026-03-19T03:12:00.000Z',
      updated_at: '2026-03-19T03:12:00.000Z',
    },
    {
      id: 'tag-user-comfort-food',
      owner_user_id: 'user-1',
      name: 'Comfort Food',
      slug: 'comfort-food',
      scope: 'user',
      created_at: '2026-03-19T03:12:00.000Z',
      updated_at: '2026-03-19T03:12:00.000Z',
    },
  ],
  created_at: '2026-03-19T03:12:00.000Z',
  updated_at: '2026-03-19T03:12:00.000Z',
};

export const recipeListExample = [recipeExample];

export const systemTagExample = {
  id: 'tag-system-weeknight',
  owner_user_id: undefined,
  name: 'Weeknight',
  slug: 'weeknight',
  scope: 'system',
  created_at: '2026-03-19T03:12:00.000Z',
  updated_at: '2026-03-19T03:12:00.000Z',
};

export const userTagExample = {
  id: 'tag-user-my-favorites',
  owner_user_id: 'user-1',
  name: 'My Favorites',
  slug: 'my-favorites',
  scope: 'user',
  created_at: '2026-03-19T03:12:00.000Z',
  updated_at: '2026-03-19T03:12:00.000Z',
};

export const mePreferencesExample = {
  preferred_cuisine_ids: ['cuisine-mediterranean', 'cuisine-peruvian'],
  preferred_cuisines: [
    {
      id: 'cuisine-mediterranean',
      slug: 'mediterranean',
      label: 'Mediterranean',
      kind: 'style',
      created_at: '2026-03-19T03:12:00.000Z',
      updated_at: '2026-03-19T03:12:00.000Z',
    },
    peruvianCuisineExample,
  ],
  preferred_tag_ids: ['tag-system-comfort-food', 'tag-system-weeknight'],
  preferred_tags: [
    {
      id: 'tag-system-comfort-food',
      owner_user_id: undefined,
      name: 'Comfort Food',
      slug: 'comfort-food',
      scope: 'system',
      created_at: '2026-03-19T03:12:00.000Z',
      updated_at: '2026-03-19T03:12:00.000Z',
    },
    systemTagExample,
  ],
};

export const meStatsExample = {
  owned_recipe_count: 12,
  cart_draft_count: 3,
  cart_count: 9,
  shopping_cart_count: 6,
  preferred_cuisine_count: 2,
  preferred_tag_count: 4,
};

export const meProfileExample = {
  id: 'user-1',
  email: 'postigodev@cart-generator.local',
  name: 'Postigo Dev',
  role: 'user',
  auth_providers: ['password'],
  onboarding_completed_at: '2026-03-20T18:45:00.000Z',
  created_at: '2026-03-19T03:12:00.000Z',
  updated_at: '2026-03-20T18:45:00.000Z',
};

export const updateMePreferencesRequestExample = {
  preferred_cuisine_ids: ['cuisine-peruvian', 'cuisine-mediterranean'],
  preferred_tag_ids: ['tag-system-weeknight', 'tag-system-comfort-food'],
};

export const createRecipeRequestExample = {
  name: 'Arroz con pollo casero',
  cuisine_id: 'cuisine-peruvian',
  description: 'Comforting chicken and rice dish.',
  cover_image_url: 'https://images.example.com/recipes/arroz-con-pollo.jpg',
  nutrition_data: {
    calories: 640,
    protein_g: 42,
    carbs_g: 36,
    fat_g: 28,
  },
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
  tag_ids: ['tag-system-dinner', 'tag-user-comfort-food'],
};

export const updateRecipeRequestExample = {
  name: 'Arroz con pollo actualizado',
  cuisine_id: 'cuisine-peruvian',
  description: 'Updated family version with clearer steps.',
  cover_image_url: null,
  nutrition_data: {
    calories: 690,
    protein_g: 48,
    carbs_g: 40,
    fat_g: 29,
  },
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
  tag_ids: ['tag-system-dinner', 'tag-system-updated'],
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

export const createCartRequestExample = {
  name: 'Weekly dinner plan',
  retailer: 'walmart',
  selections: [
    {
      recipe_id: 'recipe-1',
      recipe_type: 'base',
      quantity: 2,
      servings_override: 4,
    },
  ],
};

export const cartExample = {
  id: 'cart-1',
  user_id: 'user-1',
  name: 'Weekly dinner plan',
  retailer: 'walmart',
  selections: createCartRequestExample.selections,
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
  created_at: '2026-03-19T03:15:00.000Z',
  updated_at: '2026-03-19T03:15:00.000Z',
};

export const createShoppingCartRequestExample = {
  retailer: 'walmart',
};

export const shoppingCartExample = {
  id: 'shopping-cart-1',
  user_id: 'user-1',
  cart_id: 'cart-1',
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
  created_at: '2026-03-19T03:15:00.000Z',
  updated_at: '2026-03-19T03:15:00.000Z',
};

export const shoppingCartListExample = [shoppingCartExample];

export const shoppingCartHistoryExample = [
  {
    id: 'shopping-cart-1',
    user_id: 'user-1',
    cart_id: 'cart-1',
    retailer: 'walmart',
    estimated_subtotal: 11.94,
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
