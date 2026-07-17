# Deployment environments

Preppie uses `main` as its production trunk. Staging is an isolated runtime
environment, not a permanent Git branch.

| Target     | Source              | Web               | API and Vision                  | Database and providers                                   |
| ---------- | ------------------- | ----------------- | ------------------------------- | -------------------------------------------------------- |
| Local      | developer checkout  | local Next.js     | local Nest and Vision processes | local Docker Postgres; provider mocks by default         |
| Preview    | pull request branch | Vercel Preview    | Railway `staging` services      | staging-only database and restricted staging credentials |
| Production | `main`              | Vercel Production | Railway `production` services   | production database and production credentials           |

Temporary `staging/*` or `integration/*` branches are optional release tools.
They do not own an environment and never replace `main`.

## Deployment contract v1

Contract version: **v1**. Last reviewed: **2026-07-17**.

| Surface      | Staging / Preview                                                                                     | Production                                                                                                                                                   | Requirement                                                                                                                                                   |
| ------------ | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web          | Vercel Preview from the pull-request branch; `API_BASE_URL` targets the staging API                   | Vercel Production from `main`; `API_BASE_URL` targets the production API                                                                                     | Required; web readiness must identify the environment and report its API capability as `ready`                                                                |
| API          | Railway `staging` API, isolated from production                                                       | Railway `production` API sourced from `main`                                                                                                                 | Required; `/ready` must identify `api`, report the expected environment, and reject redirects                                                                 |
| Vision       | Railway `staging` Vision origin, distinct from production                                             | Railway `production` Vision origin                                                                                                                           | Configuration readiness is required; `/ready` reports `readiness_scope=configuration` and `runtime_status=not_checked`; runtime/model liveness belongs to #92 |
| Database     | Staging-only database and credentials                                                                 | Production database and credentials                                                                                                                          | Required; connectivity must be `ready`, and safe non-empty `expected` and `applied` migration versions must match                                             |
| AI           | Mock mode; readiness status `disabled`; no production provider credential                             | OpenAI mode with its production credential; readiness status `ready`                                                                                         | Required environment invariant                                                                                                                                |
| Retailers    | Real providers disabled; no provider may report `configured` or `missing_credentials`                 | Optional per retailer; `configured` requires complete credentials, `mode=production`, and `is_available=true`; `disabled` or `partner_required` remain valid | Credentials are environment-scoped and never shared; readiness must report Kroger, Instacart, and Walmart                                                     |
| Voice        | Optional; a complete enabled bundle reports `ready`; otherwise `disabled` or intentionally `degraded` | Same, using Production-scoped credentials                                                                                                                    | Optional, but partial or `misconfigured` bundles fail readiness                                                                                               |
| API docs     | `API_ENABLE_DOCS=false`                                                                               | `API_ENABLE_DOCS=false`                                                                                                                                      | Required for hosted environments                                                                                                                              |
| Startup seed | `RUN_DB_SEED_ON_STARTUP=false`                                                                        | `RUN_DB_SEED_ON_STARTUP=false`                                                                                                                               | Required; automatic hosted startup seeding is prohibited                                                                                                      |
| CORS         | Preview consumer origins only, as clean HTTPS origins                                                 | Customer-facing production origins only, as clean HTTPS origins                                                                                              | Required; no credentials, paths, queries, fragments, loopback, or cross-environment origins                                                                   |

## Required isolation

Vercel variables must be scoped by target:

- Production `API_BASE_URL` points to the production API.
- Preview `API_BASE_URL` points to the staging API.
- `PRODUCTION_API_BASE_URL` is the public production API URL in Preview and is
  used only as a sentinel; a Preview build fails if both origins match.
- Secrets and provider credentials must have separate Preview and Production
  entries. Do not assign one credential entry to both targets.

Railway must contain distinct `staging` and `production` environments. Each has
separate `api` and `vision` services. Staging must set:

- `PRODUCTION_DATABASE_HOST` to the public hostname of the production database,
  without credentials;
- `PRODUCTION_VISION_API_BASE_URL` to the production Vision URL;
- `RUN_DB_SEED_ON_STARTUP=false`.

If staging intentionally needs seed data, an operator runs
`pnpm --filter api db:seed` once from a session explicitly scoped to the staging
database. One-off seeding never uses `RUN_DB_SEED_ON_STARTUP=true`.

The staging API refuses to boot when its database hostname or Vision origin
matches the production sentinel. The production container refuses automatic
seed-on-startup. The root `pnpm api:reset` command accepts only loopback database
hosts and cannot reset a hosted database.

## Operator verification

Before enabling Preview traffic:

1. Confirm Vercel Preview and Production variable entries are separately scoped.
2. Confirm Railway has distinct `staging` and `production` environments,
   services, domains, and database credentials.
3. Confirm the staging database project is not the production project.
4. Run the read-only endpoint smoke check:

   ```powershell
   $env:STAGING_WEB_URL = "https://<preview-host>"
   $env:PRODUCTION_WEB_URL = "https://<production-host>"
   $env:STAGING_API_BASE_URL = "https://<staging-api>/api/v1"
   $env:PRODUCTION_API_BASE_URL = "https://<production-api>/api/v1"
   $env:STAGING_VISION_BASE_URL = "https://<staging-vision>"
   $env:PRODUCTION_VISION_BASE_URL = "https://<production-vision>"
   pnpm smoke:isolation
   ```

5. In Preview, create a synthetic account and one uniquely named record. Verify
   it exists in the staging database and is absent from production, then remove
   it from staging. This write test is manual and must use synthetic data only.

The endpoint smoke is non-destructive. It checks HTTPS, distinct origins,
service health, and the API environment identity; it does not inspect secrets.

## Verified platform evidence

The following platform evidence was verified during the 2026-07-17 review;
no secret values were read or recorded:

- Railway production and staging API and Vision deployments reported `SUCCESS`
  at source revision `24193a3`.
- Vercel Production and Preview were isolated, and `pnpm smoke:isolation`
  passed against those deployed targets.
- Railway production explicitly set `RUN_DB_SEED_ON_STARTUP=false`.

This evidence proves the deployed topology and isolation checkpoint. A later
source revision still needs its own feature-readiness smoke after deployment.

## Feature readiness smoke

Run the separate, read-only feature smoke only against a deployed staging or
production web/API pair. It enforces deployment identity, web capability shape,
database migration parity, environment-specific AI and Vision configuration,
and retailer mode/credential signals. Optional voice capabilities may report
`disabled` or `degraded`; unknown, incomplete, or `misconfigured` states fail.

```powershell
$env:READINESS_WEB_BASE_URL = "https://actual-deployed-web-host"
$env:READINESS_API_BASE_URL = "https://actual-deployed-api-host"
$env:READINESS_ENVIRONMENT = "staging"
pnpm smoke:readiness
```

`READINESS_API_BASE_URL` is the API deployment origin because `/ready` is a
root probe, not a versioned consumer API route. Staging must use the Preview
web and staging API and report `staging`; production must use the canonical web
and API origins and report `production`. Both base URLs must be clean HTTPS
origins: no credentials, query, hash, or path other than `/`. The command
rejects redirects and emits only the checked environment and outcome; it never
prints response bodies, secret values, or raw readiness payloads.

The current command is a manual promotion gate. Issue #77 owns workflow wiring
and retention of Preview/staging smoke evidence. Issue #92 owns Vision runtime
and model liveness beyond the configuration-only signal consumed here. This
repository command does not create a deployment, mutate platform variables, or
turn a Preview into production.

## Boundary with production readiness

This environment contract owns isolation: distinct origins, services,
databases, credentials, reset/seed safeguards, and Preview smoke evidence.

Issue #93 owns feature readiness within those isolated environments, including
the required production AI/provider mode, credential completeness, Swagger and
seed policy, customer-facing CORS, and feature-by-feature readiness signals.
Its release validation should consume this topology and smoke path rather than
define a second environment model.
