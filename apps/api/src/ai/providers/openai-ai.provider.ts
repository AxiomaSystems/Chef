import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { AiProvider } from '../ai.provider';
import {
  chatSchema,
  ingredientSwapSchema,
  mealGenerationSchema,
  recipeImportSchema,
} from '../ai.schemas';
import type {
  AiChatMessage,
  AiChatResult,
  AiIngredientSwapResult,
  AiMealGenerationResult,
  AiRecipeImportResult,
} from '../ai.types';
import type { GenerateMealsDto } from '../dto/generate-meals.dto';
import type { SwapIngredientDto } from '../dto/swap-ingredient.dto';

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';

const SYSTEM_PROMPT = `
You are Chef's food and cooking assistant.
Chef turns food ideas into structured recipes, missing ingredients, and grocery-ready carts.
Use structured Chef domain vocabulary.
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
        'When inventory is provided, prefer those ingredients and avoid inventing a different primary protein.',
        'For example, if the user asks for ugali and inventory includes fish but not beef, generate an ugali meal with fish rather than beef unless beef is explicitly requested. Ensure you get the Cuisine accurately(There is no need to set cuisine as Peruvian when the food is clearly Kenyan Cuisine)',
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

  async importRecipe(input: {
    request: { url: string; supplemental_text?: string };
    platform: 'youtube' | 'instagram' | 'tiktok' | 'generic';
    source_title: string;
    source_creator: string | null;
    source_description: string;
    source_image_url: string | null;
    extracted_text: string;
    extraction_notes: string[];
  }): Promise<AiRecipeImportResult> {
    return this.createStructuredResponse<AiRecipeImportResult>({
      schemaName: 'chef_recipe_import',
      schema: recipeImportSchema,
      task: 'Turn the imported recipe source into one structured Chef recipe preview. Use the extracted source text, metadata, and any supplemental caption/transcript text. Be explicit when fields are inferred or uncertain.',
      payload: input,
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
      task: 'Answer the user as a concise cooking, meal prep, ingredient, recipe, and Chef workflow assistant. Use context when provided.',
      payload: input,
    });
  }

  private async createStructuredResponse<T>(input: {
    schemaName: string;
    schema: object;
    task: string;
    payload: unknown;
  }): Promise<T> {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new ServiceUnavailableException('OPENAI_API_KEY is not configured');
    }

    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        input: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: JSON.stringify(
              {
                task: input.task,
                payload: input.payload,
              },
              null,
              2,
            ),
          },
        ],
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
