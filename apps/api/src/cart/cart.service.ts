import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type {
  Cart,
  AggregatedIngredient,
  MatchedIngredientProduct,
  Retailer,
  RetailerProductSearchResponse,
  ShoppingCart,
} from '@cart/shared';
import { AggregationService } from '../aggregation/aggregation.service';
import { CartExportService } from '../cart-export/cart-export.service';
import { IngredientsService } from '../ingredients/ingredients.service';
import { MatchingService } from '../matching/matching.service';
import { mapMissingIngredientMatch } from '../matching/matching.mapper';
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
import { UpdateShoppingCartDto } from './dto/update-shopping-cart.dto';

@Injectable()
export class CartService {
  constructor(
    private readonly recipeService: RecipeService,
    private readonly aggregationService: AggregationService,
    private readonly ingredientsService: IngredientsService,
    private readonly matchingService: MatchingService,
    private readonly cartExportService: CartExportService,
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
    return Promise.all(carts.map((cart) => this.withCartOverview(cart)));
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
    const actor =
      await this.userContextService.resolveActorUserShoppingContext(actorUserId);
    const cart = await this.cartPersistenceService.findCartById(actor.id, cartId);

    if (!cart) {
      throw new NotFoundException(`Cart ${cartId} not found`);
    }

    const computation = await this.withKitchenInventory(
      actor.id,
      this.aggregationService.compute(cart.dishes).overview,
    );
    const ingredientsToBuy = computation.filter((ingredient) => !ingredient.in_kitchen);
    const searchContext = this.buildRetailerSearchContext(
      input.retailer,
      actor.preferredZipCode,
      actor.preferredKrogerLocationId,
    );
    const matchedItems =
      input.retailer === 'instacart'
        ? ingredientsToBuy.map((ingredient) => ({
            ...mapMissingIngredientMatch(ingredient),
            notes: 'Instacart will resolve this item on the generated shopping list page.',
          }))
        : await this.matchingService.matchIngredients(
            ingredientsToBuy,
            input.retailer,
            searchContext,
          );
    const estimatedSubtotal =
      this.matchingService.estimateSubtotal(matchedItems);
    const handoff = await this.cartExportService.createHandoff({
      cartId,
      cartName: cart.name,
      retailer: input.retailer,
      overview: ingredientsToBuy,
      dishes: cart.dishes,
    });

    return this.cartPersistenceService.createShoppingCart({
      userId: actor.id,
      cartId,
      shoppingCart: buildShoppingCartResponse({
        cartId,
        overview: computation,
        matchedItems,
        estimatedSubtotal,
        retailer: input.retailer,
        externalUrl: handoff.externalUrl,
        externalReferenceId: handoff.externalReferenceId,
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

  async updateShoppingCart(
    id: string,
    input: UpdateShoppingCartDto,
    actorUserId?: string,
  ) {
    const actor = await this.userContextService.resolveActorUser(actorUserId);
    const existing = await this.cartPersistenceService.findShoppingCartById(
      actor.id,
      id,
    );

    if (!existing) {
      throw new NotFoundException(`Shopping cart ${id} not found`);
    }

    const matchedItems = (input.matched_items as MatchedIngredientProduct[]).map(
      (item) => ({
        ...item,
        kind: item.kind ?? 'ingredient_match',
      }),
    );

    const estimatedSubtotal = this.matchingService.estimateSubtotal(matchedItems);

    const updated = await this.cartPersistenceService.updateShoppingCart(
      actor.id,
      id,
      {
        matched_items: matchedItems,
        estimated_subtotal: estimatedSubtotal,
      },
    );

    if (updated.count === 0) {
      throw new NotFoundException(`Shopping cart ${id} not found`);
    }

    return this.findShoppingCart(id, actorUserId);
  }

  async searchRetailerProducts(
    retailer: Retailer,
    query: string,
    actorUserId?: string,
  ): Promise<RetailerProductSearchResponse> {
    if (retailer === 'instacart') {
      throw new BadRequestException(
        'Instacart product search is not supported yet. Generate an Instacart handoff from a cart instead.',
      );
    }

    const actor =
      await this.userContextService.resolveActorUserShoppingContext(actorUserId);
    const searchContext = this.buildRetailerSearchContext(
      retailer,
      actor.preferredZipCode,
      actor.preferredKrogerLocationId,
    );

    return {
      retailer,
      query,
      candidates: await this.matchingService.searchProducts(
        retailer,
        query,
        searchContext,
      ),
    };
  }

  private async withCartOverview(cart: Cart): Promise<Cart> {
    return {
      ...cart,
      overview: await this.withKitchenInventory(
        cart.user_id ?? '',
        this.aggregationService.compute(cart.dishes).overview,
      ),
    };
  }

  private async withKitchenInventory(
    userId: string,
    overview: AggregatedIngredient[],
  ): Promise<AggregatedIngredient[]> {
    if (!userId) {
      return overview;
    }

    const inventorySlugs =
      await this.ingredientsService.listInventoryIngredientSlugs(userId);

    return overview.map((ingredient) => ({
      ...ingredient,
      in_kitchen: inventorySlugs.has(
        this.ingredientsService.normalizeSlug(ingredient.canonical_ingredient),
      ),
    }));
  }

  private buildRetailerSearchContext(
    retailer: Retailer,
    preferredZipCode: string | null,
    preferredKrogerLocationId: string | null,
  ) {
    if (retailer === 'kroger') {
      const normalizedZipCode = preferredZipCode?.trim();
      if (!normalizedZipCode) {
        throw new BadRequestException('Set your shopping location first.');
      }

      if (!this.matchingService.isProviderEnabled('kroger')) {
        throw new ServiceUnavailableException(
          'Kroger search is not configured right now.',
        );
      }

      const normalizedLocationId = preferredKrogerLocationId?.trim();

      return {
        zipCode: normalizedZipCode,
        locationId: normalizedLocationId || undefined,
      };
    }

    if (retailer === 'instacart') {
      if (!this.cartExportService.isProviderEnabled('instacart')) {
        throw new ServiceUnavailableException(
          'Instacart handoff is not configured right now.',
        );
      }

      return {
        zipCode: preferredZipCode?.trim() || undefined,
      };
    }

    return {};
  }
}
