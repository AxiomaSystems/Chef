# Integration Branch Commands & Quick Checklist

## Git commands (create integration branch, merge feature branches)
```bash
# start from latest main
git fetch origin
git checkout origin/main -B staging/week7

# merge backend branch (replace with your branch name)
git merge --no-ff your-backend-branch -m "Merge backend work into staging/week7"

# merge UI engineer branch
git merge --no-ff ui/engineer-branch -m "Merge UI fixes into staging/week7"

# resolve conflicts, then
git add .
git commit

# push integration branch
git push -u origin staging/week7

# open PR using GitHub CLI (optional)
gh pr create --base staging/week7 --head staging/week7 --title "Staging: integrate week7 backend + UI" --body-file .github/PULL_REQUEST_TEMPLATE/integration.md
```

## Quick Railway / Vercel checks
- Confirm Railway service is configured to deploy from branch `staging/week7` (staging service).
- Confirm Vercel has a Preview/Branch deployment for `staging/week7`.
- Ensure staging env vars mirror production where safe (secrets omitted) or use staging-specific values.

## Short checklist for the UI engineer (paste into PR description)
- [ ] Build succeeds locally (`pnpm install && pnpm --filter api build && pnpm --filter web build`)
- [ ] CI passes on the PR
- [ ] Staging deploys on Vercel + Railway
- [ ] `/health` and `/ready` return expected statuses on staging
- [ ] No 404s on critical pages: `/`, `/recipes`, `/shopping`, `/account`, draft detail
- [ ] Planning spine: save draft -> generate cart -> generate shopping cart (or clear provider error)
- [ ] Retailer search works when provider is enabled or shows explicit error when not
- [ ] Preferences/onboarding flows complete without 4xx
- [ ] Shopping-cart patch persists manual edits
- [ ] Add short notes in PR about any remaining known issues