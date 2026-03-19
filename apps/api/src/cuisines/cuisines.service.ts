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

    return cuisines.map(mapCuisine);
  }
}
