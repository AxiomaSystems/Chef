import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { UserPreferences } from '@cart/shared';
import { mapCuisine } from '../cuisines/cuisines.mapper';
import { PrismaService } from '../prisma/prisma.service';
import { mapTag } from '../tags/tags.mapper';
import { UpdateMeDto } from './dto/update-me.dto';
import { UpdateMePreferencesDto } from './dto/update-me-preferences.dto';

@Injectable()
export class MeService {
  constructor(private readonly prisma: PrismaService) {}

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

  async getProfile(userId: string) {
    const user = await this.findUserOrThrow(userId);
    return this.mapProfile(user);
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

    const [preferredCuisines, preferredTags] = await Promise.all([
      this.prisma.userPreferredCuisine.findMany({
        where: { userId },
        include: { cuisine: true },
      }),
      this.prisma.userPreferredTag.findMany({
        where: { userId },
        include: { tag: true },
      }),
    ]);

    return this.mapPreferences({ preferredCuisines, preferredTags });
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

    await this.prisma.$transaction([
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
}
