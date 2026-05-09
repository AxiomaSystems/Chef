import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type {
  Cart,
  AggregatedIngredient,
  IngredientReview,
  MatchedIngredientProduct,
  Retailer,
  RetailerProductSearchResponse,
  ShoppingCart,
  UpdateIngredientReviewItemRequest,
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
import { UpdateIngredientReviewDto } from './dto/update-ingredient-review.dto';
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
    const updated = await this.cartPersistenceService.updateDraft(
      actor.id,
      id,
      {
        name: input.name,
        selections: input.selections,
        retailer: input.retailer,
      },
    );

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

  async createRestockCart(
    items: string[],
    retailer: Retailer,
    actorUserId?: string,
  ): Promise<ShoppingCart> {
    const actor =
      await this.userContextService.resolveActorUserShoppingContext(
        actorUserId,
      );

    const syntheticDish = {
      name: 'Restock Items',
      ingredients: items
        .map((name) => name.trim().toLowerCase())
        .filter(Boolean)
        .map((name) => ({
          canonical_ingredient: name,
          amount: 1,
          unit: 'unit',
        })),
      steps: [],
    };

    const cart = await this.cartPersistenceService.createCart({
      userId: actor.id,
      name: 'Restock Cart',
      retailer,
      selections: [],
      dishes: [syntheticDish],
    });

    return this.createShoppingCart(cart.id!, { retailer }, actorUserId);
  }

  async createCart(input: CreateCartDto, actorUserId?: string): Promise<Cart> {
    const actor = await this.userContextService.resolveActorUser(actorUserId);
    const recipeIds = input.selections.map((selection) => selection.recipe_id);
    const recipes = await this.recipeService.findManyByIds(
      recipeIds,
      actorUserId,
    );
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
    const existing = await this.cartPersistenceService.findCartById(
      actor.id,
      id,
    );

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

  async getIngredientReview(
    cartId: string,
    actorUserId?: string,
  ): Promise<IngredientReview> {
    const actor = await this.userContextService.resolveActorUser(actorUserId);
    const cart = await this.cartPersistenceService.findCartById(
      actor.id,
      cartId,
    );

    if (!cart) {
      throw new NotFoundException(`Cart ${cartId} not found`);
    }

    const persisted =
      await this.cartPersistenceService.findIngredientReviewByCartId(
        actor.id,
        cartId,
      );
    const overview = await this.withKitchenInventory(
      actor.id,
      this.aggregationService.compute(cart.dishes).overview,
    );

    return {
      cart_id: cartId,
      items: this.applyIngredientReview(overview, persisted?.items ?? []).map(
        (ingredient) => ({
          ingredient_id: ingredient.ingredient_id,
          canonical_ingredient: ingredient.canonical_ingredient,
          total_amount: ingredient.reviewed_amount ?? ingredient.total_amount,
          unit: ingredient.reviewed_unit ?? ingredient.unit,
          source_dishes: ingredient.source_dishes,
          action: ingredient.review_action ?? 'buy',
          adjusted_amount: ingredient.reviewed_amount,
          adjusted_unit: ingredient.reviewed_unit,
        }),
      ),
      created_at: persisted?.created_at,
      updated_at: persisted?.updated_at,
    };
  }

  async updateIngredientReview(
    cartId: string,
    input: UpdateIngredientReviewDto,
    actorUserId?: string,
  ): Promise<IngredientReview> {
    const actor = await this.userContextService.resolveActorUser(actorUserId);
    const cart = await this.cartPersistenceService.findCartById(
      actor.id,
      cartId,
    );

    if (!cart) {
      throw new NotFoundException(`Cart ${cartId} not found`);
    }

    const overview = await this.withKitchenInventory(
      actor.id,
      this.aggregationService.compute(cart.dishes).overview,
    );
    const reviewInputs = new Map(
      input.items.flatMap((item) =>
        this.buildIngredientReviewKeys(item).map((key) => [key, item] as const),
      ),
    );

    for (const item of input.items) {
      if (item.action === 'adjust' && item.adjusted_amount === undefined) {
        throw new BadRequestException(
          'adjusted_amount is required when action is adjust.',
        );
      }
    }

    const items = overview.map((ingredient) => {
      const reviewInput = reviewInputs.get(
        this.findIngredientReviewKey(reviewInputs, ingredient),
      );
      const action = reviewInput?.action ?? 'buy';
      const item: IngredientReview['items'][number] = {
        ingredient_id: ingredient.ingredient_id,
        canonical_ingredient: ingredient.canonical_ingredient,
        total_amount: ingredient.total_amount,
        unit: ingredient.unit,
        source_dishes: ingredient.source_dishes,
        action,
      };

      if (action === 'adjust') {
        item.adjusted_amount = reviewInput?.adjusted_amount;
        if (reviewInput?.adjusted_unit) {
          item.adjusted_unit = reviewInput.adjusted_unit;
        }
      }

      return item;
    });
    const knownKeys = new Set(
      overview.flatMap((item) => this.buildIngredientReviewKeys(item)),
    );
    const unknownItem = input.items.find(
      (item) =>
        !this.buildIngredientReviewKeys(item).some((key) => knownKeys.has(key)),
    );

    if (unknownItem) {
      throw new BadRequestException(
        `Ingredient ${unknownItem.canonical_ingredient} (${unknownItem.unit}) is not in cart ${cartId}.`,
      );
    }

    return this.cartPersistenceService.upsertIngredientReview({
      cartId,
      items,
    });
  }

  async createShoppingCart(
    cartId: string,
    input: CreateShoppingCartDto,
    actorUserId?: string,
  ): Promise<ShoppingCart> {
    const actor =
      await this.userContextService.resolveActorUserShoppingContext(
        actorUserId,
      );
    const cart = await this.cartPersistenceService.findCartById(
      actor.id,
      cartId,
    );

    if (!cart) {
      throw new NotFoundException(`Cart ${cartId} not found`);
    }

    const computation = await this.withKitchenInventory(
      actor.id,
      this.aggregationService.compute(cart.dishes).overview,
    );
    const persistedReview =
      await this.cartPersistenceService.findIngredientReviewByCartId(
        actor.id,
        cartId,
      );
    const reviewedComputation = this.applyIngredientReview(
      computation,
      persistedReview?.items ?? [],
    );
    const ingredientsToBuy = reviewedComputation
      .filter(
        (ingredient) =>
          ingredient.review_action !== 'already_have' &&
          ingredient.review_action !== 'skip' &&
          (ingredient.remaining_to_buy ?? ingredient.total_amount) > 0,
      )
      .map((ingredient) => ({
        ...ingredient,
        total_amount: ingredient.remaining_to_buy ?? ingredient.total_amount,
      }));
    const searchContext = this.buildRetailerSearchContext(
      input.retailer,
      actor.preferredZipCode,
      actor.preferredKrogerLocationId,
    );
    const matchedItems =
      input.retailer === 'instacart'
        ? ingredientsToBuy.map((ingredient) => ({
            ...mapMissingIngredientMatch(ingredient),
            notes:
              'Instacart will resolve this item on the generated shopping list page.',
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
        overview: reviewedComputation,
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

    const matchedItems = (
      input.matched_items as MatchedIngredientProduct[]
    ).map((item) => ({
      ...item,
      kind: item.kind ?? 'ingredient_match',
    }));

    const estimatedSubtotal =
      this.matchingService.estimateSubtotal(matchedItems);

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

  async removeShoppingCart(id: string, actorUserId?: string) {
    const actor = await this.userContextService.resolveActorUser(actorUserId);
    const deleted = await this.cartPersistenceService.deleteShoppingCart(
      actor.id,
      id,
    );

    if (deleted.count === 0) {
      throw new NotFoundException(`Shopping cart ${id} not found`);
    }
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
      await this.userContextService.resolveActorUserShoppingContext(
        actorUserId,
      );
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

    const inventoryItems = await this.ingredientsService.listInventory(userId);
    const inventoryByIngredientId = new Map(
      inventoryItems.map((item) => [item.ingredient_id, item]),
    );
    const inventoryBySlug = new Map(
      inventoryItems.map((item) => [
        this.ingredientsService.normalizeSlug(item.ingredient.canonical_name),
        item,
      ]),
    );

    return overview.map((ingredient) => {
      const inventoryItem =
        (ingredient.ingredient_id
          ? inventoryByIngredientId.get(ingredient.ingredient_id)
          : undefined) ??
        inventoryBySlug.get(
          this.ingredientsService.normalizeSlug(
            ingredient.canonical_ingredient,
          ),
        );
      const inventoryAmount = inventoryItem?.estimated_amount;
      const inventoryUnit = inventoryItem?.unit?.trim() || undefined;
      const remaining =
        inventoryItem && inventoryAmount === undefined
          ? { remainingToBuy: 0, deductionPossible: false }
          : this.calculateRemainingToBuy(
              ingredient.total_amount,
              ingredient.unit,
              inventoryAmount,
              inventoryUnit,
            );

      return {
        ...ingredient,
        in_kitchen: Boolean(inventoryItem),
        inventory_amount: inventoryAmount,
        inventory_unit: inventoryUnit,
        remaining_to_buy: remaining.remainingToBuy,
        deduction_possible: remaining.deductionPossible,
      };
    });
  }

  private applyIngredientReview(
    overview: AggregatedIngredient[],
    reviewItems: IngredientReview['items'],
  ): AggregatedIngredient[] {
    const reviewByIngredient = new Map(
      reviewItems.flatMap((item) =>
        this.buildIngredientReviewKeys(item).map((key) => [key, item] as const),
      ),
    );

    return overview.map((ingredient) => {
      const review = reviewByIngredient.get(
        this.findIngredientReviewKey(reviewByIngredient, ingredient),
      );
      if (!review) {
        return {
          ...ingredient,
          review_action: 'buy',
        };
      }

      if (review.action === 'already_have') {
        return {
          ...ingredient,
          in_kitchen: true,
          review_action: review.action,
          remaining_to_buy: 0,
        };
      }

      if (review.action === 'adjust') {
        const reviewedAmount =
          review.adjusted_amount ?? ingredient.total_amount;
        const reviewedUnit = review.adjusted_unit?.trim() || ingredient.unit;

        return {
          ...ingredient,
          total_amount: reviewedAmount,
          unit: reviewedUnit,
          review_action: review.action,
          reviewed_amount: reviewedAmount,
          reviewed_unit: reviewedUnit,
          remaining_to_buy:
            ingredient.deduction_possible &&
            ingredient.inventory_amount !== undefined
              ? this.calculateRemainingToBuy(
                  reviewedAmount,
                  reviewedUnit,
                  ingredient.inventory_amount,
                  ingredient.inventory_unit,
                ).remainingToBuy
              : reviewedAmount,
        };
      }

      return {
        ...ingredient,
        review_action: review.action,
      };
    });
  }

  private buildIngredientReviewKey(
    item:
      | Pick<
          AggregatedIngredient,
          'ingredient_id' | 'canonical_ingredient' | 'unit'
        >
      | Pick<
          UpdateIngredientReviewItemRequest,
          'ingredient_id' | 'canonical_ingredient' | 'unit'
        >,
  ): string {
    return `${item.canonical_ingredient.trim().toLowerCase()}::${item.unit
      .trim()
      .toLowerCase()}`;
  }

  private buildIngredientReviewKeys(
    item:
      | Pick<
          AggregatedIngredient,
          'ingredient_id' | 'canonical_ingredient' | 'unit'
        >
      | Pick<
          UpdateIngredientReviewItemRequest,
          'ingredient_id' | 'canonical_ingredient' | 'unit'
        >,
  ): string[] {
    const unit = item.unit.trim().toLowerCase();
    const keys = item.ingredient_id
      ? [`ingredient:${item.ingredient_id}::${unit}`]
      : [];

    keys.push(this.buildIngredientReviewKey(item));

    return keys;
  }

  private findIngredientReviewKey<T>(
    reviewByIngredient: Map<string, T>,
    item:
      | Pick<
          AggregatedIngredient,
          'ingredient_id' | 'canonical_ingredient' | 'unit'
        >
      | Pick<
          UpdateIngredientReviewItemRequest,
          'ingredient_id' | 'canonical_ingredient' | 'unit'
        >,
  ): string {
    return (
      this.buildIngredientReviewKeys(item).find((key) =>
        reviewByIngredient.has(key),
      ) ?? this.buildIngredientReviewKeys(item)[0]
    );
  }

  private calculateRemainingToBuy(
    neededAmount: number,
    neededUnit: string,
    inventoryAmount?: number,
    inventoryUnit?: string,
  ): { remainingToBuy: number; deductionPossible: boolean } {
    if (inventoryAmount === undefined) {
      return { remainingToBuy: neededAmount, deductionPossible: false };
    }

    const convertedInventoryAmount = this.convertAmount(
      inventoryAmount,
      inventoryUnit,
      neededUnit,
    );

    if (convertedInventoryAmount === undefined) {
      return { remainingToBuy: neededAmount, deductionPossible: false };
    }

    return {
      remainingToBuy: Math.max(neededAmount - convertedInventoryAmount, 0),
      deductionPossible: true,
    };
  }

  private convertAmount(
    amount: number,
    fromUnit?: string,
    toUnit?: string,
  ): number | undefined {
    const from = this.normalizeUnit(fromUnit);
    const to = this.normalizeUnit(toUnit);

    if (from === to) {
      return amount;
    }

    const volumeToMl: Record<string, number> = {
      ml: 1,
      l: 1000,
      tsp: 4.92892,
      tbsp: 14.7868,
      cup: 236.588,
    };
    const weightToG: Record<string, number> = {
      g: 1,
      kg: 1000,
      oz: 28.3495,
      lb: 453.592,
    };

    if (volumeToMl[from] && volumeToMl[to]) {
      return (amount * volumeToMl[from]) / volumeToMl[to];
    }

    if (weightToG[from] && weightToG[to]) {
      return (amount * weightToG[from]) / weightToG[to];
    }

    return undefined;
  }

  private normalizeUnit(unit?: string): string {
    const normalized = unit?.trim().toLowerCase() || 'unit';
    const aliases: Record<string, string> = {
      liter: 'l',
      liters: 'l',
      litre: 'l',
      litres: 'l',
      milliliter: 'ml',
      milliliters: 'ml',
      teaspoon: 'tsp',
      teaspoons: 'tsp',
      tablespoon: 'tbsp',
      tablespoons: 'tbsp',
      cups: 'cup',
      gram: 'g',
      grams: 'g',
      kilogram: 'kg',
      kilograms: 'kg',
      ounce: 'oz',
      ounces: 'oz',
      pound: 'lb',
      pounds: 'lb',
      units: 'unit',
    };

    return aliases[normalized] ?? normalized;
  }

  private buildRetailerSearchContext(
    retailer: Retailer,
    preferredZipCode: string | null,
    preferredKrogerLocationId: string | null,
  ) {
    if (retailer === 'kroger') {
      const normalizedZipCode = preferredZipCode?.trim();
      if (!normalizedZipCode) {
        throw new BadRequestException(
          'Set your shopping location first before using Kroger search.',
        );
      }

      const krogerReadiness =
        this.matchingService.getProviderReadiness('kroger');

      if (!krogerReadiness.isAvailable) {
        throw new ServiceUnavailableException(
          krogerReadiness.status === 'missing_credentials'
            ? 'Kroger search is unavailable because provider credentials are missing.'
            : 'Kroger search is not configured right now.',
        );
      }

      const normalizedLocationId = preferredKrogerLocationId?.trim();

      return {
        zipCode: normalizedZipCode,
        locationId: normalizedLocationId || undefined,
      };
    }

    if (retailer === 'instacart') {
      const instacartReadiness =
        this.cartExportService.getProviderReadiness('instacart');

      if (!instacartReadiness.isAvailable) {
        throw new ServiceUnavailableException(
          instacartReadiness.status === 'missing_credentials'
            ? 'Instacart handoff is unavailable because provider credentials are missing.'
            : 'Instacart handoff is not configured right now.',
        );
      }

      return {
        zipCode: preferredZipCode?.trim() || undefined,
      };
    }

    return {};
  }
}
