import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type {
  CheckoutProfile,
  PaymentCard,
  SavedAddress,
  UserPreferences,
  UserStats,
} from '@cart/shared';
import { PasswordHasherService } from '../auth/password-hasher.service';
import { mapCuisine } from '../cuisines/cuisines.mapper';
import { PrismaService } from '../prisma/prisma.service';
import { mapTag } from '../tags/tags.mapper';
import { ChangePasswordDto } from './dto/change-password.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { UpdateCheckoutProfileDto } from './dto/update-checkout-profile.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { UpdateMePreferencesDto } from './dto/update-me-preferences.dto';

@Injectable()
export class MeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordHasherService: PasswordHasherService,
  ) {}

  private async findUserOrThrow(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { authIdentities: true },
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    return user;
  }

  private assertNoDuplicates(values: string[], fieldName: string) {
    if (new Set(values).size !== values.length) {
      throw new BadRequestException(`${fieldName} contains duplicate ids`);
    }
  }

  private mapPreferences(input: {
    user: {
      preferredZipCode: string | null;
      preferredLocationLabel: string | null;
      preferredLatitude: number | null;
      preferredLongitude: number | null;
      preferredKrogerLocationId: string | null;
    };
    preferredCuisines: Array<{
      cuisine: Parameters<typeof mapCuisine>[0];
    }>;
    preferredTags: Array<{
      tag: Parameters<typeof mapTag>[0];
    }>;
  }): UserPreferences {
    const preferredCuisines = input.preferredCuisines
      .map((entry) => mapCuisine(entry.cuisine))
      .sort((left, right) => left.label.localeCompare(right.label));
    const preferredTags = input.preferredTags
      .map((entry) => mapTag(entry.tag))
      .sort((left, right) => left.name.localeCompare(right.name));

    return {
      preferred_cuisine_ids: preferredCuisines.map((cuisine) => cuisine.id),
      preferred_cuisines: preferredCuisines,
      preferred_tag_ids: preferredTags.map((tag) => tag.id),
      preferred_tags: preferredTags,
      shopping_location:
        input.user.preferredZipCode ||
        input.user.preferredLocationLabel ||
        input.user.preferredLatitude !== null ||
        input.user.preferredLongitude !== null ||
        input.user.preferredKrogerLocationId
          ? {
              zip_code: input.user.preferredZipCode ?? undefined,
              label: input.user.preferredLocationLabel ?? undefined,
              latitude: input.user.preferredLatitude ?? undefined,
              longitude: input.user.preferredLongitude ?? undefined,
              kroger_location_id:
                input.user.preferredKrogerLocationId ?? undefined,
            }
          : undefined,
    };
  }

  private mapProfile(user: Awaited<ReturnType<MeService['findUserOrThrow']>>) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      auth_providers: user.authIdentities.map((identity) => identity.provider),
      onboarding_completed_at:
        user.onboardingCompletedAt?.toISOString() ?? undefined,
      created_at: user.createdAt.toISOString(),
      updated_at: user.updatedAt.toISOString(),
    };
  }

  private normalizeSavedAddresses(addresses: SavedAddress[]): SavedAddress[] {
    return addresses.map((address) => ({
      id: String(address.id).trim(),
      label: String(address.label).trim(),
      street: String(address.street).trim(),
      city: String(address.city).trim(),
      state: String(address.state ?? '').trim().toUpperCase().slice(0, 2),
      zip: String(address.zip).trim(),
      isDefault: Boolean(address.isDefault),
    }));
  }

  private normalizePaymentCards(cards: PaymentCard[]): PaymentCard[] {
    return cards.map((card) => ({
      id: String(card.id).trim(),
      cardType: card.cardType,
      lastFour: String(card.lastFour).replace(/\D/g, '').slice(-4),
      expiry: String(card.expiry).trim(),
      name: String(card.name).trim(),
      isDefault: Boolean(card.isDefault),
    }));
  }

  private assertSingleDefault<T extends { isDefault: boolean }>(
    items: T[],
    label: string,
  ) {
    const defaults = items.filter((item) => item.isDefault).length;
    if (defaults > 1) {
      throw new BadRequestException(`${label} can only have one default entry`);
    }
  }

  private assertUniqueIds(items: Array<{ id: string }>, label: string) {
    if (new Set(items.map((item) => item.id)).size !== items.length) {
      throw new BadRequestException(`${label} contains duplicate ids`);
    }
  }

  private mapCheckoutProfile(row: {
    savedAddressesJson: string | null;
    paymentCardsJson: string | null;
  }): CheckoutProfile {
    const savedAddresses = row.savedAddressesJson
      ? this.normalizeSavedAddresses(
          JSON.parse(row.savedAddressesJson) as SavedAddress[],
        )
      : [];
    const paymentCards = row.paymentCardsJson
      ? this.normalizePaymentCards(
          JSON.parse(row.paymentCardsJson) as PaymentCard[],
        )
      : [];

    return {
      saved_addresses: savedAddresses,
      payment_cards: paymentCards,
    };
  }

  async getProfile(userId: string) {
    const user = await this.findUserOrThrow(userId);
    return this.mapProfile(user);
  }

  async getStats(userId: string): Promise<UserStats> {
    await this.findUserOrThrow(userId);

    const [
      owned_recipe_count,
      cart_draft_count,
      cart_count,
      shopping_cart_count,
      preferred_cuisine_count,
      preferred_tag_count,
    ] = await Promise.all([
      this.prisma.baseRecipe.count({
        where: {
          ownerUserId: userId,
          isSystemRecipe: false,
        },
      }),
      this.prisma.cartDraft.count({
        where: { userId },
      }),
      this.prisma.cart.count({
        where: { userId },
      }),
      this.prisma.shoppingCart.count({
        where: { userId },
      }),
      this.prisma.userPreferredCuisine.count({
        where: { userId },
      }),
      this.prisma.userPreferredTag.count({
        where: { userId },
      }),
    ]);

    return {
      owned_recipe_count,
      cart_draft_count,
      cart_count,
      shopping_cart_count,
      preferred_cuisine_count,
      preferred_tag_count,
    };
  }

  async changePassword(userId: string, input: ChangePasswordDto) {
    const user = await this.findUserOrThrow(userId);
    const passwordIdentity = user.authIdentities.find(
      (identity) => identity.provider === 'password',
    );

    if (!passwordIdentity?.passwordHash) {
      throw new ForbiddenException(
        'This account does not have a password identity yet',
      );
    }

    const currentPasswordMatches = await this.passwordHasherService.verify(
      input.current_password,
      passwordIdentity.passwordHash,
    );

    if (!currentPasswordMatches) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const newPasswordMatchesCurrent = await this.passwordHasherService.verify(
      input.new_password,
      passwordIdentity.passwordHash,
    );

    if (newPasswordMatchesCurrent) {
      throw new BadRequestException(
        'New password must be different from the current password',
      );
    }

    const nextPasswordHash = await this.passwordHasherService.hash(
      input.new_password,
    );

    await this.prisma.authIdentity.update({
      where: { id: passwordIdentity.id },
      data: {
        passwordHash: nextPasswordHash,
      },
    });

    return { success: true };
  }

  async setPassword(userId: string, input: SetPasswordDto) {
    const user = await this.findUserOrThrow(userId);
    const passwordIdentity = user.authIdentities.find(
      (identity) => identity.provider === 'password',
    );

    if (passwordIdentity) {
      throw new ForbiddenException(
        'This account already has a password identity',
      );
    }

    const passwordHash = await this.passwordHasherService.hash(
      input.new_password,
    );

    await this.prisma.authIdentity.create({
      data: {
        userId: user.id,
        provider: 'password',
        providerSubject: user.email.toLowerCase(),
        email: user.email.toLowerCase(),
        emailVerified: true,
        passwordHash,
      },
    });

    return { success: true };
  }

  async updateProfile(userId: string, input: UpdateMeDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(input.name ? { name: input.name } : {}),
      },
      include: { authIdentities: true },
    });

    return this.mapProfile(user);
  }

  async completeOnboarding(userId: string) {
    const existingUser = await this.findUserOrThrow(userId);

    if (existingUser.onboardingCompletedAt) {
      return this.mapProfile(existingUser);
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        onboardingCompletedAt: new Date(),
      },
      include: { authIdentities: true },
    });

    return this.mapProfile(user);
  }

  async getPreferences(userId: string): Promise<UserPreferences> {
    await this.findUserOrThrow(userId);

    const [user, preferredCuisines, preferredTags] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: {
          preferredZipCode: true,
          preferredLocationLabel: true,
          preferredLatitude: true,
          preferredLongitude: true,
          preferredKrogerLocationId: true,
        },
      }),
      this.prisma.userPreferredCuisine.findMany({
        where: { userId },
        include: { cuisine: true },
      }),
      this.prisma.userPreferredTag.findMany({
        where: { userId },
        include: { tag: true },
      }),
    ]);

    return this.mapPreferences({ user, preferredCuisines, preferredTags });
  }

  async getCheckoutProfile(userId: string): Promise<CheckoutProfile> {
    await this.findUserOrThrow(userId);

    const rows = await this.prisma.$queryRawUnsafe<
      Array<{ savedAddressesJson: string | null; paymentCardsJson: string | null }>
    >(
      `
        SELECT
          "savedAddresses"::text AS "savedAddressesJson",
          "paymentCards"::text AS "paymentCardsJson"
        FROM "User"
        WHERE "id" = $1
        LIMIT 1
      `,
      userId,
    );

    return this.mapCheckoutProfile(
      rows[0] ?? { savedAddressesJson: null, paymentCardsJson: null },
    );
  }

  async updatePreferences(
    userId: string,
    input: UpdateMePreferencesDto,
  ): Promise<UserPreferences> {
    await this.findUserOrThrow(userId);
    this.assertNoDuplicates(
      input.preferred_cuisine_ids,
      'preferred_cuisine_ids',
    );
    this.assertNoDuplicates(input.preferred_tag_ids, 'preferred_tag_ids');

    const [cuisines, tags] = await Promise.all([
      this.prisma.cuisine.findMany({
        where: { id: { in: input.preferred_cuisine_ids } },
      }),
      this.prisma.tag.findMany({
        where: { id: { in: input.preferred_tag_ids } },
      }),
    ]);

    if (cuisines.length !== input.preferred_cuisine_ids.length) {
      throw new BadRequestException(
        'One or more preferred_cuisine_ids are invalid',
      );
    }

    if (tags.length !== input.preferred_tag_ids.length) {
      throw new BadRequestException('One or more preferred_tag_ids are invalid');
    }

    const nonSystemTag = tags.find((tag) => tag.scope !== 'system');

    if (nonSystemTag) {
      throw new ForbiddenException(
        'Preferences currently support only shared system tags',
      );
    }

    const shoppingLocation = input.shopping_location;
    const normalizedZipCode = shoppingLocation?.zip_code?.trim() || null;
    const normalizedLabel = shoppingLocation?.label?.trim() || null;
    const normalizedLatitude = shoppingLocation?.latitude ?? null;
    const normalizedLongitude = shoppingLocation?.longitude ?? null;
    const normalizedKrogerLocationId =
      shoppingLocation?.kroger_location_id?.trim() || null;

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          preferredZipCode: normalizedZipCode,
          preferredLocationLabel: normalizedLabel,
          preferredLatitude: normalizedLatitude,
          preferredLongitude: normalizedLongitude,
          preferredKrogerLocationId: normalizedKrogerLocationId,
        },
      }),
      this.prisma.userPreferredCuisine.deleteMany({
        where: { userId },
      }),
      this.prisma.userPreferredTag.deleteMany({
        where: { userId },
      }),
      ...(input.preferred_cuisine_ids.length > 0
        ? [
            this.prisma.userPreferredCuisine.createMany({
              data: input.preferred_cuisine_ids.map((cuisineId) => ({
                userId,
                cuisineId,
              })),
            }),
          ]
        : []),
      ...(input.preferred_tag_ids.length > 0
        ? [
            this.prisma.userPreferredTag.createMany({
              data: input.preferred_tag_ids.map((tagId) => ({
                userId,
                tagId,
              })),
            }),
          ]
        : []),
    ]);

    return this.getPreferences(userId);
  }

  async updateCheckoutProfile(
    userId: string,
    input: UpdateCheckoutProfileDto,
  ): Promise<CheckoutProfile> {
    await this.findUserOrThrow(userId);

    const savedAddresses = this.normalizeSavedAddresses(input.saved_addresses);
    const paymentCards = this.normalizePaymentCards(input.payment_cards);

    this.assertUniqueIds(savedAddresses, 'saved_addresses');
    this.assertUniqueIds(paymentCards, 'payment_cards');
    this.assertSingleDefault(savedAddresses, 'saved_addresses');
    this.assertSingleDefault(paymentCards, 'payment_cards');

    await this.prisma.$executeRawUnsafe(
      `
        UPDATE "User"
        SET
          "savedAddresses" = $2::jsonb,
          "paymentCards" = $3::jsonb,
          "updatedAt" = NOW()
        WHERE "id" = $1
      `,
      userId,
      JSON.stringify(savedAddresses),
      JSON.stringify(paymentCards),
    );

    return this.getCheckoutProfile(userId);
  }
}
