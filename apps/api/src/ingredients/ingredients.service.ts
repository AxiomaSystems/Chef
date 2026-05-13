import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Ingredient, KitchenInventoryItem } from '@cart/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AddKitchenInventoryItemDto } from './dto/add-kitchen-inventory-item.dto';
import { UpdateKitchenInventoryItemDto } from './dto/update-kitchen-inventory-item.dto';
import { mapIngredient, mapKitchenInventoryItem } from './ingredients.mapper';

@Injectable()
export class IngredientsService {
  constructor(private readonly prisma: PrismaService) {}

  normalizeName(name: string): string {
    return name.trim().replace(/\s+/g, ' ').toLowerCase();
  }

  normalizeSlug(name: string): string {
    return this.normalizeName(name)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private inferIngredientCategory(name: string): string {
    const value = this.normalizeName(name);

    if (
      /(chicken|beef|pork|bacon|turkey|lamb|fish|sirloin|fillet|salmon|tuna|shrimp|crab|lobster|scallop|cod|tofu|tempeh|lentil|chickpea|bean|edamame)/.test(
        value,
      )
    ) {
      return 'protein';
    }

    if (
      /(milk|cheese|egg|cream|yogurt|butter|mozzarella|parmesan|feta|brie|gouda|ricotta|mascarpone)/.test(
        value,
      )
    ) {
      return 'dairy-eggs';
    }

    if (
      /(apple|banana|lemon|lime|orange|strawberry|blueberry|raspberry|mango|avocado|grape|pineapple|watermelon|peach|pear|plum|kiwi|papaya|coconut|cherry|pomegranate|fig|grapefruit|cantaloupe)/.test(
        value,
      )
    ) {
      return 'fruit';
    }

    if (
      /(onion|garlic|tomato|pepper|broccoli|spinach|kale|carrot|celery|cucumber|zucchini|eggplant|mushroom|asparagus|pea|corn|cauliflower|cabbage|lettuce|arugula|potato|beet|artichoke|leek|bok choy|radish|turnip|parsnip|aji|cilantro|parsley|basil|chive|dill)/.test(
        value,
      )
    ) {
      return 'produce';
    }

    if (
      /(rice|bread|fries|pasta|spaghetti|penne|tortilla|oat|quinoa|barley|couscous|breadcrumb|panko|pita|naan|flour|cornmeal)/.test(
        value,
      )
    ) {
      return 'pantry';
    }

    if (
      /(oil|sauce|vinegar|paste|ketchup|mustard|mayonnaise|sriracha|tahini|pesto|broth|stock|canned|sugar|honey|syrup|baking|cornstarch|yeast|cocoa|chocolate|peanut butter|almond butter|jam|tapenade|caper|pecan|almond|walnut|cashew|pistachio|seed)/.test(
        value,
      )
    ) {
      return 'pantry';
    }

    if (
      /(salt|pepper|cumin|paprika|turmeric|cinnamon|oregano|thyme|rosemary|bay|chili|cayenne|powder|ginger|nutmeg|clove|cardamom|coriander|fennel|sage|allspice|anise|vanilla|saffron|curry|masala|za'atar|sumac|harissa|ras el hanout)/.test(
        value,
      )
    ) {
      return 'spices';
    }

    return 'other';
  }

  private inferDefaultUnit(name: string): string {
    const value = this.normalizeName(name);

    if (
      /(chicken|beef|pork|turkey|lamb|salmon|tuna|shrimp|fish|cod|crab|lobster|scallop)/.test(
        value,
      )
    ) {
      return 'lb';
    }

    if (/(egg|eggs)/.test(value)) return 'dozen';
    if (/(milk|cream|yogurt|broth|stock|coconut milk)/.test(value)) {
      return 'carton';
    }
    if (
      /(cheese|butter|tofu|tempeh|bacon|nut|seed|almond|walnut|cashew|pecan|pistachio)/.test(
        value,
      )
    ) {
      return 'oz';
    }
    if (
      /(rice|pasta|oat|quinoa|barley|couscous|flour|cornmeal|sugar|lentil|chickpea|bean)/.test(
        value,
      )
    ) {
      return 'cup';
    }
    if (/(bread|sourdough|tortilla|pita|naan)/.test(value)) return 'slice';
    if (/(cilantro|parsley|basil|chive|dill|rosemary|thyme|sage)/.test(value)) {
      return 'bunch';
    }
    if (
      /(oil|sauce|vinegar|ketchup|mustard|mayonnaise|sriracha|honey|syrup)/.test(
        value,
      )
    ) {
      return 'bottle';
    }
    if (/(paste|jam|tapenade|caper|canned|tomatoes)/.test(value)) {
      return 'jar';
    }
    if (
      /(salt|pepper|cumin|paprika|turmeric|cinnamon|oregano|powder|extract|saffron|sumac|harissa)/.test(
        value,
      )
    ) {
      return 'jar';
    }
    if (/corn/.test(value)) return 'ear';

    return 'unit';
  }

  private inferDefaultAmount(unit: string): number {
    const defaults: Record<string, number> = {
      unit: 1,
      lb: 1,
      oz: 8,
      g: 500,
      kg: 1,
      cup: 1,
      tbsp: 1,
      tsp: 1,
      bunch: 1,
      slice: 4,
      can: 1,
      jar: 1,
      bottle: 1,
      carton: 1,
      dozen: 1,
      ear: 2,
      bag: 1,
    };

    return defaults[unit] ?? 1;
  }

  async listIngredients(query?: string): Promise<Ingredient[]> {
    const normalizedQuery = query?.trim();
    const ingredients = await this.prisma.ingredient.findMany({
      where: normalizedQuery
        ? {
            OR: [
              {
                canonicalName: {
                  contains: normalizedQuery,
                  mode: 'insensitive',
                },
              },
              {
                slug: {
                  contains: this.normalizeSlug(normalizedQuery),
                },
              },
            ],
          }
        : undefined,
      orderBy: [{ category: 'asc' }, { canonicalName: 'asc' }],
      take: 100,
    });

    return ingredients.map(mapIngredient);
  }

  async ensureIngredient(canonicalName: string) {
    const normalizedName = this.normalizeName(canonicalName);
    const slug = this.normalizeSlug(normalizedName);

    if (!slug) {
      throw new BadRequestException('Ingredient name is required');
    }

    return this.prisma.ingredient.upsert({
      where: { slug },
      update: {
        canonicalName: normalizedName,
        category: this.inferIngredientCategory(normalizedName),
        defaultUnit: this.inferDefaultUnit(normalizedName),
      },
      create: {
        canonicalName: normalizedName,
        slug,
        category: this.inferIngredientCategory(normalizedName),
        defaultUnit: this.inferDefaultUnit(normalizedName),
        aliases: [],
        visionLabels: [],
      },
    });
  }

  async resolveIngredientIdsBySlugs(
    slugs: string[],
  ): Promise<Map<string, string>> {
    const uniqueSlugs = Array.from(new Set(slugs.filter(Boolean)));

    if (uniqueSlugs.length === 0) {
      return new Map();
    }

    const ingredients = await this.prisma.ingredient.findMany({
      where: {
        slug: {
          in: uniqueSlugs,
        },
      },
      select: {
        id: true,
        slug: true,
      },
    });

    return new Map(
      ingredients.map((ingredient) => [ingredient.slug, ingredient.id]),
    );
  }

  async listInventory(userId: string): Promise<KitchenInventoryItem[]> {
    const items = await this.prisma.kitchenInventoryItem.findMany({
      where: {
        userId,
        reviewStatus: { in: ['pending', 'active'] },
      },
      include: { ingredient: true },
      orderBy: [{ updatedAt: 'desc' }],
    });

    return items.map(mapKitchenInventoryItem);
  }

  async listInventoryIngredientSlugs(userId: string): Promise<Set<string>> {
    const items = await this.prisma.kitchenInventoryItem.findMany({
      where: { userId },
      include: { ingredient: true },
    });

    return new Set(
      items.flatMap((item) => (item.ingredient ? [item.ingredient.slug] : [])),
    );
  }

  async addInventoryItem(
    userId: string,
    input: AddKitchenInventoryItemDto,
  ): Promise<KitchenInventoryItem> {
    const ingredient = input.ingredient_id
      ? await this.prisma.ingredient.findUnique({
          where: { id: input.ingredient_id },
        })
      : input.canonical_name
        ? await this.ensureIngredient(input.canonical_name)
        : null;

    if (input.ingredient_id && !ingredient) {
      throw new NotFoundException('Ingredient not found');
    }

    const displayName =
      input.display_name?.trim() ||
      input.label?.trim() ||
      ingredient?.canonicalName ||
      input.canonical_name?.trim();

    if (!displayName) {
      throw new BadRequestException('Inventory item name is required');
    }

    const unit =
      input.unit?.trim() ||
      ingredient?.defaultUnit ||
      this.inferDefaultUnit(displayName);
    const estimatedAmount =
      input.estimated_amount ?? this.inferDefaultAmount(unit);

    const item = await this.prisma.kitchenInventoryItem.create({
      data: {
        userId,
        ingredientId: ingredient?.id,
        displayName,
        normalizedName: this.normalizeName(displayName),
        label: input.label?.trim() || undefined,
        estimatedAmount,
        unit,
        source: 'manual',
        confidence: ingredient ? 'high' : 'medium',
        reviewStatus: input.review_status ?? 'active',
      },
      include: { ingredient: true },
    });

    return mapKitchenInventoryItem(item);
  }

  async updateInventoryItem(
    userId: string,
    id: string,
    input: UpdateKitchenInventoryItemDto,
  ): Promise<KitchenInventoryItem> {
    const nextDisplayName =
      input.display_name === undefined
        ? input.label === undefined
          ? undefined
          : input.label?.trim() || undefined
        : input.display_name?.trim() || undefined;

    const updated = await this.prisma.kitchenInventoryItem.updateMany({
      where: {
        id,
        userId,
      },
      data: {
        ...(nextDisplayName
          ? {
              displayName: nextDisplayName,
              normalizedName: this.normalizeName(nextDisplayName),
            }
          : {}),
        label:
          input.label === undefined ? undefined : input.label?.trim() || null,
        reviewStatus:
          input.review_status === undefined
            ? undefined
            : (input.review_status ?? undefined),
        estimatedAmount:
          input.estimated_amount === undefined
            ? undefined
            : input.estimated_amount,
        unit: input.unit === undefined ? undefined : input.unit?.trim() || null,
      },
    });

    if (updated.count === 0) {
      throw new NotFoundException(`Kitchen inventory item ${id} not found`);
    }

    const item = await this.prisma.kitchenInventoryItem.findUniqueOrThrow({
      where: { id },
      include: { ingredient: true },
    });

    return mapKitchenInventoryItem(item);
  }

  async removeInventoryItem(userId: string, id: string): Promise<void> {
    const deleted = await this.prisma.kitchenInventoryItem.deleteMany({
      where: {
        id,
        userId,
      },
    });

    if (deleted.count === 0) {
      throw new NotFoundException(`Kitchen inventory item ${id} not found`);
    }
  }
}
