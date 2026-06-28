import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { AiProvider } from '../ai.provider';
import {
  chatSchema,
  ingredientSwapSchema,
  inventoryAlternativesSchema,
  inventoryStructureSchema,
  mealGenerationSchema,
  recipeImportSchema,
} from '../ai.schemas';
import type {
  AiChatMessage,
  AiChatResult,
  AiIngredientSwapResult,
  AiInventoryAlternativesResult,
  AiInventoryStructureResult,
  AiMealGenerationResult,
  AiRecipeImportResult,
} from '../ai.types';
import type { GenerateMealsDto } from '../dto/generate-meals.dto';
import type { InventoryAlternativesDto } from '../dto/inventory-alternatives.dto';
import type { StructureInventoryDto } from '../dto/structure-inventory.dto';
import type { SwapIngredientDto } from '../dto/swap-ingredient.dto';

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';

const SYSTEM_PROMPT = `
You are Preppie's food and cooking assistant.
Preppie helps young adults plan, shop, and cook with confidence through a personalized AI sous chef.
Use structured Preppie domain vocabulary.
Do not claim to know exact retailer prices unless provided.
Do not perform final product matching, checkout, or subtotal math.
Treat provided inventory as strong planning context, especially when meal_style is "inventory_first".
Use available inventory proteins before inventing unavailable proteins.
Do not add beef, chicken, pork, fish, seafood, or other primary proteins that are not in inventory unless the user explicitly asks for them or the requested dish requires them.
If a non-inventory ingredient is necessary, list that assumption clearly.
For allergy, medical, pregnancy, or food-safety concerns, be cautious and tell the user to verify with qualified sources.
`.trim();

@Injectable()
export class OpenAiAiProvider implements AiProvider {
  readonly name = 'openai';
  private readonly model = process.env.OPENAI_MODEL ?? 'gpt-5.4-mini';

  async generateMeals(
    input: GenerateMealsDto,
  ): Promise<AiMealGenerationResult> {
    return this.createStructuredResponse<AiMealGenerationResult>({
      schemaName: 'chef_meal_generation',
      schema: mealGenerationSchema,
      task: [
        'Generate structured recipe preview data from the meal request.',
        'Respect dietary preferences, allergies, inventory, budget mode, meal quantity, and quality goals.',
        'When ai_planning_optimization is cost_reduction, strongly prefer existing inventory, pantry staples, cheaper proteins, and fewer specialty purchases.',
        'When ai_planning_optimization is trend_best_recipe, prioritize the most standard, high-quality, visually current version of the dish even when that means buying more canonical ingredients.',
        'When inventory is provided, prefer those ingredients and avoid inventing a different primary protein.',
        'For each recipe, set meal_types, difficulty, difficulty_reason, prep_time_minutes, cook_time_minutes, total_time_minutes, estimated_cost_tier, and cost_notes for recipe browsing and planning. Treat cost tier as relative ingredient cost per serving, not live retailer pricing.',
        'For example, if the user asks for ugali and inventory includes fish but not beef, generate an ugali meal with fish rather than beef unless beef is explicitly requested. Ensure you get the Cuisine accurately(There is no need to set cuisine as Peruvian when a food is clearly of another place such as Italian).',
      ].join(' '),
      payload: input,
    });
  }

  async swapIngredient(
    input: SwapIngredientDto,
  ): Promise<AiIngredientSwapResult> {
    return this.createStructuredResponse<AiIngredientSwapResult>({
      schemaName: 'chef_ingredient_swap',
      schema: ingredientSwapSchema,
      task: 'Evaluate this ingredient swap, explain downsides and benefits, then return an updated structured recipe preview. The UI will ask the user to confirm before applying it.',
      payload: input,
    });
  }

  async suggestInventoryAlternatives(
    input: InventoryAlternativesDto,
  ): Promise<AiInventoryAlternativesResult> {
    return this.createStructuredResponse<AiInventoryAlternativesResult>({
      schemaName: 'chef_inventory_alternatives',
      schema: inventoryAlternativesSchema,
      task: [
        'For each recipe ingredient, decide whether one item from the provided kitchen inventory is a reasonable cooking substitute.',
        'Only choose replacements from the provided inventory list. Do not invent items.',
        'Return null inventory_item_id and null replacement_ingredient when there is no good substitute.',
        'Prefer close culinary fit over broad category matching. Chicken to turkey can be reasonable; chicken to beans may be lower confidence unless the dish can tolerate it.',
        'Do not mark exact matches; this endpoint is only for alternatives when the deterministic inventory check did not find the ingredient.',
      ].join(' '),
      payload: input,
    });
  }

  async importRecipe(input: {
    request: { url: string; supplemental_text?: string };
    platform: 'youtube' | 'instagram' | 'tiktok' | 'generic';
    source_title: string;
    source_creator: string | null;
    source_description: string;
    source_image_url: string | null;
    extracted_text: string;
    extraction_notes: string[];
    image_data_url?: string;
  }): Promise<AiRecipeImportResult> {
    const { image_data_url: imageDataUrl, ...textPayload } = input;

    return this.createStructuredResponse<AiRecipeImportResult>({
      schemaName: 'chef_recipe_import',
      schema: recipeImportSchema,
      task: [
        'Turn the imported recipe source into one structured Preppie recipe preview. Use the extracted source text, metadata, and any supplemental caption/transcript text. Be explicit when fields are inferred or uncertain.',
        'If an image is provided, inspect it directly. It may be a screenshot, cookbook page, handwritten/printed recipe, menu, social post, ingredient list, or finished dish photo. Return a cookable draft even when the image is only inspiration.',
        'For image imports, add one extraction note beginning with "Image source type:" and one of written_recipe, screenshot_caption, plated_dish, menu_or_label, or unclear.',
        'Always include nutrition_estimate with numeric calories, protein_g, carbs_g, and fat_g per serving. Estimate reasonable values when exact nutrition is not provided by the source.',
        'Always include recipe planning fields: meal_types, difficulty, difficulty_reason, prep_time_minutes, cook_time_minutes, total_time_minutes, estimated_cost_tier, and cost_notes. Use null for uncertain times and explain inference in assumptions when needed.',
      ].join(' '),
      payload: textPayload,
      imageDataUrl,
    });
  }

  async chat(input: {
    message: string;
    history: AiChatMessage[];
    context?: Record<string, unknown>;
  }): Promise<AiChatResult> {
    return this.createStructuredResponse<AiChatResult>({
      schemaName: 'chef_food_chat',
      schema: chatSchema,
      task: 'Answer the user as a concise cooking, meal prep, ingredient, recipe, and Preppie workflow assistant. Use context when provided.',
      payload: input,
    });
  }

  async structureInventory(
    input: StructureInventoryDto,
  ): Promise<AiInventoryStructureResult> {
    return this.createStructuredResponse<AiInventoryStructureResult>({
      schemaName: 'chef_inventory_structure',
      schema: inventoryStructureSchema,
      task: [
        'Convert a spoken kitchen inventory transcript into structured inventory review rows.',
        'Only put kitchen, pantry, grocery, cooking, or food-related items in items.',
        'If the transcript mentions non-kitchen items such as perfume, soap, medicine, tools, clothing, or other household goods, put those rows in potential_errors instead of items.',
        'Potential errors still need best-effort display_name, item_name, brand, quantity, unit, notes, and conflicts so the UI can let the user manually approve them.',
        'Return only fields the inventory system can save. display_name is the exact inventory list name. item_name is the canonical ingredient/product family. brand maps to the inventory label field. quantity maps to estimated_amount. unit maps to unit.',
        'Keep item_name simple and canonical, such as "salt", "wheat flour", or "olive oil"; do not include quantities, package words, or phrases like "pinch of".',
        'Prefer existing inventory conventions: when a spoken item resembles an inventory item, reuse that item canonical_name/name, label as brand, category style, unit style, and set matched_existing_id.',
        'Separate commercial brand, grocery item, and variant/flavor using saveable fields only. item_name is the base inventory item or product family, brand is the product maker/store, and display_name contains the user-facing brand/flavor/package wording.',
        'For branded packaged products, do not keep the full spoken phrase as item_name. Examples: "Salted Caramel Monster" -> display_name "Monster Salted Caramel Energy Drink", item_name "energy drink", brand "Monster"; "Great Value salt" -> display_name "Great Value Salt", item_name "salt", brand "Great Value"; "Santino cooking oil" -> display_name "Santino Cooking Oil", item_name "cooking oil", brand "Santino".',
        'Known beverage/snack brands such as Monster, Red Bull, Coca-Cola, Pepsi, Sprite, Gatorade, Doritos, Lays, Cheetos, Pringles, Oreo, Kellogg, and Cheerios should usually be brand, not item_name.',
        'Avoid vague item_name values like "dessert item", "food item", or "pantry item" when a clearer family exists. Use concrete item_name values such as energy drink, cereal, chips, cookies, sauce, cooking oil, wheat flour, or basmati rice.',
        'If the user says a compact quantity like "2kg", "2 kg", "five kilograms", or "500g", split it exactly into quantity and unit. For "2kg", output quantity 2 and unit "kg". Do not convert units unless the spoken unit is not allowed.',
        'Preserve the unit the user said when it fits the allowed_units list. If no unit is clear, infer a practical allowed unit from allowed_units.',
        'Treat brand/store names as brand, not item_name. Map brand to the inventory label field.',
        'Use current inventory context to set matched_existing_id when the spoken item likely refers to an existing item.',
        'When quantity, unit, brand, or duplicate mentions conflict, add conflicts that explain what changed.',
        'Honor user_instructions when present, but never override the kitchen/food relevance rule.',
      ].join(' '),
      payload: input,
    });
  }

  private async createStructuredResponse<T>(input: {
    schemaName: string;
    schema: object;
    task: string;
    payload: unknown;
    imageDataUrl?: string;
  }): Promise<T> {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new ServiceUnavailableException('OPENAI_API_KEY is not configured');
    }

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      readPositiveIntEnv('OPENAI_REQUEST_TIMEOUT_MS', 120_000),
    );

    let response: Response;
    try {
      response = await fetch(OPENAI_RESPONSES_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.model,
          input: buildResponseInput(
            input.task,
            input.payload,
            input.imageDataUrl,
          ),
          text: {
            format: {
              type: 'json_schema',
              name: input.schemaName,
              schema: input.schema,
              strict: true,
            },
          },
        }),
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ServiceUnavailableException('OpenAI request timed out');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }

    const body = (await response.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;

    if (!response.ok) {
      const message =
        typeof body?.error === 'object' &&
        body.error &&
        'message' in body.error &&
        typeof body.error.message === 'string'
          ? body.error.message
          : 'OpenAI request failed';
      throw new ServiceUnavailableException(message);
    }

    const outputText = extractOutputText(body);

    if (!outputText) {
      throw new ServiceUnavailableException('OpenAI returned no text output');
    }

    return JSON.parse(outputText) as T;
  }
}

function readPositiveIntEnv(name: string, fallback: number): number {
  const value = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function extractOutputText(body: Record<string, unknown> | null): string {
  if (!body) return '';

  if (typeof body.output_text === 'string') {
    return body.output_text;
  }

  const output = Array.isArray(body.output) ? body.output : [];
  const chunks: string[] = [];

  for (const item of output) {
    if (!isResponseOutputItem(item)) {
      continue;
    }

    const content = item.content;
    for (const block of content) {
      if (!isResponseTextBlock(block)) {
        continue;
      }

      chunks.push(block.text);
    }
  }

  return chunks.join('');
}

function buildResponseInput(
  task: string,
  payload: unknown,
  imageDataUrl?: string,
) {
  const userPayload = JSON.stringify(
    {
      task,
      payload,
    },
    null,
    2,
  );

  if (!imageDataUrl) {
    return [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPayload },
    ];
  }

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: [
        { type: 'input_text', text: userPayload },
        { type: 'input_image', image_url: imageDataUrl, detail: 'low' },
      ],
    },
  ];
}

function isResponseTextBlock(value: unknown): value is { text: string } {
  return (
    !!value &&
    typeof value === 'object' &&
    'text' in value &&
    typeof value.text === 'string'
  );
}

function isResponseOutputItem(value: unknown): value is { content: unknown[] } {
  return (
    !!value &&
    typeof value === 'object' &&
    'content' in value &&
    Array.isArray(value.content)
  );
}
