import { Injectable } from '@nestjs/common';
import type {
  CreateCartPersistenceInput,
  CreateCartDraftPersistenceInput,
  CreateShoppingCartPersistenceInput,
  UpdateCartDraftPersistenceInput,
  UpdateCartPersistenceInput,
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

  updateDraft(userId: string, id: string, input: UpdateCartDraftPersistenceInput) {
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

  createCart(input: CreateCartPersistenceInput) {
    return this.prisma.cart.create({
      data: {
        userId: input.userId,
        name: input.name,
        selections: input.selections,
        dishes: input.dishes,
      },
    });
  }

  updateCart(userId: string, id: string, input: UpdateCartPersistenceInput) {
    return this.prisma.cart.updateMany({
      where: { id, userId },
      data: {
        name: input.name,
        selections: input.selections,
        dishes: input.dishes,
      },
    });
  }

  deleteCart(userId: string, id: string) {
    return this.prisma.cart.deleteMany({
      where: { id, userId },
    });
  }

  createShoppingCart(input: CreateShoppingCartPersistenceInput) {
    return this.prisma.shoppingCart.create({
      data: {
        userId: input.userId,
        cartId: input.cartId,
        cartDraftId: input.cartDraftId,
        retailer: input.shoppingCart.retailer,
        overview: input.shoppingCart.overview,
        matchedItems: input.shoppingCart.matched_items,
        estimatedSubtotal: input.shoppingCart.estimated_subtotal,
        estimatedTotal: input.shoppingCart.estimated_total,
      },
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

  findShoppingCartsByUser(userId: string) {
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
