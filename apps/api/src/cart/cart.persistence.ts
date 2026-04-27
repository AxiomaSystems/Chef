import { Injectable } from '@nestjs/common';
import {
  mapPersistedCart,
  mapPersistedCartDraft,
  mapPersistedShoppingCart,
  mapShoppingCartHistorySummary,
} from './persistence/cart.persistence.mapper';
import { CartPersistenceRepository } from './persistence/cart.persistence.repository';
import type {
  CreateCartPersistenceInput,
  CreateCartDraftPersistenceInput,
  CreateShoppingCartPersistenceInput,
  PersistedCart,
  PersistedCartDraft,
  PersistedShoppingCart,
  PersistedShoppingCartHistorySummary,
  UpdateCartDraftPersistenceInput,
  UpdateCartPersistenceInput,
  UpdateShoppingCartPersistenceInput,
} from './persistence/cart.persistence.types';

@Injectable()
export class CartPersistenceService {
  constructor(
    private readonly cartPersistenceRepository: CartPersistenceRepository,
  ) {}

  async createDraft(
    input: CreateCartDraftPersistenceInput,
  ): Promise<PersistedCartDraft> {
    const draft = await this.cartPersistenceRepository.createDraft(input);
    return mapPersistedCartDraft(draft);
  }

  updateDraft(userId: string, id: string, input: UpdateCartDraftPersistenceInput) {
    return this.cartPersistenceRepository.updateDraft(userId, id, input);
  }

  deleteDraft(userId: string, id: string) {
    return this.cartPersistenceRepository.deleteDraft(userId, id);
  }

  async createCart(input: CreateCartPersistenceInput): Promise<PersistedCart> {
    const cart = await this.cartPersistenceRepository.createCart(input);
    return mapPersistedCart(cart);
  }

  updateCart(userId: string, id: string, input: UpdateCartPersistenceInput) {
    return this.cartPersistenceRepository.updateCart(userId, id, input);
  }

  deleteCart(userId: string, id: string) {
    return this.cartPersistenceRepository.deleteCart(userId, id);
  }

  async createShoppingCart(
    input: CreateShoppingCartPersistenceInput,
  ): Promise<PersistedShoppingCart> {
    const shoppingCart = await this.cartPersistenceRepository.createShoppingCart(
      input,
    );
    return mapPersistedShoppingCart(shoppingCart);
  }

  updateShoppingCart(
    userId: string,
    id: string,
    input: UpdateShoppingCartPersistenceInput,
  ) {
    return this.cartPersistenceRepository.updateShoppingCart(userId, id, input);
  }

  deleteShoppingCart(userId: string, id: string) {
    return this.cartPersistenceRepository.deleteShoppingCart(userId, id);
  }

  async findDraftsByUser(userId: string): Promise<PersistedCartDraft[]> {
    const drafts = await this.cartPersistenceRepository.findDraftsByUser(userId);
    return drafts.map(mapPersistedCartDraft);
  }

  async findDraftById(
    userId: string,
    id: string,
  ): Promise<PersistedCartDraft | null> {
    const draft = await this.cartPersistenceRepository.findDraftById(userId, id);
    return draft ? mapPersistedCartDraft(draft) : null;
  }

  async findCartsByUser(userId: string): Promise<PersistedCart[]> {
    const carts = await this.cartPersistenceRepository.findCartsByUser(userId);
    return carts.map(mapPersistedCart);
  }

  async findCartById(userId: string, id: string): Promise<PersistedCart | null> {
    const cart = await this.cartPersistenceRepository.findCartById(userId, id);
    return cart ? mapPersistedCart(cart) : null;
  }

  async findShoppingCartsByUser(
    userId: string,
  ): Promise<PersistedShoppingCart[]> {
    const carts = await this.cartPersistenceRepository.findShoppingCartsByUser(
      userId,
    );
    return carts.map(mapPersistedShoppingCart);
  }

  async findShoppingCartHistoryByUser(
    userId: string,
  ): Promise<PersistedShoppingCartHistorySummary[]> {
    const carts = await this.cartPersistenceRepository.findShoppingCartsByUser(
      userId,
    );
    return carts.map(mapShoppingCartHistorySummary);
  }

  async findShoppingCartById(
    userId: string,
    id: string,
  ): Promise<PersistedShoppingCart | null> {
    const created = await this.cartPersistenceRepository.findShoppingCartById(
      userId,
      id,
    );
    return created ? mapPersistedShoppingCart(created) : null;
  }
}
