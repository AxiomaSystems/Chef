import { Injectable } from '@nestjs/common';
import type { Cuisine } from '@cart/shared';
import { PrismaService } from '../prisma/prisma.service';
import { mapCuisine } from './cuisines.mapper';

@Injectable()
export class CuisinesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Cuisine[]> {
    const cuisines = await this.prisma.cuisine.findMany({
      orderBy: [{ kind: 'asc' }, { label: 'asc' }],
    });
    const hasAmericanCuisine = cuisines.some(
      (cuisine) =>
        cuisine.slug === 'american' ||
        cuisine.label.trim().toLowerCase() === 'american',
    );
    const visibleCuisines = cuisines
      .flatMap((cuisine) => {
        const isLaunchFlowFixture =
          cuisine.slug === 'launch-flow-test' ||
          cuisine.label.trim().toLowerCase() === 'launch flow test';

        if (!isLaunchFlowFixture) return [cuisine];
        if (hasAmericanCuisine) return [];

        return [
          {
            ...cuisine,
            slug: 'american',
            label: 'American',
            kind: 'national' as const,
          },
        ];
      })
      .sort((left, right) => {
        if (left.kind === right.kind) {
          return left.label.localeCompare(right.label);
        }

        return left.kind.localeCompare(right.kind);
      });

    return visibleCuisines.map(mapCuisine);
  }
}
