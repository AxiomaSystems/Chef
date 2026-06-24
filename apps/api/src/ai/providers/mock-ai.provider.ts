import { Injectable } from '@nestjs/common';
import type { AiProvider } from '../ai.provider';
import type {
  AiChatResult,
  AiIngredientSwapResult,
  AiInventoryAlternativesResult,
  AiInventoryStructureResult,
  AiMealGenerationResult,
  AiRecipeImportResult,
  AiRecipePreview,
} from '../ai.types';
import type { GenerateMealsDto } from '../dto/generate-meals.dto';
import type { InventoryAlternativesDto } from '../dto/inventory-alternatives.dto';
import type { ImportRecipeDto } from '../dto/import-recipe.dto';
import type { StructureInventoryDto } from '../dto/structure-inventory.dto';
import type { SwapIngredientDto } from '../dto/swap-ingredient.dto';

@Injectable()
export class MockAiProvider implements AiProvider {
  readonly name = 'mock';

  generateMeals(input: GenerateMealsDto): Promise<AiMealGenerationResult> {
    const recipeCount = input.meals_needed && input.meals_needed > 2 ? 3 : 1;
    const recipeName = titleCase(input.meal_prompt || 'Preppie test meal');
    const dietaryText = (input.dietary_preferences ?? [])
      .join(' ')
      .toLowerCase();
    const protein =
      inventoryProtein(input.inventory ?? []) ??
      (dietaryText.includes('vegan') ? 'chickpeas' : 'chicken breast');
    const vegetable =
      input.budget_mode === 'minimize_cost'
        ? 'frozen mixed vegetables'
        : 'bell pepper';

    const recipes = Array.from({ length: recipeCount }, (_, index) =>
      buildRecipe({
        name:
          recipeCount === 1
            ? recipeName
            : `${recipeName} Variation ${index + 1}`,
        servings: input.servings_per_meal ?? 4,
        protein,
        vegetable,
        mealStyle: input.meal_style ?? 'standard',
        budgetMode: input.budget_mode ?? 'balanced',
      }),
    );

    return Promise.resolve({
      summary: `Generated ${recipes.length} structured recipe preview(s).`,
      recipes,
      inventory_used: inventoryUsedByRecipe(input.inventory ?? [], [
        protein,
        'rice',
        'olive oil',
      ]),
      cost_minimization_notes: [
        'Mock mode favors pantry grains and frozen vegetables for predictable testing.',
      ],
      planning_notes: [
        'Mock AI is active. Set CHEF_LLM_PROVIDER=openai and OPENAI_API_KEY for real model output.',
      ],
    });
  }

  swapIngredient(input: SwapIngredientDto): Promise<AiIngredientSwapResult> {
    const original = input.ingredient_to_replace.trim().toLowerCase();
    const replacement = input.desired_replacement.trim().toLowerCase();
    const recipe = normalizeRecipe(input.recipe);
    const updatedIngredients = recipe.ingredients.map((ingredient) =>
      ingredient.canonical_ingredient.toLowerCase() === original
        ? {
            ...ingredient,
            canonical_ingredient: replacement,
            display_ingredient: replacement,
          }
        : ingredient,
    );

    return Promise.resolve({
      confirmation_message: `Replace ${original} with ${replacement}?`,
      original_ingredient: original,
      replacement_ingredient: replacement,
      should_apply: true,
      downsides: ['Flavor, texture, and cook time may change.'],
      benefits: [
        'The recipe remains structured and can still flow into cart generation.',
      ],
      updated_recipe: {
        ...recipe,
        name: `${recipe.name} with ${titleCase(replacement)}`,
        ingredients: updatedIngredients,
        quality_tradeoffs: [
          ...recipe.quality_tradeoffs,
          `Mock swap changed ${original} to ${replacement}.`,
        ],
      },
      ingredient_delta_notes: [`Changed ${original} to ${replacement}.`],
    });
  }

  suggestInventoryAlternatives(
    input: InventoryAlternativesDto,
  ): Promise<AiInventoryAlternativesResult> {
    return Promise.resolve({
      suggestions: input.ingredients.map((ingredient) => {
        const replacement =
          findMockAlternative(
            ingredient.canonical_ingredient,
            input.inventory,
          ) ?? null;

        return {
          ingredient_name: ingredient.canonical_ingredient,
          inventory_item_id: replacement?.id ?? null,
          replacement_ingredient: replacement?.display_name ?? null,
          confidence: replacement ? ('medium' as const) : ('low' as const),
          reason: replacement
            ? `Mock AI found ${replacement.display_name} as the closest inventory substitute.`
            : 'Mock AI did not find a close inventory substitute.',
        };
      }),
    });
  }

  importRecipe(input: {
    request: ImportRecipeDto;
    platform: 'youtube' | 'instagram' | 'tiktok' | 'generic';
    source_title: string;
    source_creator: string | null;
    source_description: string;
    source_image_url: string | null;
    extracted_text: string;
    extraction_notes: string[];
    image_data_url?: string;
  }): Promise<AiRecipeImportResult> {
    const baseName = titleCase(
      input.source_title ||
        deriveTitleFromUrl(input.request.url) ||
        (input.image_data_url
          ? 'Image capture recipe'
          : 'Imported creator recipe'),
    );
    const importedRecipe = buildRecipe({
      name: baseName,
      servings: 4,
      protein:
        input.platform === 'youtube'
          ? 'chicken thigh'
          : input.platform === 'tiktok'
            ? 'salmon fillet'
            : 'shrimp',
      vegetable:
        input.platform === 'instagram' ? 'cherry tomato' : 'bell pepper',
      mealStyle: 'standard',
      budgetMode: 'balanced',
    });

    return Promise.resolve({
      source_url: input.request.url,
      platform: input.platform,
      source_title: baseName,
      source_creator: input.source_creator,
      source_description:
        input.source_description ||
        'Imported from creator metadata in mock mode.',
      source_image_url: input.source_image_url,
      imported_recipe: {
        ...importedRecipe,
        description: input.source_description || importedRecipe.description,
        assumptions: [
          ...importedRecipe.assumptions,
          'This import was structured by the mock AI provider.',
        ],
      },
      extraction_notes: [
        ...input.extraction_notes,
        input.image_data_url
          ? 'Image source type: written_recipe. Mock import used image capture metadata instead of live visual extraction.'
          : 'Mock import used URL and metadata cues instead of a live model extraction.',
      ],
    });
  }

  chat(input: { message: string }): Promise<AiChatResult> {
    return Promise.resolve({
      message: `Mock Preppie answer: for "${input.message}", start by clarifying servings, dietary needs, available ingredients, and budget. Then choose one simple structured recipe and review missing ingredients before shopping.`,
      follow_up_prompts: [
        'What can I make with my inventory?',
        'Make this cheaper.',
        'Turn this into a weekly meal plan.',
      ],
      safety_notes: [
        'For allergies, medical diets, and food safety, verify details with trusted sources.',
      ],
    });
  }

  structureInventory(
    input: StructureInventoryDto,
  ): Promise<AiInventoryStructureResult> {
    const transcript = input.transcript.toLowerCase();
    const flourMatch = input.inventory.find((item) =>
      item.name.toLowerCase().includes('flour'),
    );
    const saltMatch = input.inventory.find((item) =>
      item.name.toLowerCase().includes('salt'),
    );
    const monsterMatch = input.inventory.find((item) =>
      item.name.toLowerCase().includes('energy drink'),
    );
    const mockItems: AiInventoryStructureResult['items'] = transcript.includes(
      'monster',
    )
      ? [
          {
            display_name: transcript.includes('salted caramel')
              ? 'Monster Salted Caramel Energy Drink'
              : 'Monster Energy Drink',
            item_name: 'energy drink',
            brand: 'Monster',
            quantity: 1,
            unit: input.allowed_units.includes('unit') ? 'unit' : 'bottle',
            matched_existing_id: monsterMatch?.id ?? null,
            confidence: 'high',
            notes: ['Mock separated brand, item, and variant.'],
            conflicts: [],
          },
        ]
      : [
          {
            display_name: transcript.includes('walmart')
              ? 'Walmart Wheat Flour'
              : transcript.includes('flour')
                ? 'Wheat Flour'
                : 'Rice',
            item_name: transcript.includes('flour') ? 'wheat flour' : 'rice',
            brand: transcript.includes('walmart') ? 'Walmart' : null,
            quantity:
              transcript.includes('5') || transcript.includes('five') ? 5 : 1,
            unit: input.allowed_units.includes('kg') ? 'kg' : 'unit',
            matched_existing_id: flourMatch?.id ?? null,
            confidence: 'high',
            notes: ['Mock structured this row from the voice inventory flow.'],
            conflicts: flourMatch
              ? [
                  {
                    type: 'quantity',
                    message:
                      'Spoken quantity may replace the existing flour quantity.',
                    existing_value:
                      flourMatch.estimated_amount && flourMatch.unit
                        ? `${flourMatch.estimated_amount} ${flourMatch.unit}`
                        : null,
                    spoken_value: '5 kg',
                  },
                ]
              : [],
          },
          {
            display_name: transcript.includes('great value')
              ? 'Great Value Salt'
              : 'Salt',
            item_name: 'salt',
            brand: transcript.includes('great value') ? 'Great Value' : null,
            quantity: 1,
            unit: input.allowed_units.includes('bag') ? 'bag' : 'unit',
            matched_existing_id: saltMatch?.id ?? null,
            confidence: 'medium',
            notes: ['Mock added a second pantry item for review.'],
            conflicts: [],
          },
        ];

    return Promise.resolve({
      transcript_summary:
        input.transcript.trim() ||
        'Mock inventory transcript with pantry staples.',
      warnings: transcript.trim()
        ? []
        : [
            'Mock AI used sample inventory rows because the transcript was empty.',
          ],
      items: mockItems,
      potential_errors: transcript.includes('perfume')
        ? [
            {
              display_name: 'Perfume',
              item_name: 'perfume',
              brand: null,
              quantity: 1,
              unit: input.allowed_units.includes('unit') ? 'unit' : 'bag',
              matched_existing_id: null,
              confidence: 'low',
              notes: [
                'This does not sound like a kitchen or food inventory item.',
              ],
              conflicts: [
                {
                  type: 'other',
                  message:
                    'Perfume is probably not relevant to kitchen inventory.',
                  existing_value: null,
                  spoken_value: 'perfume',
                },
              ],
            },
          ]
        : [],
    });
  }
}

function buildRecipe(input: {
  name: string;
  servings: number;
  protein: string;
  vegetable: string;
  mealStyle: string;
  budgetMode: string;
}): AiRecipePreview {
  return {
    name: input.name,
    cuisine: 'Flexible',
    description: 'A structured mock recipe for end-to-end AI flow testing.',
    servings: input.servings,
    ingredients: [
      {
        canonical_ingredient: input.protein,
        amount: 1.25,
        unit: 'lb',
        display_ingredient: input.protein,
        preparation: null,
        optional: false,
        group: 'protein',
      },
      {
        canonical_ingredient: 'rice',
        amount: 1.5,
        unit: 'cup',
        display_ingredient: 'rice',
        preparation: 'rinsed',
        optional: false,
        group: 'base',
      },
      {
        canonical_ingredient: input.vegetable,
        amount: 2,
        unit: 'cup',
        display_ingredient: input.vegetable,
        preparation: null,
        optional: false,
        group: 'vegetable',
      },
      {
        canonical_ingredient: 'olive oil',
        amount: 2,
        unit: 'tbsp',
        display_ingredient: 'olive oil',
        preparation: null,
        optional: false,
        group: 'pantry',
      },
    ],
    steps: [
      { step: 1, what_to_do: 'Prepare ingredients and cook the rice.' },
      { step: 2, what_to_do: 'Cook the protein with aromatics until done.' },
      { step: 3, what_to_do: 'Fold in vegetables and serve over rice.' },
    ],
    tags: ['mock', input.mealStyle, input.budgetMode],
    nutrition_estimate: {
      calories: 620,
      protein_g: 36,
      carbs_g: 58,
      fat_g: 24,
      fiber_g: 7,
      sodium_mg: 720,
    },
    estimated_cost_tier:
      input.budgetMode === 'minimize_cost' ? 'low' : 'medium',
    cost_notes: ['Mock output is not priced against a retailer catalog.'],
    quality_tradeoffs: ['Generated without a real LLM.'],
    assumptions: ['Local mock provider is active.'],
  };
}

function normalizeRecipe(recipe: SwapIngredientDto['recipe']): AiRecipePreview {
  return {
    ...recipe,
    tags: recipe.tags ?? [],
    nutrition_estimate: recipe.nutrition_estimate ?? {
      calories: 520,
      protein_g: 32,
      carbs_g: 44,
      fat_g: 20,
      fiber_g: 6,
      sodium_mg: 640,
    },
    estimated_cost_tier: recipe.estimated_cost_tier ?? 'medium',
    cost_notes: recipe.cost_notes ?? [],
    quality_tradeoffs: recipe.quality_tradeoffs ?? [],
    assumptions: recipe.assumptions ?? [],
    ingredients: recipe.ingredients.map((ingredient) => ({
      canonical_ingredient: ingredient.canonical_ingredient,
      amount: ingredient.amount,
      unit: ingredient.unit,
      display_ingredient: ingredient.display_ingredient ?? null,
      preparation: ingredient.preparation ?? null,
      optional: ingredient.optional ?? false,
      group: ingredient.group ?? null,
    })),
  };
}

function findMockAlternative(
  ingredient: string,
  inventory: InventoryAlternativesDto['inventory'],
) {
  const normalized = ingredient.toLowerCase();
  const proteins = [
    'chicken',
    'turkey',
    'beef',
    'pork',
    'tofu',
    'salmon',
    'fish',
    'shrimp',
    'beans',
    'lentils',
  ];
  const needsProtein = proteins.some((protein) => normalized.includes(protein));

  if (!needsProtein) {
    return inventory[0];
  }

  return (
    inventory.find((item) =>
      proteins.some((protein) =>
        item.display_name.toLowerCase().includes(protein),
      ),
    ) ?? inventory[0]
  );
}

function titleCase(input: string) {
  return input
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(' ');
}

function inventoryProtein(inventory: string[]) {
  const proteinCandidates = [
    'fish',
    'salmon',
    'tuna',
    'tilapia',
    'cod',
    'shrimp',
    'chicken',
    'beef',
    'pork',
    'turkey',
    'lamb',
    'eggs',
    'tofu',
    'tempeh',
    'chickpeas',
    'beans',
    'lentils',
  ];
  const normalizedInventory = inventory.map((item) => item.toLowerCase());

  return proteinCandidates.find((candidate) =>
    normalizedInventory.some((item) => item.includes(candidate)),
  );
}

function inventoryUsedByRecipe(inventory: string[], recipeItems: string[]) {
  return inventory.filter((item) => {
    const normalizedItem = item.toLowerCase();
    return recipeItems.some((recipeItem) =>
      normalizedItem.includes(recipeItem.toLowerCase()),
    );
  });
}

function deriveTitleFromUrl(input: string) {
  try {
    const url = new URL(input);
    const lastPart = url.pathname.split('/').filter(Boolean).at(-1) ?? '';
    return lastPart.replace(/[-_]+/g, ' ').trim();
  } catch {
    return '';
  }
}
