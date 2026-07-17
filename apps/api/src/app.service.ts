import { Injectable } from '@nestjs/common';
import type { Retailer } from '@cart/shared';
import {
  getExpectedMigrationVersion,
  isMigrationVersionName,
} from './database-schema-readiness';
import { getApiFeatureReadiness } from './environment-readiness';
import { getProviderReadiness } from './providers/provider-readiness';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getHello(): string {
    return 'Preppie API';
  }

  getHealth() {
    return {
      status: 'ok',
      service: 'api',
    } as const;
  }

  async getReadiness() {
    const providerStatuses = this.getProviderStatuses();
    const features = getApiFeatureReadiness(process.env);
    let expectedMigration: string | null = null;

    try {
      expectedMigration = getExpectedMigrationVersion();
    } catch {
      // Schema readiness fails closed below without exposing filesystem details.
    }

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      return this.readinessResponse({
        status: 'not_ready',
        databaseStatus: 'not_ready',
        schemaStatus: 'unavailable',
        expectedMigration,
        appliedMigration: null,
        providerStatuses,
        features,
      });
    }

    if (!expectedMigration) {
      return this.readinessResponse({
        status: 'not_ready',
        databaseStatus: 'ready',
        schemaStatus: 'unavailable',
        expectedMigration: null,
        appliedMigration: null,
        providerStatuses,
        features,
      });
    }

    let appliedMigration: string | null;

    try {
      const migrations = await this.prisma.$queryRaw<
        Array<{ migration_name: unknown }>
      >`
        SELECT migration_name
        FROM "_prisma_migrations"
        WHERE finished_at IS NOT NULL
          AND rolled_back_at IS NULL
        ORDER BY finished_at DESC, id DESC
        LIMIT 1
      `;
      appliedMigration = isMigrationVersionName(migrations[0]?.migration_name)
        ? migrations[0].migration_name
        : null;
    } catch {
      return this.readinessResponse({
        status: 'not_ready',
        databaseStatus: 'ready',
        schemaStatus: 'unavailable',
        expectedMigration,
        appliedMigration: null,
        providerStatuses,
        features,
      });
    }

    const schemaStatus =
      appliedMigration === expectedMigration ? 'ready' : 'mismatch';

    return this.readinessResponse({
      status: schemaStatus === 'ready' ? 'ready' : 'not_ready',
      databaseStatus: 'ready',
      schemaStatus,
      expectedMigration,
      appliedMigration,
      providerStatuses,
      features,
    });
  }

  private readinessResponse(input: {
    status: 'ready' | 'not_ready';
    databaseStatus: 'ready' | 'not_ready';
    schemaStatus: 'ready' | 'mismatch' | 'unavailable';
    expectedMigration: string | null;
    appliedMigration: string | null;
    providerStatuses: ReturnType<AppService['getProviderStatuses']>;
    features: ReturnType<typeof getApiFeatureReadiness>;
  }) {
    return {
      status: input.status,
      service: 'api',
      database: {
        status: input.databaseStatus,
        schema: {
          status: input.schemaStatus,
          expected: input.expectedMigration,
          applied: input.appliedMigration,
        },
      },
      providers: input.providerStatuses,
      features: input.features,
    } as const;
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
      mode: readiness.mode,
    };
  }
}
