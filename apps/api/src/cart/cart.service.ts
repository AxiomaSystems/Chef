import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  Cart,
  CreateCartRequest,
  CreateShoppingCartRequest,
  ShoppingCart,
} from '@cart/shared';
import { AggregationService } from '../aggregation/aggregation.service';
import { MatchingService } from '../matching/matching.service';
import { RecipeService } from '../recipe/recipe.service';
import { UserContextService } from '../user/user-context.service';
import { CartPersistenceService } from './cart.persistence';
import {
  buildDishesFromSelections,
  buildShoppingCartResponse,
  cloneCartSelections,
} from './cart.runtime';
import { CreateCartDraftDto } from './dto/create-cart-draft.dto';
import { CreateCartDto } from './dto/create-cart.dto';
import { CreateShoppingCartDto } from './dto/create-shopping-cart.dto';
import { UpdateCartDraftDto } from './dto/update-cart-draft.dto';
import { UpdateCartDto } from './dto/update-cart.dto';

@Injectable()
export class CartService {
  constructor(
    private readonly recipeService: RecipeService,
    private readonly aggregationService: AggregationService,
    private readonly matchingService: MatchingService,
    private readonly cartPersistenceService: CartPersistenceService,
    private readonly userContextService: UserContextService,
  ) {}

  async createDraft(input: CreateCartDraftDto, actorUserId?: string) {
    const actor = await this.userContextService.resolveActorUser(actorUserId);

    return this.cartPersistenceService.createDraft({
      userId: actor.id,
      name: input.name,
      selections: input.selections,
      retailer: input.retailer,
    });
  }

  async updateDraft(
    id: string,
    input: UpdateCartDraftDto,
    actorUserId?: string,
  ) {
    const actor = await this.userContextService.resolveActorUser(actorUserId);
    const updated = await this.cartPersistenceService.updateDraft(actor.id, id, {
      name: input.name,
      selections: input.selections,
      retailer: input.retailer,
    });

    if (updated.count === 0) {
      throw new NotFoundException(`Cart draft ${id} not found`);
    }

    return this.findDraft(id, actorUserId);
  }

  async removeDraft(id: string, actorUserId?: string) {
    const actor = await this.userContextService.resolveActorUser(actorUserId);
    const deleted = await this.cartPersistenceService.deleteDraft(actor.id, id);

    if (deleted.count === 0) {
      throw new NotFoundException(`Cart draft ${id} not found`);
    }
  }

  async listDrafts(actorUserId?: string) {
    const actor = await this.userContextService.resolveActorUser(actorUserId);
    return this.cartPersistenceService.findDraftsByUser(actor.id);
  }

  async findDraft(id: string, actorUserId?: string) {
    const actor = await this.userContextService.resolveActorUser(actorUserId);
    const draft = await this.cartPersistenceService.findDraftById(actor.id, id);

    if (!draft) {
      throw new NotFoundException(`Cart draft ${id} not found`);
    }

    return draft;
  }

  async createCart(input: CreateCartDto, actorUserId?: string): Promise<Cart> {
    const actor = await this.userContextService.resolveActorUser(actorUserId);
    const recipeIds = input.selections.map((selection) => selection.recipe_id);
    const recipes = await this.recipeService.findManyByIds(recipeIds, actorUserId);
    const dishes = buildDishesFromSelections(recipes, input);

    const cart = await this.cartPersistenceService.createCart({
      userId: actor.id,
      name: input.name,
      retailer: input.retailer,
      selections: input.selections,
      dishes,
    });

    return this.withCartOverview(cart);
  }

  async updateCart(id: string, input: UpdateCartDto, actorUserId?: string) {
    const actor = await this.userContextService.resolveActorUser(actorUserId);
    const existing = await this.cartPersistenceService.findCartById(actor.id, id);

    if (!existing) {
      throw new NotFoundException(`Cart ${id} not found`);
    }

    const nextSelections = input.selections ?? cloneCartSelections(existing);
    const nextName = input.name ?? existing.name;
    const nextRetailer = input.retailer ?? existing.retailer;
    const nextDishes = input.selections
      ? buildDishesFromSelections(
          await this.recipeService.findManyByIds(
            nextSelections.map((selection) => selection.recipe_id),
            actorUserId,
          ),
          { selections: nextSelections },
        )
      : existing.dishes;

    const updated = await this.cartPersistenceService.updateCart(actor.id, id, {
      name: nextName,
      retailer: nextRetailer,
      selections: nextSelections,
      dishes: nextDishes,
    });

    if (updated.count === 0) {
      throw new NotFoundException(`Cart ${id} not found`);
    }

    return this.findCart(id, actorUserId);
  }

  async removeCart(id: string, actorUserId?: string) {
    const actor = await this.userContextService.resolveActorUser(actorUserId);
    const deleted = await this.cartPersistenceService.deleteCart(actor.id, id);

    if (deleted.count === 0) {
      throw new NotFoundException(`Cart ${id} not found`);
    }
  }

  async listCarts(actorUserId?: string) {
    const actor = await this.userContextService.resolveActorUser(actorUserId);
    const carts = await this.cartPersistenceService.findCartsByUser(actor.id);
    return carts.map((cart) => this.withCartOverview(cart));
  }

  async findCart(id: string, actorUserId?: string) {
    const actor = await this.userContextService.resolveActorUser(actorUserId);
    const cart = await this.cartPersistenceService.findCartById(actor.id, id);

    if (!cart) {
      throw new NotFoundException(`Cart ${id} not found`);
    }

    return this.withCartOverview(cart);
  }

  async createShoppingCart(
    cartId: string,
    input: CreateShoppingCartDto,
    actorUserId?: string,
  ): Promise<ShoppingCart> {
    const actor = await this.userContextService.resolveActorUser(actorUserId);
    const cart = await this.cartPersistenceService.findCartById(actor.id, cartId);

    if (!cart) {
      throw new NotFoundException(`Cart ${cartId} not found`);
    }

    const computation = this.aggregationService.compute(cart.dishes);
    const matchedItems = this.matchingService.matchIngredients(computation.overview);
    const estimatedSubtotal =
      this.matchingService.estimateSubtotal(matchedItems);

    return this.cartPersistenceService.createShoppingCart({
      userId: actor.id,
      cartId,
      shoppingCart: buildShoppingCartResponse({
        cartId,
        overview: computation.overview,
        matchedItems,
        estimatedSubtotal,
        retailer: input.retailer,
      }),
    });
  }

  async listShoppingCarts(actorUserId?: string) {
    const actor = await this.userContextService.resolveActorUser(actorUserId);
    return this.cartPersistenceService.findShoppingCartsByUser(actor.id);
  }

  async listShoppingCartHistory(actorUserId?: string) {
    const actor = await this.userContextService.resolveActorUser(actorUserId);
    return this.cartPersistenceService.findShoppingCartHistoryByUser(actor.id);
  }

  async findShoppingCart(id: string, actorUserId?: string) {
    const actor = await this.userContextService.resolveActorUser(actorUserId);
    const cart = await this.cartPersistenceService.findShoppingCartById(
      actor.id,
      id,
    );

    if (!cart) {
      throw new NotFoundException(`Shopping cart ${id} not found`);
    }

    return cart;
  }

  private withCartOverview(cart: Cart): Cart {
    return {
      ...cart,
      overview: this.aggregationService.compute(cart.dishes).overview,
    };
  }
}
