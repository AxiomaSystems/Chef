import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Ingredient, KitchenInventoryItem } from '@cart/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AddKitchenInventoryItemDto } from './dto/add-kitchen-inventory-item.dto';
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
      },
      create: {
        canonicalName: normalizedName,
        slug,
        aliases: [],
        visionLabels: [],
      },
    });
  }

  async listInventory(userId: string): Promise<KitchenInventoryItem[]> {
    const items = await this.prisma.kitchenInventoryItem.findMany({
      where: { userId },
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

    return new Set(items.map((item) => item.ingredient.slug));
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

    if (!ingredient) {
      throw new NotFoundException('Ingredient not found');
    }

    const existing = await this.prisma.kitchenInventoryItem.findUnique({
      where: {
        userId_ingredientId: {
          userId,
          ingredientId: ingredient.id,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Ingredient is already in your kitchen');
    }

    const item = await this.prisma.kitchenInventoryItem.create({
      data: {
        userId,
        ingredientId: ingredient.id,
        label: input.label?.trim() || undefined,
        source: 'manual',
        confidence: 'high',
      },
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
