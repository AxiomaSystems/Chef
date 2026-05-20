import { Injectable } from '@nestjs/common';
import type {
  CreateCartPersistenceInput,
  CreateCartDraftPersistenceInput,
  CreateShoppingCartPersistenceInput,
  UpsertIngredientReviewPersistenceInput,
  UpdateCartDraftPersistenceInput,
  UpdateCartPersistenceInput,
  UpdateShoppingCartPersistenceInput,
} from './cart.persistence.types';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CartPersistenceRepository {
  constructor(private readonly prisma: PrismaService) {}

  createDraft(input: CreateCartDraftPersistenceInput) {
    return this.prisma.cartDraft.create({
      data: {
        userId: input.userId,
        name: input.name,
        selections: input.selections,
        retailer: input.retailer,
      },
    });
  }

  updateDraft(
    userId: string,
    id: string,
    input: UpdateCartDraftPersistenceInput,
  ) {
    return this.prisma.cartDraft.updateMany({
      where: { id, userId },
      data: {
        name: input.name,
        selections: input.selections,
        retailer: input.retailer,
      },
    });
  }

  deleteDraft(userId: string, id: string) {
    return this.prisma.cartDraft.deleteMany({
      where: { id, userId },
    });
  }

  async createCart(input: CreateCartPersistenceInput) {
    return this.prisma.$transaction(async (tx) => {
      await tx.cart.updateMany({
        where: { userId: input.userId, status: 'active' },
        data: { status: 'archived' },
      });

      return tx.cart.create({
        data: {
          userId: input.userId,
          name: input.name,
          retailer: input.retailer,
          status: 'active',
          selections: input.selections,
          dishes: input.dishes,
        },
      });
    });
  }

  updateCart(userId: string, id: string, input: UpdateCartPersistenceInput) {
    return this.prisma.cart.updateMany({
      where: { id, userId },
      data: {
        name: input.name,
        retailer: input.retailer,
        selections: input.selections,
        dishes: input.dishes,
        status: input.status,
      },
    });
  }

  deleteCart(userId: string, id: string) {
    return this.prisma.cart.deleteMany({
      where: { id, userId },
    });
  }

  upsertIngredientReview(input: UpsertIngredientReviewPersistenceInput) {
    return this.prisma.ingredientReview.upsert({
      where: { cartId: input.cartId },
      create: {
        cartId: input.cartId,
        items: input.items,
      },
      update: {
        items: input.items,
      },
    });
  }

  async createShoppingCart(input: CreateShoppingCartPersistenceInput) {
    return this.prisma.$transaction(async (tx) => {
      await tx.shoppingCart.updateMany({
        where: { userId: input.userId, status: 'active' },
        data: { status: 'archived' },
      });

      return tx.shoppingCart.create({
        data: {
          userId: input.userId,
          cartId: input.cartId,
          cartDraftId: input.cartDraftId,
          name: input.shoppingCart.name,
          retailer: input.shoppingCart.retailer,
          status: 'active',
          overview: input.shoppingCart.overview,
          matchedItems: input.shoppingCart.matched_items,
          estimatedSubtotal: input.shoppingCart.estimated_subtotal,
          estimatedTotal: input.shoppingCart.estimated_total,
          externalUrl: input.shoppingCart.external_url,
          externalReferenceId: input.shoppingCart.external_reference_id,
        },
      });
    });
  }

  async updateShoppingCart(
    userId: string,
    id: string,
    input: UpdateShoppingCartPersistenceInput,
  ) {
    return this.prisma.$transaction(async (tx) => {
      if (input.status === 'active') {
        await tx.shoppingCart.updateMany({
          where: {
            userId,
            status: 'active',
            NOT: { id },
          },
          data: { status: 'archived' },
        });
      }

      return tx.shoppingCart.updateMany({
        where: { id, userId },
        data: {
          matchedItems: input.matched_items,
          estimatedSubtotal: input.estimated_subtotal,
          estimatedTotal: input.estimated_total,
          externalUrl: input.external_url,
          externalReferenceId: input.external_reference_id,
          status: input.status,
          checkedOutAt:
            input.checked_out_at === undefined
              ? undefined
              : input.checked_out_at
                ? new Date(input.checked_out_at)
                : null,
          inventoryAppliedAt:
            input.inventory_applied_at === undefined
              ? undefined
              : input.inventory_applied_at
                ? new Date(input.inventory_applied_at)
                : null,
        },
      });
    });
  }

  deleteShoppingCart(userId: string, id: string) {
    return this.prisma.shoppingCart.deleteMany({
      where: { id, userId },
    });
  }

  findDraftsByUser(userId: string) {
    return this.prisma.cartDraft.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  findDraftById(userId: string, id: string) {
    return this.prisma.cartDraft.findFirst({
      where: { id, userId },
    });
  }

  findCartsByUser(userId: string) {
    return this.prisma.cart.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  findCartById(userId: string, id: string) {
    return this.prisma.cart.findFirst({
      where: { id, userId },
    });
  }

  findIngredientReviewByCartId(userId: string, cartId: string) {
    return this.prisma.ingredientReview.findFirst({
      where: {
        cartId,
        cart: {
          userId,
        },
      },
    });
  }

  findShoppingCartsByUser(userId: string) {
    return this.prisma.shoppingCart.findMany({
      where: { userId, status: 'active' },
      orderBy: { createdAt: 'desc' },
    });
  }

  findShoppingCartHistoryByUser(userId: string) {
    return this.prisma.shoppingCart.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  findShoppingCartById(userId: string, id: string) {
    return this.prisma.shoppingCart.findFirst({
      where: { id, userId },
    });
  }
}
