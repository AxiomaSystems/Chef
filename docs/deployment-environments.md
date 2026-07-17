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
- `RUN_DB_SEED_ON_STARTUP=false` unless an operator intentionally enables the
  staging seed path.

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

## Boundary with production readiness

This environment contract owns isolation: distinct origins, services,
databases, credentials, reset/seed safeguards, and Preview smoke evidence.

Issue #93 owns feature readiness within those isolated environments, including
the required production AI/provider mode, credential completeness, Swagger and
seed policy, customer-facing CORS, and feature-by-feature readiness signals.
Its release validation should consume this topology and smoke path rather than
define a second environment model.
