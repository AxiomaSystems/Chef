# Integration PR - Staging Merge Checklist

Summary
- Short description of what this PR merges into the integration/staging branch.
- Branches included: list branches (e.g. `feature/…`, `ui/<name>`).

Deployment target
- Integration branch name: e.g. `staging/week7` or `integration/dev`
- Staging services: Vercel preview (PR) + Railway staging service

Pre-merge automated checks
- [ ] CI pipeline (API Baseline) is green for this PR
- [ ] Unit tests pass
- [ ] E2E tests (if present) pass
- [ ] Lint and type checks pass
- [ ] Prisma generate/migrate seeds run locally without unexpected errors

Staging deploy & smoke validations (run after the PR is merged into the integration branch)
- [ ] Vercel preview deploy succeeds for the integration branch/PR
- [ ] Railway staging service builds and runs the API container
- [ ] `/health` returns 200
- [ ] `/ready` reports `database: ready` and accurate `providers` status

Manual E2E smoke checklist (perform in staging env)
- [ ] Auth
  - [ ] Login as demo user (or use configured demo creds)
  - [ ] GET /me loads user profile
- [ ] Planning spine
  - [ ] Browse `/recipes` loads
  - [ ] `POST /recipe-forks` (fork a system recipe) succeeds
  - [ ] Create a draft (`POST /cart-drafts`) and confirm `GET /cart-drafts/:id` works
  - [ ] Generate a cart (`POST /carts`) from the draft and confirm cart detail loads
- [ ] Shopping/cart
  - [ ] Generate shopping cart (`POST /carts/:cartId/shopping-carts`) succeeds or returns a clear provider error (missing location/credentials)
  - [ ] If generated, open `/shopping` and confirm shopping-cart detail loads
  - [ ] Patch shopping cart (`PATCH /shopping-carts/:id`) with `matched_items` and confirm persistence
  - [ ] Delete a shopping cart and confirm it no longer appears in `/shopping`
- [ ] Inventory & restock
  - [ ] Add a kitchen item (`POST /me/kitchen-inventory`) and confirm in `/me/kitchen-inventory`
  - [ ] Create restock cart (`POST /carts/restock`) and confirm flow
- [ ] Onboarding/profile
  - [ ] Save preferences (`PUT /me/preferences`) and confirm `/me` reflects changes
  - [ ] Patch profile memory (`PATCH /me/profile-memory`) and then `POST /me/onboarding/complete`
- [ ] Retailer capability gating
  - [ ] GET `/retailers/capabilities` returns expected states; UI should hide unavailable controls
- [ ] Frontend sanity
  - [ ] No 404s on these critical pages: `/`, `/recipes`, `/shopping`, `/account`, any draft detail pages
  - [ ] Shared fetch helpers (`buildApiUrl`) produce correct URLs for staging

Rollout rules
- Merge integration branch into `main` only when:
  - [ ] Staging smoke checklist is green
  - [ ] CI consistently passes on the integration branch
  - [ ] At least 1 code review + owner approval
- After merge:
  - [ ] Monitor production deploy logs for 15–30 minutes
  - [ ] Run the quick smoke checklist against production (auth, /me, generate cart, open shopping)

Post-merge housekeeping
- [ ] Delete/archive the temporary integration branch when no longer needed
- [ ] Create a short post-merge note in the PR summarizing any fixes made during staging
- [ ] If any migration was applied, ensure DB migration plan for production is documented and scheduled

Useful commands
```bash
# run API baseline locally
pnpm --filter api test

# generate prisma client
pnpm --filter api prisma:generate

# run API in dev
pnpm --filter api dev