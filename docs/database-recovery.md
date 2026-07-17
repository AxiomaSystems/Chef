# Database release and recovery

Status: approved design for issue #94. Last reviewed: 2026-07-17.

## Objectives

Preppie treats `main` as the production release source and keeps database
changes compatible with the currently deployed API and web application. During
the private beta, the database recovery objectives are:

- recovery point objective (RPO): no more than 24 hours of committed data;
- recovery time objective (RTO): restore a usable service within 4 hours;
- no destructive database action without a named operator and explicit
  approval;
- no secret values, database dumps, or connection strings in the repository or
  release evidence.

## Approved topology

- Production remains on Supabase Free as its primary PostgreSQL database.
- The existing production Railway PostgreSQL service is the independent
  recovery destination. It is not part of the normal application request path.
- A daily Railway cron job creates a logical dump of production and restores it
  into a newly named database on the recovery PostgreSQL service.
- The previous verified recovery database remains available until the new copy
  passes validation. A failed refresh must never destroy the last known-good
  copy.
- Railway volume backups add daily snapshot retention around the restored
  recovery databases.
- Staging continues to use its isolated Railway PostgreSQL service and receives
  its own Railway volume backup schedule. Production data is never restored
  into staging.

This design does not provide point-in-time recovery. Supabase Free does not
include automated backups or PITR, so the accepted beta recovery point is the
last successful daily logical copy.

## Release flow

Database migrations run once as a Railway pre-deploy command from the same
immutable image that will run the API. The API container startup does not run
migrations.

The release order is:

1. Review migration SQL and classify its compatibility and lock risk.
2. Confirm the required backup gate for the migration class.
3. Build the candidate API image.
4. Run `prisma migrate deploy` as the API pre-deploy command.
5. Stop the deployment if the migration command fails.
6. Start the new API only after migrations succeed.
7. Require `/ready` to report the packaged and applied migration versions as
   equal and expose the deployed source revision.
8. Deploy or promote the compatible web release.

Moving migrations out of container startup prevents every replica from trying
to apply them. If two releases overlap, Prisma's migration lock may cause one
pre-deploy command to fail; a failed release must be investigated or retried,
not bypassed by applying SQL manually.

## Expand-and-contract policy

Normal releases use backward-compatible, roll-forward migrations:

- **Expand:** add nullable columns, new tables, non-breaking indexes, or new
  constraints in a non-validating form where PostgreSQL supports it.
- **Migrate:** deploy code that can read both shapes, backfill in bounded and
  restartable batches, then make the new shape authoritative.
- **Contract:** remove old reads and writes first; remove columns, tables,
  values, or indexes only in a later release after evidence shows they are no
  longer used.

Renames are implemented as add, dual-read or dual-write, backfill, cut over,
and later removal. A single migration must not rename or drop a live field that
the previous application revision still requires.

## Change classes and approval gates

| Class                         | Examples                                                                 | Required gate                                                                                                                         |
| ----------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| Routine compatible            | nullable column, new table, small validated constraint                   | reviewed SQL, staging migration, standard verification                                                                                |
| Data or performance           | backfill, index creation/removal, generated expression                   | fresh verified recovery copy, representative plans and sizes, lock-risk notes, manual release approval                                |
| Destructive or high lock risk | drop/rename, type rewrite, large table rewrite, irreversible data change | staged expand-and-contract plan, fresh verified recovery copy, restore owner present, explicit approval; never a one-release shortcut |

Critical query/index changes require representative `EXPLAIN (ANALYZE,
BUFFERS)` evidence, table and index sizes, and a lock-safe execution plan.
Indexes are not removed from static schema inspection alone; production usage
and query-plan evidence are required.

## Backup refresh contract

The backup job must:

1. use deployment-scoped secrets for the Supabase source and Railway recovery
   destination;
2. create a custom-format logical dump without logging connection strings or
   row data;
3. restore into a new date-and-run-specific database;
4. validate connectivity, the latest successful Prisma migration, required
   tables, and bounded row-count invariants;
5. mark the new database as verified only after all checks pass;
6. retain the previous verified database until the replacement is verified;
7. emit metadata only: timestamps, migration version, duration, database size,
   and pass/fail status;
8. delete expired logical copies only after a newer verified copy and volume
   snapshot exist.

The job must exit non-zero on dump, restore, or validation failure so a missed
24-hour recovery point is visible. It must not modify the Supabase source.

## Recovery boundaries

- Application rollback is allowed only while the old application remains
  compatible with the current schema.
- Applied production migrations are not automatically downgraded. Unsafe
  schema changes are recovered by a forward fix or, after explicit incident
  approval, by switching to a verified recovery database.
- Provider outages use degraded feature behavior and provider runbooks; a
  database restore is not a provider-outage response.
- Accidental deletion may require either a selective restore into a temporary
  database for controlled copy-back or a full recovery cutover, depending on
  scope.

## Verification design

Repository tests cover release metadata, the migration command boundary, and
backup validation logic without contacting hosted databases. Deployment proof
must additionally record:

- production and staging backup schedule configuration and owner;
- one successful production-to-isolated-Railway restore rehearsal;
- measured dump, restore, validation, and total recovery duration;
- the source and restored migration versions;
- confirmation that the evidence contains no secrets or user row data;
- a failed-migration rehearsal and an application rollback rehearsal against
  isolated infrastructure.

The implementation remains incomplete until the real restore rehearsal and
platform backup schedules are verified.
