import { Injectable } from '@nestjs/common';
import type { Retailer } from '@cart/shared';
import { getProviderReadiness } from './providers/provider-readiness';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getHello(): string {
    return 'Hello World!';
  }

  getHealth() {
    return {
      status: 'ok',
      service: 'api',
    } as const;
  }

  async getReadiness() {
    const providerStatuses = this.getProviderStatuses();

    try {
      await this.prisma.$queryRawUnsafe('SELECT 1');

      return {
        status: 'ready',
        service: 'api',
        database: {
          status: 'ready',
        },
        providers: providerStatuses,
      } as const;
    } catch {
      return {
        status: 'not_ready',
        service: 'api',
        database: {
          status: 'not_ready',
        },
        providers: providerStatuses,
      } as const;
    }
  }

  private getProviderStatuses() {
    return {
      kroger: this.toReadinessStatus('kroger'),
      instacart: this.toReadinessStatus('instacart'),
      walmart: this.toReadinessStatus('walmart'),
    } as const;
  }

  private toReadinessStatus(retailer: Retailer) {
    const readiness = getProviderReadiness(retailer);

    return {
      status: readiness.status,
      is_available: readiness.isAvailable,
    };
  }
}
