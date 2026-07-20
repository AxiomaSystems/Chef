# Vision Deployment Decommissioning

Issues: [#92](https://github.com/AxiomaSystems/Chef/issues/92),
[#135](https://github.com/AxiomaSystems/Chef/issues/135)

## Decision

Vision remains on Preppie's future roadmap, but it is not part of the current
beta. Gallo's YOLO/FastAPI work remains an opt-in laboratory project and must
not be deployed until #135 resolves model quality, licensing, security,
privacy, cost, and operations.

The current hosted sidecars are unused by the product: `VisionScanModal` is not
rendered and the hosted Web proxy is disabled. They nevertheless expose public
anonymous endpoints. We will remove that inactive attack surface instead of
productionizing it.

## One-PR scope

- Remove the orphaned Web Vision modal and proxy.
- Remove Nest pipeline/inference routes and sidecar forwarding.
- Preserve authenticated, provider-neutral `VisionObservation` lifecycle
  endpoints and existing data.
- Remove Vision origins and capability claims from deployment validation and
  readiness.
- Stop starting/testing `vision-lab` as part of default product commands; keep
  explicit lab commands and deterministic lab CI.
- Remove the Vision production Dockerfile and Railway deployment config.
- Update active documentation to describe Vision as planned but inactive.
- Do not change barcode scanning, the database schema, historical migrations,
  archived docs, model research, or GPT integration.

## Deployment sequence

1. Open one PR and verify product build, tests, typecheck, check, lab tests, and
   commitlint.
2. Before merge, resolve the exact Railway project, environment, and Vision
   service for staging and production. Abort on missing/multiple targets, an
   unexpected service identifier/type, an attached persistent volume, or any
   remaining API/Web reference.
3. Delete staging Vision, verify its domain is unreachable, and recheck staging
   API/Web.
4. Independently repeat the checks for production, delete production Vision,
   verify its domain is unreachable, and recheck production API/Web.
5. The human merges the already-green PR. Verify the deployed product no longer
   requires Vision, attach sanitized evidence to #92, and close it.

Because the feature is already disabled and unused, deletion before merge may
make only the dormant authenticated inference routes fail. It must not affect
active product paths. After service deletion, rollback is fix-forward; never
recreate the unapproved public sidecar.

## Verification

- `pnpm build`
- `pnpm test`
- `pnpm typecheck`
- `pnpm check`
- explicit Vision lab tests, reported separately
- `pnpm commitlint --from origin/main --to HEAD --verbose`
- repository search confirms no active Web/API/deployment path to the sidecar
- hosted checks confirm both former public domains are unreachable

## Completion boundary

#92 closes only after repository decoupling is merged and both hosted services
are gone. Returning any Vision implementation to staging or production requires
#135. Existing `VisionObservation` retention/export/deletion remains owned by
#100 and #102.
