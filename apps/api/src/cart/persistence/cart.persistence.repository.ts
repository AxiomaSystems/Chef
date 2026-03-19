import { Injectable } from '@nestjs/common';
import type {
  CreateCartDraftPersistenceInput,
  CreateGeneratedCartPersistenceInput,
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

  createGeneratedCart(input: CreateGeneratedCartPersistenceInput) {
    return this.prisma.generatedCart.create({
      data: {
        userId: input.userId,
        cartDraftId: input.cartDraftId,
        retailer: input.cart.retailer,
        dishes: input.cart.dishes,
        overview: input.cart.overview,
        matchedItems: input.cart.matched_items,
        estimatedSubtotal: input.cart.estimated_subtotal,
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

  findGeneratedCartsByUser(userId: string) {
    return this.prisma.generatedCart.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  findGeneratedCartById(userId: string, id: string) {
    return this.prisma.generatedCart.findFirst({
      where: { id, userId },
    });
  }
}
