# Plan 003: Add a GitHub Actions CI workflow (typecheck, lint, build)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat c7261bf..HEAD -- package.json .github`
> If `.github/workflows/` already exists, STOP: someone added CI since this
> plan was written; reconcile instead of duplicating.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW (adds files only; no source changes)
- **Depends on**: plans/002-make-lint-pass.md (lint must exit 0 or the workflow is born red)
- **Category**: dx
- **Planned at**: commit `c7261bf`, 2026-07-01

## Why this matters

The repo has no CI: `.github/workflows/` does not exist. Every change lands via PR (see git history — nearly every commit is a PR merge), but nothing checks those PRs. The only automated build is Cloudflare Workers Builds, which runs on push to `main` — i.e. AFTER merge — so a type error or broken build is discovered only when the production deploy fails. A minimal workflow running typecheck, lint, and the static-export build on every PR closes that gap. (Plan 004 later appends a test step.)

## Current state

- No `.github/` directory exists.
- `package.json` scripts (verbatim):

```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "deploy": "next build && wrangler deploy"
  },
```

There is no `typecheck` script; `npx tsc --noEmit` currently exits 0.

- The app is a fully static Next.js 16 export (`output: "export"` in `next.config.ts`); `npm run build` needs no environment variables, secrets, or network services and writes to `./out`.
- The repo uses `package-lock.json` (npm), so CI should use `npm ci`.
- Deploys are handled by Cloudflare Workers Builds connected to the GitHub repo — CI must NOT deploy; it only verifies.

## Commands you will need

| Purpose   | Command             | Expected on success |
|-----------|---------------------|---------------------|
| Install   | `npm ci`            | exit 0              |
| Typecheck | `npm run typecheck` | exit 0 (after step 1) |
| Lint      | `npm run lint`      | exit 0              |
| Build     | `npm run build`     | exit 0              |
| Workflow syntax | `npx --yes yaml-lint .github/workflows/ci.yml` (or any YAML parse) | valid YAML |

## Scope

**In scope** (the only files you should modify/create):
- `package.json` (add one script)
- `.github/workflows/ci.yml` (create)

**Out of scope**:
- `wrangler.jsonc`, deploy configuration, or anything touching Cloudflare — CI verifies, it never deploys.
- Adding a test step (plan 004 owns that).
- Branch-protection settings (dashboard-side; note it in your report as a manual follow-up for the operator).

## Git workflow

- Branch: `add-ci` (short kebab-case, merged via PR)
- Commit message style: imperative sentence, e.g. `Add CI: typecheck, lint, and build on every PR`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add a `typecheck` script

In `package.json`, add to `scripts`:

```json
    "typecheck": "tsc --noEmit",
```

**Verify**: `npm run typecheck` → exit 0, no errors.

### Step 2: Create the workflow

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run build
```

(Node 24 is the current LTS; the app has no version pin — if a `.nvmrc` or `engines` field has appeared since this plan was written, match it instead.)

**Verify**: the file parses as YAML (e.g. `node -e "const fs=require('fs');require('util');JSON.stringify(fs.readFileSync('.github/workflows/ci.yml','utf8'))"` just proves it reads; better: `npx --yes js-yaml .github/workflows/ci.yml` → prints the parsed document with no error).

### Step 3: Run the same gates locally

CI can't run until this branch is pushed, so prove the pipeline green locally, in the same order:

**Verify**: `npm ci && npm run typecheck && npm run lint && npm run build` → each exits 0.

## Test plan

No unit tests (plan 004). The "test" is step 3: the exact command sequence the workflow runs must pass locally.

## Done criteria

- [ ] `.github/workflows/ci.yml` exists and parses as valid YAML
- [ ] `package.json` has a `typecheck` script; `npm run typecheck` exits 0
- [ ] `npm run lint` exits 0 (plan 002 landed)
- [ ] `npm run build` exits 0
- [ ] `git status` shows only the two in-scope files changed/created
- [ ] `plans/README.md` status row updated
- [ ] Report notes the manual follow-up: enable branch protection on `main` requiring the `checks` job

## STOP conditions

Stop and report back (do not improvise) if:

- `npm run lint` does not exit 0 (plan 002 hasn't landed or regressed — this plan depends on it).
- `.github/workflows/` already exists (drift; reconcile, don't duplicate).
- `npm run build` fails locally for reasons unrelated to your changes.

## Maintenance notes

- Plan 004 appends a `npm test` step to this workflow after the build step.
- If the Cloudflare build image and CI diverge on Node versions and the build behaves differently, pin the version in both places.
- The workflow runs on pushes to `main` as well as PRs so the badge/history reflects the deployed branch; if Cloudflare Builds ever gains PR checks, this workflow is still worth keeping for the typecheck/lint gates Cloudflare doesn't run.
