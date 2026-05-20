import { CartPersistenceRepository } from './cart.persistence.repository';

describe('CartPersistenceRepository', () => {
  let prisma: {
    $transaction: jest.Mock;
    cartDraft: {
      updateMany: jest.Mock;
      deleteMany: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
    };
    cart: {
      create: jest.Mock;
      updateMany: jest.Mock;
      deleteMany: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
    };
    ingredientReview: {
      findFirst: jest.Mock;
    };
    shoppingCart: {
      create: jest.Mock;
      updateMany: jest.Mock;
      deleteMany: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
    };
  };
  let repository: CartPersistenceRepository;

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn((callback) => callback(prisma)),
      cartDraft: {
        updateMany: jest.fn(),
        deleteMany: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      cart: {
        create: jest.fn(),
        updateMany: jest.fn(),
        deleteMany: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      ingredientReview: {
        findFirst: jest.fn(),
      },
      shoppingCart: {
        create: jest.fn(),
        updateMany: jest.fn(),
        deleteMany: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
    };

    repository = new CartPersistenceRepository(prisma as never);
  });

  it('scopes cart draft mutations and reads to the owning user', () => {
    repository.updateDraft('user-1', 'draft-1', {
      name: 'Weeknight draft',
      retailer: 'walmart',
    });
    repository.deleteDraft('user-1', 'draft-1');
    repository.findDraftById('user-1', 'draft-1');

    expect(prisma.cartDraft.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'draft-1', userId: 'user-1' },
      }),
    );
    expect(prisma.cartDraft.deleteMany).toHaveBeenCalledWith({
      where: { id: 'draft-1', userId: 'user-1' },
    });
    expect(prisma.cartDraft.findFirst).toHaveBeenCalledWith({
      where: { id: 'draft-1', userId: 'user-1' },
    });
  });

  it('scopes persisted cart mutations and reads to the owning user', () => {
    repository.updateCart('user-1', 'cart-1', {
      name: 'Dinner cart',
      retailer: 'walmart',
    });
    repository.deleteCart('user-1', 'cart-1');
    repository.findCartById('user-1', 'cart-1');

    expect(prisma.cart.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'cart-1', userId: 'user-1' },
      }),
    );
    expect(prisma.cart.deleteMany).toHaveBeenCalledWith({
      where: { id: 'cart-1', userId: 'user-1' },
    });
    expect(prisma.cart.findFirst).toHaveBeenCalledWith({
      where: { id: 'cart-1', userId: 'user-1' },
    });
  });

  it('archives the previous active cart before creating a new active cart', async () => {
    prisma.cart.create.mockResolvedValue({ id: 'cart-2' });

    await repository.createCart({
      userId: 'user-1',
      name: 'New plan',
      retailer: 'walmart',
      selections: [],
      dishes: [],
    });

    expect(prisma.cart.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', status: 'active' },
      data: { status: 'archived' },
    });
    expect(prisma.cart.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        status: 'active',
      }),
    });
  });

  it('scopes ingredient review lookup through the parent cart owner', () => {
    repository.findIngredientReviewByCartId('user-1', 'cart-1');

    expect(prisma.ingredientReview.findFirst).toHaveBeenCalledWith({
      where: {
        cartId: 'cart-1',
        cart: {
          userId: 'user-1',
        },
      },
    });
  });

  it('scopes shopping cart mutations and reads to the owning user', () => {
    repository.updateShoppingCart('user-1', 'shopping-cart-1', {
      matched_items: [],
      estimated_subtotal: 0,
    });
    repository.deleteShoppingCart('user-1', 'shopping-cart-1');
    repository.findShoppingCartById('user-1', 'shopping-cart-1');

    expect(prisma.shoppingCart.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'shopping-cart-1', userId: 'user-1' },
      }),
    );
    expect(prisma.shoppingCart.deleteMany).toHaveBeenCalledWith({
      where: { id: 'shopping-cart-1', userId: 'user-1' },
    });
    expect(prisma.shoppingCart.findFirst).toHaveBeenCalledWith({
      where: { id: 'shopping-cart-1', userId: 'user-1' },
    });
  });

  it('archives the previous active shopping cart before creating a new active shopping cart', async () => {
    prisma.shoppingCart.create.mockResolvedValue({ id: 'shopping-cart-2' });

    await repository.createShoppingCart({
      userId: 'user-1',
      cartId: 'cart-1',
      shoppingCart: {
        cart_id: 'cart-1',
        name: 'Dinner plan',
        retailer: 'walmart',
        overview: [],
        matched_items: [],
        estimated_subtotal: 0,
      },
    });

    expect(prisma.shoppingCart.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', status: 'active' },
      data: { status: 'archived' },
    });
    expect(prisma.shoppingCart.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        cartId: 'cart-1',
        name: 'Dinner plan',
        status: 'active',
      }),
    });
  });

  it('lists only active shopping carts separately from full history', () => {
    repository.findShoppingCartsByUser('user-1');
    repository.findShoppingCartHistoryByUser('user-1');

    expect(prisma.shoppingCart.findMany).toHaveBeenNthCalledWith(1, {
      where: { userId: 'user-1', status: 'active' },
      orderBy: { createdAt: 'desc' },
    });
    expect(prisma.shoppingCart.findMany).toHaveBeenNthCalledWith(2, {
      where: { userId: 'user-1' },
      orderBy: { createdAt: 'desc' },
    });
  });
});
