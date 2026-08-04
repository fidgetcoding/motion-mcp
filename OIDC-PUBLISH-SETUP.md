# OIDC Publish Setup

> **Current state (2026-08-04): this repo publishes via OIDC trusted publishing.**
> The earlier `NPM_TOKEN` fallback existed because npm's trusted-publisher record for
> this package kept binding to `lorecraft-io/morgen-mcp` regardless of UI edits. The
> repo has since migrated to the `fidgetcoding` org, retiring that stale binding.
> `publish.yml` no longer reads any npm secret.

Releases ship via `.github/workflows/publish.yml` using npm's OIDC trusted publisher flow — no long-lived token required.

## To publish a new version

1. Bump the version in `package.json`.
2. `git tag vX.Y.Z && git push --tags`.
3. GitHub Actions auto-publishes with `--provenance`.

## One-time npm-side setup (required before the first OIDC publish)

Go to `https://www.npmjs.com/package/fidgetcoding-motion-mcp/access` → Publishing access → add **GitHub Actions** as a trusted publisher for repo `fidgetcoding/motion-mcp` and workflow `publish.yml`.

Without this, `npm publish --provenance` fails with: `unauthorized: The package requires ...`.

The earlier token-based workflow was deleted on 2026-08-04 once the automation token was revoked — nothing in CI reads a secret anymore.
