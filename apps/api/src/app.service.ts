import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { getProviderReadiness } from './providers/provider-readiness';

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
      kroger: {
        status: getProviderReadiness('kroger').status,
      },
      instacart: {
        status: getProviderReadiness('instacart').status,
      },
      walmart: {
        status: getProviderReadiness('walmart').status,
      },
    } as const;
  }
}
