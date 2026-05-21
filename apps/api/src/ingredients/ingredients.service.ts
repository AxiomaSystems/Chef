import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  inferIngredientCategory,
  inferInventoryAmount,
  inferInventoryUnit,
  normalizeIngredientName,
  normalizeIngredientSlug,
  type Ingredient,
  type KitchenInventoryItem,
  type MatchedIngredientProduct,
} from '@cart/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AddKitchenInventoryItemDto } from './dto/add-kitchen-inventory-item.dto';
import { UpdateKitchenInventoryItemDto } from './dto/update-kitchen-inventory-item.dto';
import { mapIngredient, mapKitchenInventoryItem } from './ingredients.mapper';

@Injectable()
export class IngredientsService {
  constructor(private readonly prisma: PrismaService) {}

  normalizeName(name: string): string {
    return normalizeIngredientName(name);
  }

  normalizeSlug(name: string): string {
    return normalizeIngredientSlug(name);
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
        category: inferIngredientCategory(normalizedName),
        defaultUnit: inferInventoryUnit(normalizedName),
      },
      create: {
        canonicalName: normalizedName,
        slug,
        category: inferIngredientCategory(normalizedName),
        defaultUnit: inferInventoryUnit(normalizedName),
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
      inferInventoryUnit(displayName);
    const estimatedAmount =
      input.estimated_amount ?? inferInventoryAmount(unit);

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

  async addPurchasedCartItemsToInventory(
    userId: string,
    items: MatchedIngredientProduct[],
  ): Promise<void> {
    for (const item of items) {
      const canonicalName = item.canonical_ingredient.trim();
      if (!canonicalName) continue;

      const ingredient = await this.ensureIngredient(canonicalName);
      const unit = item.needed_unit?.trim() || ingredient.defaultUnit || 'unit';
      const amount = Math.max(0, item.needed_amount || 0);
      const displayName = canonicalName;
      const productLabel =
        item.selected_product?.title?.trim() ||
        item.manual_label?.trim() ||
        canonicalName;

      const existing = await this.prisma.kitchenInventoryItem.findFirst({
        where: {
          userId,
          ingredientId: ingredient.id,
          unit,
          reviewStatus: { in: ['pending', 'active'] },
        },
        orderBy: { updatedAt: 'desc' },
      });

      if (existing) {
        const nextAmount =
          existing.estimatedAmount !== null && amount > 0
            ? existing.estimatedAmount + amount
            : (existing.estimatedAmount ?? (amount || undefined));

        await this.prisma.kitchenInventoryItem.update({
          where: { id: existing.id },
          data: {
            displayName:
              existing.source === 'cart'
                ? displayName
                : existing.displayName || displayName,
            normalizedName:
              existing.source === 'cart'
                ? this.normalizeName(displayName)
                : undefined,
            label: existing.label || productLabel,
            estimatedAmount: nextAmount,
            source: 'cart',
            confidence: 'medium',
            reviewStatus: 'active',
          },
        });
        continue;
      }

      await this.prisma.kitchenInventoryItem.create({
        data: {
          userId,
          ingredientId: ingredient.id,
          displayName,
          normalizedName: this.normalizeName(displayName),
          label: productLabel,
          estimatedAmount: amount || inferInventoryAmount(unit),
          unit,
          source: 'cart',
          confidence: 'medium',
          reviewStatus: 'active',
        },
      });
    }
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
