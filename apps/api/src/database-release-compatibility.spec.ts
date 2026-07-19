import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('database release compatibility contract', () => {
  const migrationName = '20260717170000_add_database_release_compatibility';
  const compatibilityFloor = '20260628120000_add_recipe_execution_metadata';
  const schema = readFileSync(
    resolve(__dirname, '../prisma/schema.prisma'),
    'utf8',
  );

  function readMigrationSql() {
    return readFileSync(
      resolve(
        __dirname,
        '../prisma/migrations',
        migrationName,
        'migration.sql',
      ),
      'utf8',
    ).replace(/\r\n?/g, '\n');
  }

  it('models the singleton compatibility row in Prisma', () => {
    const model = schema.match(
      /model DatabaseReleaseCompatibility\s*\{(?<body>[\s\S]*?)\}/,
    )?.groups?.body;

    expect(model).toBeDefined();
    expect(model).toMatch(/^\s*id\s+Int\s+@id\s*$/m);
    expect(model).toMatch(/^\s*minimumApiMigration\s+String\s*$/m);
    expect(model).toMatch(/^\s*updatedAt\s+DateTime\s+@updatedAt\s*$/m);
  });

  it('creates and seeds a database-enforced singleton row', () => {
    const sql = readMigrationSql();

    expect(sql).toContain('CREATE TABLE "DatabaseReleaseCompatibility"');
    expect(sql).toMatch(
      /CONSTRAINT\s+"DatabaseReleaseCompatibility_singleton"\s+CHECK\s*\(\s*"id"\s*=\s*1\s*\)/,
    );
    expect(
      sql.match(/INSERT INTO "DatabaseReleaseCompatibility"/g),
    ).toHaveLength(1);
    expect(sql).toMatch(
      new RegExp(
        `VALUES\\s*\\(\\s*1,\\s*'${compatibilityFloor}',\\s*CURRENT_TIMESTAMP\\s*\\);`,
      ),
    );
  });
});
