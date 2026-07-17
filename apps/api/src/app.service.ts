import { Injectable } from '@nestjs/common';
import type { Retailer } from '@cart/shared';
import {
  type AppliedMigration,
  evaluateSchemaCompatibility,
  getKnownActiveProductionMigrationFingerprints,
  getPackagedMigrations,
  isMigrationVersionName,
  type SchemaCompatibilityStatus,
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
    const revision =
      process.env.RAILWAY_GIT_COMMIT_SHA ??
      process.env.GIT_COMMIT_SHA ??
      'unknown';
    let packagedMigrations: ReturnType<typeof getPackagedMigrations> = [];

    try {
      packagedMigrations = getPackagedMigrations();
    } catch {
      // Schema readiness fails closed below without exposing filesystem details.
    }
    const expectedMigration = packagedMigrations.at(-1)?.name ?? null;

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      return this.readinessResponse({
        status: 'not_ready',
        databaseStatus: 'not_ready',
        schemaStatus: 'unavailable',
        expectedMigration,
        appliedMigration: null,
        minimumCompatible: null,
        providerStatuses,
        features,
        revision,
      });
    }

    if (!expectedMigration) {
      return this.readinessResponse({
        status: 'not_ready',
        databaseStatus: 'not_ready',
        schemaStatus: 'unavailable',
        expectedMigration: null,
        appliedMigration: null,
        minimumCompatible: null,
        providerStatuses,
        features,
        revision,
      });
    }

    let appliedMigrations: AppliedMigration[];

    try {
      const migrations = await this.prisma.$queryRaw<
        Array<{
          migration_name: unknown;
          checksum: unknown;
          finished_at: unknown;
          rolled_back_at: unknown;
        }>
      >`
        SELECT migration_name, checksum, finished_at, rolled_back_at
        FROM "_prisma_migrations"
        ORDER BY started_at ASC, id ASC
      `;
      appliedMigrations = migrations.map((migration) => ({
        name:
          typeof migration.migration_name === 'string'
            ? migration.migration_name
            : '',
        checksum:
          typeof migration.checksum === 'string' ? migration.checksum : '',
        finished: migration.finished_at != null,
        rolledBack: migration.rolled_back_at != null,
      }));
    } catch {
      return this.readinessResponse({
        status: 'not_ready',
        databaseStatus: 'not_ready',
        schemaStatus: 'unavailable',
        expectedMigration,
        appliedMigration: null,
        minimumCompatible: null,
        providerStatuses,
        features,
        revision,
      });
    }

    const appliedMigration =
      [...appliedMigrations]
        .reverse()
        .find(
          (migration) =>
            migration.finished &&
            !migration.rolledBack &&
            isMigrationVersionName(migration.name),
        )?.name ?? null;

    let minimumCompatible: string | null = null;
    let hasDeclaredCompatibilityFloor = false;
    try {
      const tableLookup = await this.prisma.$queryRaw<
        Array<{ relation_name: unknown }>
      >`
        SELECT to_regclass('"DatabaseReleaseCompatibility"')::text AS relation_name
      `;
      const relationName = tableLookup[0]?.relation_name;

      if (relationName === null) {
        minimumCompatible = expectedMigration;
      } else if (typeof relationName === 'string' && relationName.length > 0) {
        const compatibility = await this.prisma.$queryRaw<
          Array<{ minimumApiMigration: unknown }>
        >`
          SELECT "minimumApiMigration"
          FROM "DatabaseReleaseCompatibility"
          WHERE id = 1
          LIMIT 1
        `;
        const declaredMinimum = compatibility[0]?.minimumApiMigration;
        if (isMigrationVersionName(declaredMinimum)) {
          minimumCompatible = declaredMinimum;
          hasDeclaredCompatibilityFloor = true;
        }
      }
    } catch {
      // Missing or inaccessible compatibility metadata fails closed below.
    }

    const evaluatedSchemaStatus = minimumCompatible
      ? evaluateSchemaCompatibility({
          packaged: packagedMigrations,
          applied: appliedMigrations,
          minimumCompatible,
          knownFingerprints: getKnownActiveProductionMigrationFingerprints(),
        })
      : 'unavailable';
    const schemaStatus =
      evaluatedSchemaStatus === 'ahead_compatible' &&
      !hasDeclaredCompatibilityFloor
        ? 'incompatible'
        : evaluatedSchemaStatus;
    const schemaReady =
      schemaStatus === 'ready' || schemaStatus === 'ahead_compatible';

    return this.readinessResponse({
      status: schemaReady ? 'ready' : 'not_ready',
      databaseStatus: schemaReady ? 'ready' : 'not_ready',
      schemaStatus,
      expectedMigration,
      appliedMigration,
      minimumCompatible,
      providerStatuses,
      features,
      revision,
    });
  }

  private readinessResponse(input: {
    status: 'ready' | 'not_ready';
    databaseStatus: 'ready' | 'not_ready';
    schemaStatus: SchemaCompatibilityStatus | 'unavailable';
    expectedMigration: string | null;
    appliedMigration: string | null;
    minimumCompatible: string | null;
    providerStatuses: ReturnType<AppService['getProviderStatuses']>;
    features: ReturnType<typeof getApiFeatureReadiness>;
    revision: string;
  }) {
    return {
      status: input.status,
      service: 'api',
      release: {
        revision: input.revision,
      },
      database: {
        status: input.databaseStatus,
        schema: {
          status: input.schemaStatus,
          expected: input.expectedMigration,
          applied: input.appliedMigration,
          minimum_compatible: input.minimumCompatible,
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
