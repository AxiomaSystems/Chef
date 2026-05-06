import { Injectable } from '@nestjs/common';
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
      kroger: {
        status: this.getProviderStatus(
          process.env.KROGER_USE_REAL_PROVIDER !== 'false',
          ['KROGER_CLIENT_ID', 'KROGER_CLIENT_SECRET'],
        ),
      },
      instacart: {
        status: this.getProviderStatus(
          process.env.INSTACART_USE_REAL_PROVIDER === 'true',
          ['INSTACART_API_KEY'],
        ),
      },
      walmart: {
        status: this.getProviderStatus(
          process.env.WALMART_USE_REAL_PROVIDER === 'true',
          ['WALMART_CLIENT_ID', 'WALMART_CLIENT_SECRET'],
        ),
      },
    } as const;
  }

  private getProviderStatus(enabled: boolean, requiredKeys: string[]) {
    if (!enabled) {
      return 'disabled';
    }

    const hasAllCredentials = requiredKeys.every((key) => {
      const value = process.env[key];
      return value !== undefined && value.trim() !== '';
    });

    return hasAllCredentials ? 'configured' : 'missing_credentials';
  }
}
