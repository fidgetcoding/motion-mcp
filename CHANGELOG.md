# Changelog

All notable changes to `fidgetcoding-motion-mcp` are documented here.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **Note on package name:** This package was originally published as `motion-calendar-mcp` on npm. Renamed to `fidgetcoding-motion-mcp` on 2026-04-18 under the FidgetCoding brand umbrella (after briefly trying the scoped `@lorecraft/motion-mcp` as an intermediate stop — bare `motion-mcp` was blocked by an unrelated `motionmcp` package on npm). The old `motion-calendar-mcp` package is unpublished from npm; the GitHub repo was renamed from `lorecraft-io/motion-calendar-mcp` → `lorecraft-io/motion-mcp` (GitHub 301 redirects the old URL). The owner account has since been renamed too — the canonical URL today is `github.com/fidgetcoding/motion-mcp` (all old URLs 301-redirect).

## [Unreleased]

### Fixed
- MCP stdio stream corruption: dotenv 17 prints an "injected env" tip line to stdout by default, which lands ahead of the JSON-RPC stream. Suppressed with `quiet: true` in `src/index.js`.
- Server version reported over MCP `initialize` was hard-coded at `2.1.0`; now read from `package.json` so it can't drift from the published release.
- `create_event` could crash with a null dereference when Motion's `mainCalendarId` doesn't match any returned calendar; now throws a clear error telling the caller to pass `calendar_id` explicitly.
- `install.sh` enforced Node 18+ while `package.json` `engines` requires `>=20`; installer and README badge now both say 20+. Installer header also still said "MOTION CALENDAR MCP" (pre-rename branding).
- README Tools table listed parameter names that don't exist on the actual tool schemas (`start`/`end`/`calendar_ids`/`user_ids`/`working_hours`/`recurrence`); corrected to the real ones (`start_date`, `end_date`, `calendar_id`, `teammate_user_ids`, etc.) and removed the recurring-event *creation* claim (`create_event` has no recurrence param — recurrence is set in the Motion app).
- `OIDC-PUBLISH-SETUP.md` claimed OIDC was the live publish flow; corrected to reflect the current `NPM_TOKEN` fallback documented in `publish.yml`.

### Added
- README: social-links badge strip (X · LinkedIn · YouTube · Instagram, ruvnet-style for-the-badge) inserted into the centered header block beneath the project metadata badges.

### Changed
- Git history rewrite: `git filter-repo` collapsed all author/committer identities (dependabot[bot], lorecraft-io, fidgetcoding, nate variants) into a single `Nate Davidovich <nate@lorecraft.io>` identity across `main` and all release tags. All `Co-authored-by:` trailers stripped. Tag commit hashes for v2.1.0 / v2.1.2 / v2.1.3 changed; npm tarballs unaffected (already published from old hashes).

## [2.1.3] - 2026-04-20

### Changed
- **OIDC provenance validation.** Version bump to align published package with the OIDC-signed release flow after the 2.1.2 publish surfaced provenance verification edge cases. `package.json` + `package-lock.json` version bumps only — no runtime behavior changes.

### Fixed
- Post-release hotfix: publish workflow now falls back to `NPM_TOKEN` auth when the trusted-publisher config is unresolvable (tracked as a June 15, 2026 follow-up to fully migrate back to OIDC-only).

## [2.1.2] - 2026-04-20

### Changed
- **npm 11+ in the publish workflow.** Trusted-publisher OIDC auth requires npm 11.5 or higher; the publish workflow was upgraded and `package-lock.json` regenerated with npm 11 so platform-specific optional dependencies (rolldown bindings) resolve correctly across CI runners.
- Shipped the OIDC provenance publish workflow (`npm publish --provenance`, no token secret).

## [2.1.1] - 2026-04-20

### Fixed
- **Rolldown CI port.** Vitest 4.x + rolldown now CI-clean — `@rolldown/binding-*` hoisted into `optionalDependencies` (npm/cli#4828 workaround) so fresh installs on Linux runners don't fail on missing platform binaries.
- `engines.node` bumped to `>=20` to match the shipped runtime and stop npm emitting soft warnings on older Node versions.
- `bin/setup.js` + `install.sh` branding sweep so the interactive setup prints `Motion MCP` (not the old `motion-calendar-mcp` string) end to end.

### Added
- Structured env validator in `bin/setup.js` that fails fast with a readable message when `MOTION_API_KEY`, `FIREBASE_API_KEY`, `FIREBASE_REFRESH_TOKEN`, or `MOTION_USER_ID` is missing, instead of deferring the error to the first tool call.
- Dependabot alerts enabled for the repo (parity with the other `lorecraft-io` MCPs).

## [2.1.0] - 2026-04-18

### Changed
- **npm package renamed to `fidgetcoding-motion-mcp`** (was `motion-calendar-mcp`; briefly `@lorecraft/motion-mcp`). Install command updated across docs.
- **GitHub repo renamed to `lorecraft-io/motion-mcp`** (was `motion-calendar-mcp`). Old URL 301-redirects.
- README v2: Quick Navigation table, banner image, tagline polish ("Full calendar access for Claude Code — events, availability, scheduling"), low-maintenance-mode callout (Nate moved to Morgen for personal use; Motion MCP stays live for users who prefer Motion).
- README banner image link swapped to absolute `raw.githubusercontent.com` URL so the banner renders on npmjs.com as well as GitHub.
- README example prompts: `drew@example.com` → `teammate@example.com`; `"Drew <> Nate 1:1"` → `"Weekly 1:1"` (public example placeholders scrubbed of real names).
- `.env.example` header refreshed: "Motion Calendar MCP Configuration" → "Motion MCP Configuration"; setup URL updated to the renamed repo.
- `package-lock.json` regenerated with the correct package name field.
- Git history: `Co-Authored-By: claude-flow <ruv@ruv.net>` trailer stripped from all commits; `Nathan Davidovich` author fields rewritten to `Nate Davidovich`.

### Added
- `bugs.url` in `package.json`.
- `CHANGELOG.md` (this file).

### Dependencies
- All dependencies pinned to exact versions (removed `^` carets) for reproducible builds.

## [2.0.0] and earlier

Pre-rename history is preserved in `git log` under the old `motion-calendar-mcp` authorship and package name. The 2.0.0 line shipped the initial hardened MCP server for Motion calendar — Firebase refresh-token auth, internal API routing for event CRUD / availability / teammate visibility, Motion API key for tasks. Public Motion API (`api.usemotion.com/v1`) is tasks-only; this MCP routes events through the internal Firebase-authed endpoints.

12 tools (unchanged across rename): `list_calendars`, `list_events`, `search_events`, `create_event`, `update_event`, `delete_event`, `check_availability`, `get_teammate_events`, `get_allday_events`, `sync_calendars`, `manage_calendars`, `get_tasks`.
