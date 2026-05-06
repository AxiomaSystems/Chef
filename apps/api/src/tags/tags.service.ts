import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Tag } from '@cart/shared';
import { PrismaService } from '../prisma/prisma.service';
import { mapTag } from './tags.mapper';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeName(name: string): string {
    return name.trim().replace(/\s+/g, ' ');
  }

  private normalizeSlug(name: string): string {
    return this.normalizeName(name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async listVisible(actorUserId?: string): Promise<Tag[]> {
    const tags = await this.prisma.tag.findMany({
      where: actorUserId
        ? {
            OR: [
              { scope: 'system' },
              { scope: 'user', ownerUserId: actorUserId },
            ],
          }
        : {
            scope: 'system',
          },
      orderBy: [{ scope: 'asc' }, { kind: 'asc' }, { name: 'asc' }],
    });

    return tags.map(mapTag);
  }

  async create(input: CreateTagDto, actorUserId: string): Promise<Tag> {
    const name = this.normalizeName(input.name);
    const slug = this.normalizeSlug(name);

    await this.assertSlugAvailableForOwner(actorUserId, slug);

    const tag = await this.prisma.tag.create({
      data: {
        ownerUserId: actorUserId,
        name,
        slug,
        scope: 'user',
        kind: input.kind ?? 'general',
      },
    });

    return mapTag(tag);
  }

  async update(id: string, input: UpdateTagDto, actorUserId: string): Promise<Tag> {
    const existingTag = await this.prisma.tag.findUnique({
      where: { id },
    });

    if (!existingTag) {
      throw new NotFoundException(`Tag ${id} not found`);
    }

    if (existingTag.scope !== 'user' || existingTag.ownerUserId !== actorUserId) {
      throw new ForbiddenException('Only your own user tags can be edited');
    }

    const name = this.normalizeName(input.name);
    const slug = this.normalizeSlug(name);

    await this.assertSlugAvailableForOwner(actorUserId, slug, id);

    const tag = await this.prisma.tag.update({
      where: { id },
      data: {
        name,
        slug,
      },
    });

    return mapTag(tag);
  }

  async remove(id: string, actorUserId: string): Promise<void> {
    const existingTag = await this.prisma.tag.findUnique({
      where: { id },
    });

    if (!existingTag) {
      throw new NotFoundException(`Tag ${id} not found`);
    }

    if (existingTag.scope !== 'user' || existingTag.ownerUserId !== actorUserId) {
      throw new ForbiddenException('Only your own user tags can be deleted');
    }

    await this.prisma.tag.delete({
      where: { id },
    });
  }

  private async assertSlugAvailableForOwner(
    actorUserId: string,
    slug: string,
    ignoredTagId?: string,
  ): Promise<void> {
    const [systemTag, userTag] = await Promise.all([
      this.prisma.tag.findFirst({
        where: {
          scope: 'system',
          slug,
        },
      }),
      this.prisma.tag.findFirst({
        where: {
          scope: 'user',
          ownerUserId: actorUserId,
          slug,
          ...(ignoredTagId ? { id: { not: ignoredTagId } } : {}),
        },
      }),
    ]);

    if (systemTag) {
      throw new ConflictException('Tag already exists as a system tag');
    }

    if (userTag) {
      throw new ConflictException('You already have a tag with this name');
    }
  }
}
