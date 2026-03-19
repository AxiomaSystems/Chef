import { Injectable } from '@nestjs/common';
import {
  mapGeneratedCartHistorySummary,
  mapPersistedCartDraft,
  mapPersistedGeneratedCart,
} from './persistence/cart.persistence.mapper';
import { CartPersistenceRepository } from './persistence/cart.persistence.repository';
import type {
  CreateCartDraftPersistenceInput,
  CreateGeneratedCartPersistenceInput,
  GeneratedCartHistorySummary,
  PersistedCartDraft,
  PersistedGeneratedCart,
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

  async createGeneratedCart(
    input: CreateGeneratedCartPersistenceInput,
  ): Promise<PersistedGeneratedCart> {
    const created = await this.cartPersistenceRepository.createGeneratedCart(input);
    return mapPersistedGeneratedCart(created);
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

  async findGeneratedCartsByUser(
    userId: string,
  ): Promise<PersistedGeneratedCart[]> {
    const carts = await this.cartPersistenceRepository.findGeneratedCartsByUser(
      userId,
    );
    return carts.map(mapPersistedGeneratedCart);
  }

  async findGeneratedCartHistoryByUser(
    userId: string,
  ): Promise<GeneratedCartHistorySummary[]> {
    const carts = await this.cartPersistenceRepository.findGeneratedCartsByUser(
      userId,
    );
    return carts.map(mapGeneratedCartHistorySummary);
  }

  async findGeneratedCartById(
    userId: string,
    id: string,
  ): Promise<PersistedGeneratedCart | null> {
    const created = await this.cartPersistenceRepository.findGeneratedCartById(
      userId,
      id,
    );
    return created ? mapPersistedGeneratedCart(created) : null;
  }
}
