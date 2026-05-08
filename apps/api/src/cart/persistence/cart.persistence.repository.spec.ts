import { CartPersistenceRepository } from './cart.persistence.repository';

describe('CartPersistenceRepository', () => {
  let prisma: {
    cartDraft: {
      updateMany: jest.Mock;
      deleteMany: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
    };
    cart: {
      updateMany: jest.Mock;
      deleteMany: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
    };
    ingredientReview: {
      findFirst: jest.Mock;
    };
    shoppingCart: {
      updateMany: jest.Mock;
      deleteMany: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
    };
  };
  let repository: CartPersistenceRepository;

  beforeEach(() => {
    prisma = {
      cartDraft: {
        updateMany: jest.fn(),
        deleteMany: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      cart: {
        updateMany: jest.fn(),
        deleteMany: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      ingredientReview: {
        findFirst: jest.fn(),
      },
      shoppingCart: {
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
});
