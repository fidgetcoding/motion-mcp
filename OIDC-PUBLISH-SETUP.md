# OIDC Publish Setup

> **Current state (2026-06): this repo publishes via classic `NPM_TOKEN` auth, not OIDC.**
> The trusted-publisher config on npmjs.com for this package kept binding to the wrong
> repo regardless of UI edits (npm backend issue — see the comment at the top of
> `.github/workflows/publish.yml`). The steps below are the target setup once that
> config untangles; until then `publish.yml` uses `secrets.NPM_TOKEN`.

Target flow: releases ship via `.github/workflows/publish.yml` using npm's OIDC trusted publisher flow — no long-lived token required.

## To publish a new version

1. Bump the version in `package.json`.
2. `git tag vX.Y.Z && git push --tags`.
3. GitHub Actions auto-publishes with `--provenance`.

## One-time npm-side setup (required before first OIDC publish)

Go to `https://www.npmjs.com/package/fidgetcoding-motion-mcp/access` → Publishing access → add **GitHub Actions** as a trusted publisher for repo `fidgetcoding/motion-mcp` and workflow `publish.yml`.

Without this, `npm publish --provenance` fails with: `unauthorized: The package requires ...`.

`publish-token.yml.bak` is an earlier token-based workflow kept for diff reference; the live `publish.yml` currently uses token auth too (see note at top).
