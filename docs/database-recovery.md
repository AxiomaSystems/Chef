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
7. Require `/ready` to expose the deployed source revision, packaged migration,
   applied migration, and database-declared minimum compatible API migration.
   It fails for a database that is behind, divergent, failed, or explicitly
   incompatible. A previous API may remain ready when the database is ahead
   only when every intervening change is classified as backward-compatible.
8. Deploy or promote the compatible web release.

Moving migrations out of container startup prevents every replica from trying
to apply them. If two releases overlap, Prisma's migration lock may cause one
pre-deploy command to fail; a failed release must be investigated or retried,
not bypassed by applying SQL manually.

A repo-owned compatibility metadata row records the minimum packaged migration
an API must support. Expand migrations leave that floor unchanged. The final
contract migration raises it only after old application revisions have been
retired. Readiness also verifies the relevant `_prisma_migrations` history and
checksums; inspecting only the latest successful row is insufficient.

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
BUFFERS)` evidence, table and index sizes, dependency checks, rollback DDL, and
a lock-safe execution plan. Production analysis must not execute mutating or
unbounded statements. Index removal additionally requires at least seven days
of production usage statistics, the statistics-reset timestamp, and query plans
showing the replacement access path. Static schema inspection alone is never
sufficient. Performance migrations default to a five-second `lock_timeout`;
the reviewed plan must set a bounded `statement_timeout` appropriate to the
measured operation and use concurrent/index-safe DDL where PostgreSQL supports
it.

## Backup refresh contract

The backup job runs every 12 hours so one failed attempt can be retried before
the 24-hour RPO expires. It uses a single-job advisory lock and one bounded
retry within 30 minutes; overlapping runs exit without changing either the
source or last verified recovery copy. The backup owner is alerted when the
last verified copy reaches 18 hours, escalation begins at 23 hours, and a copy
older than 24 hours is declared an RPO breach. During a breach, destructive
migrations and data-changing releases are paused until a fresh copy is
verified.

Each run must:

1. use deployment-scoped secrets for the Supabase source and Railway recovery
   destination;
2. use PostgreSQL tooling at least as new as the Supabase source and create a
   custom-format dump of the app-owned `public` schema with ownership and ACLs
   omitted; managed Supabase schemas, roles, and provider metadata are excluded;
3. restore into a new date-and-run-specific database;
4. preflight required extensions against the Railway PostgreSQL version and
   provision only supported app dependencies;
5. validate connectivity, all relevant Prisma migration names/checksums and
   failure state, required tables, bounded row-count invariants, and a
   read-only application-level Prisma query;
6. mark the new database as verified only after all checks pass;
7. retain the previous verified database until the replacement is verified;
8. emit metadata only: timestamps, migration version, duration, database size,
   and pass/fail status;
9. delete expired logical copies only under the pre-approved retention policy:
   keep at least two verified logical copies and six days of daily Railway
   volume snapshots, and record every deletion without row data or secrets.

The job exits non-zero on dump, restore, or validation failure. A failed partial
restore is quarantined, never marked verified, and removed after diagnostic
metadata is captured and the last verified copy is confirmed. Capacity checks
must reserve space for the current verified copy, the incoming restore, and
one previous verified copy. The job must not modify the Supabase source.

The source credential is least-privilege and read-only where PostgreSQL dump
requirements allow. The recovery credential may create and restore isolated
databases but is not an application runtime credential. Both remain
Railway-scoped secrets.

## Failed migration runbook

1. Railway stops the candidate release when the pre-deploy command fails; keep
   the previous API serving and pause later database releases.
2. The database owner inspects the failed `_prisma_migrations` row, logs, and
   actual database objects without editing the migration history first.
3. If no SQL took effect, or all partial changes were explicitly reversed and
   verified, the owner may use `prisma migrate resolve --rolled-back <name>`
   after approval and retry the unchanged reviewed migration.
4. If SQL partially took effect, create and review an idempotent forward repair
   or explicit reversal before resolving the row. Never mark a partial
   migration applied merely to unblock deploys.
5. `prisma migrate resolve --applied <name>` is allowed only when the complete
   committed SQL is already present, its checksum and objects were verified,
   and the database owner and release approver record the exception.
6. After repair, verify migration history/checksums, API readiness, critical
   reads and writes, and the web smoke path before resuming releases.

## Application rollback runbook

1. Identify whether the release applied no migration, a compatible expand
   migration, or a contract/incompatible migration.
2. Roll back the web first when it depends on the candidate API behavior.
3. For no-schema or compatible-expand releases, deploy the previous API image;
   compatibility-aware readiness must pass against the database-ahead state.
4. Do not downgrade the database. If the compatibility floor was raised, the
   previous API is intentionally ineligible and the response is a forward-fix
   API release.
5. Verify release revision, schema compatibility, API readiness, authentication,
   one critical read/write flow, and production web smoke before declaring the
   rollback complete.
6. Record the operator, approver, revisions, migration state, timestamps, and
   outcome without secrets or user data.

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

## Full recovery cutover

1. Declare the incident, stop non-essential writes, and start the RTO clock.
2. Select the newest verified Railway recovery database within the RPO and
   create fresh, scoped runtime and migration credentials.
3. Point the production API database variables to the recovery database and
   deploy the known-compatible API revision. Do not reuse the backup-job
   credential.
4. Verify migration compatibility, `/ready`, authentication, critical reads and
   writes, and the production web smoke before reopening writes.
5. Measure RTO through a usable API and web experience, not merely completion
   of `pg_restore`.
6. If cutover validation fails and the source remains safe, revert the API
   variables to the source and redeploy. Otherwise keep writes stopped and
   continue the reviewed forward repair.

A restore rehearsal uses a separate Railway database and temporary API target
with provider calls and user communications disabled. It cannot overwrite or
impair production, staging, or the last verified recovery copy. Access is
limited to the rehearsal operators. Cleanup occurs only after evidence and
rollback-of-cutover checks are complete.

## Verification design

Repository tests cover release metadata, the migration command boundary, and
backup validation logic without contacting hosted databases. Deployment proof
must additionally record:

- production and staging backup schedule configuration and owner;
- one successful production-to-isolated-Railway restore rehearsal;
- measured dump, restore, validation, credential/config cutover, API deploy,
  readiness, web smoke, and incident-to-usable-service duration;
- the source and restored migration versions;
- confirmation that the evidence contains no secrets or user row data;
- a failed-migration rehearsal and an application rollback rehearsal against
  isolated infrastructure.

The implementation remains incomplete until the real restore rehearsal and
platform backup schedules are verified.
