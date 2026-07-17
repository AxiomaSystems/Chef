import { join, resolve } from 'node:path';
import {
  getExpectedMigrationVersion,
  getMigrationDirectoryCandidates,
} from './database-schema-readiness';

describe('database schema readiness', () => {
  it('derives the expected version from the latest repository migration', () => {
    expect(
      getExpectedMigrationVersion([resolve(__dirname, '../prisma/migrations')]),
    ).toBe('20260628120000_add_recipe_execution_metadata');
  });

  it('fails closed when migrations are unavailable', () => {
    expect(() =>
      getExpectedMigrationVersion([
        resolve(__dirname, '../prisma/migrations-not-packaged'),
      ]),
    ).toThrow('API migrations directory is unavailable');
  });

  it('includes the Docker runtime migration path when running built output', () => {
    const apiRoot = resolve(__dirname, '..');

    expect(
      getMigrationDirectoryCandidates({
        cwd: apiRoot,
        moduleDirectory: join(apiRoot, 'dist', 'src'),
      }),
    ).toContain(join(apiRoot, 'prisma', 'migrations'));
  });
});
