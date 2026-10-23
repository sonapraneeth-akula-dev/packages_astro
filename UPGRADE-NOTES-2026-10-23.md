# Dependency upgrade and Bun tooling observations

Date: 2026-10-23
Repository: `packages`
Branch: `chore/upgrade-astro-bun-2026-10` (created from local `main`)
Baseline commit: `df29e8a978a35fd33df45185a2fa25a1d2e853c1`

## Scope and provenance

These observations describe the measured upgrade working tree, not a released version.
This documentation commit does not commit the dependency, Docker, formatter, or
typechecker edits described below. Those remain separate working-tree changes.
Pre-existing user edits were retained. No remote submodule update or push was performed.

Before: existing dependency lockfiles, Bun 1.4.3, Node 24.20.0.
After: upgraded lockfiles and project/container Bun 1.4.4; the system Bun was not changed.
Run the new commands with Bun 1.4.4 or newer, not an older executable on PATH.

## Dependency changes

| Manifest | Section | Package | Before | After |
| --- | --- | --- | --- | --- |
| `app\blog\package.json` | packageManager | bun | bun@1.3.14 | bun@1.4.4 |
| `app\package.json` | dependencies | astro | ^7.1.1 | ^7.4.0 |
| `app\package.json` | devDependencies | @astrojs/check | ^0.9.9 | ^0.9.10 |
| `app\package.json` | devDependencies | @types/node | ^26.1.1 | ^26.6.5 |
| `app\package.json` | packageManager | bun | (none) | bun@1.4.4 |
| `package.json` | dependencies | @astrojs/markdown-remark | ^7.2.1 | ^7.3.3 |
| `package.json` | dependencies | @astrojs/mdx | ^7.0.3 | ^8.1.0 |
| `package.json` | dependencies | @types/node | ^26.1.1 | ^26.6.5 |
| `package.json` | dependencies | astro | ^7.1.1 | ^7.4.0 |
| `package.json` | devDependencies | @types/bun | ^1.3.14 | ^1.4.3 |
| `package.json` | devDependencies | playwright-core | ^1.61.1 | ^1.64.1 |
| `package.json` | catalog | @astrojs/check | ^0.9.9 | ^0.9.10 |
| `package.json` | catalog | @astrojs/sitemap | ^3.7.3 | ^3.7.4 |
| `package.json` | catalog | @expressive-code/plugin-line-numbers | ^0.44.0 | ^0.44.2 |
| `package.json` | catalog | @types/node | ^26.1.1 | ^26.6.5 |
| `package.json` | catalog | astro | ^7.1.1 | ^7.4.0 |
| `package.json` | catalog | astro-expressive-code | ^0.44.0 | ^0.44.2 |
| `package.json` | catalog | katex | ^0.18.0 | ^0.19.0 |
| `package.json` | catalog | mermaid | ^11.16.0 | ^12.2.0 |
| `package.json` | catalog | typescript | ^6.0.3 | ~6.0.3 |
| `package.json` | packageManager | bun | bun@1.3.14 | bun@1.4.4 |
| `packages\plugins\satteri\package.json` | dependencies | @astrojs/markdown-remark | ^7.2.1 | ^7.3.3 |
| `packages\plugins\satteri\package.json` | dependencies | @astrojs/mdx | ^7.0.3 | ^8.1.0 |
| `packages\plugins\satteri\package.json` | peerDependencies | astro | ^7.1.1 | ^7.4.0 |

## Build observations

Wall-clock seconds; the second of two sequential runs. These are indicative
measurements, not confidence intervals. Negative change means faster.
These original dependency-upgrade measurements precede the separate Bun tooling trial below.

| Target | Before | Upgraded serial | After selected optimization | Change | HTML paths retained |
| --- | ---: | ---: | ---: | ---: | ---: |
| packages | 55.048 | 62.510 | 62.510 | +13.56% | 202 |

Original and final HTML path sets matched. HTML is not claimed byte-identical:
syntax-highlighting spans and build metadata changed some text signatures.

Four-worker parallel prerendering was tried: 62.510s serial versus 63.212s
parallel on upgraded dependencies. It was slower and was reverted.

## Docker changes and observations

Bun base images were updated to `oven/bun:1.4.4-alpine`; Caddy references
to `caddy:2.11.7-alpine`; Dockerfile frontend to `docker/dockerfile:1.28.0`.
Dependency stages use manifest-only copies, `bun pm fetch`, a BuildKit cache
mount and `bun install --offline --frozen-lockfile`. Registry selection is configurable.
Workspace manifests are copied before fetch when required by workspace dependencies.

| Target | Before image bytes | After image bytes | Before build s | After build s | HTTP |
| --- | ---: | ---: | ---: | ---: | --- |
| packages-blog | failed baseline | 931902928 | 6.633 | 70.313 | pass |
| packages-go | failed baseline | 931360618 | 4.233 | 20.775 | pass |

Build times have different download/cache states and are not a clean-build
speedup claim. Interview-prep's baseline timed out at export before a cached retry.
Some images and memory samples grew; there was no universal performance improvement.

- packages-blog memory sample: unavailable -> 169.7MiB / 31.32GiB.
- packages-go memory sample: unavailable -> 165.3MiB / 31.32GiB.

Both packages Dockerfiles previously omitted the notebooks workspace manifest,
causing frozen-lockfile baseline failures. Copying that manifest fixed the builds.

## Bun formatter and typechecker trial

No formatter command was configured before this trial. Prettier below is a
candidate reference using the same new configuration, not a replaced existing formatter.
Initial checker and formatter comparisons show the second of two runs.
PDF follow-up checker rows show the third of three runs; its new build was run twice.

| Target | Check command | Warm seconds | Exit | Coverage / decision |
| --- | --- | ---: | ---: | --- |
| packages | `bun run check` | 69.750 | 0 | Full Astro checking retained. |
| packages | `foreach ($site in @('demo\notes','demo\notebooks','demo\blog','app\notes\go','app\blog')) { bun check --no-script -p $site }` | 1.763 | 1.0 | Plain TS only; does not cover Astro templates. Additional Astro import / dependency diagnostics; not a drop-in replacement. |
| packages | `node node_modules\prettier\bin\prettier.cjs "**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts,json,jsonc,json5,css,scss,less,html,astro,yml,yaml}" --check` | 2.858 | 1 | Same 187 files need formatting; no source rewrite. |
| packages | `bun fmt --no-script "**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts,json,jsonc,json5,css,scss,less,html,astro,yml,yaml}" --check` | 1.388 | 1 | Same 187 files need formatting; no source rewrite. |

Adopted Bun's built-in formatter as the opt-in source formatter in all ten active JavaScript projects. Prettier and its Astro plugin are retained only in the five projects that actually format Astro templates. Five projects use Bun without any formatter dependency. Formatting warning-file sets matched the reference. Sample output was identical except for equivalent simple CSS string-quote choices, which were checked with both formatters' semantic debug checks. Existing formatting debt remains; format:check is not claimed green and was not added as a new CI gate.

Adopted native checking as PDF Studio's build gate after source-coverage and negative-error tests. Added optional TS-only commands to homepage and both slides projects. Kept Astro checking everywhere: a controlled template error was rejected by Astro and missed by Bun.

### packages

Did not replace Astro checking with Bun's native checker: the native trial reported non-equivalent Astro import/dependency diagnostics and does not check Astro templates. No mandatory failing native-check script was introduced. The existing Astro check remains the supported full-project command.

- Added `format: bun fmt --no-script` and `format:check: bun fmt --no-script --check`.
- Added source-formatting configuration and exclusions; authored content and generated assets are not reformatted.
- Astro fallback devDependency `prettier`: (none) -> 3.9.10.
- Astro fallback devDependency `prettier-plugin-astro`: (none) -> 1.1.1.
- Observed output-only style difference: Bun keeps double quotes for some simple CSS custom-property strings despite singleQuote. The strings have identical values, both semantic debug checks passed, and this output was not applied to source.

Native checker examples (trial diagnostics, not new supported check gates):

- `node_modules/astro-expressive-code/components/index.ts(17,21): error TS2352: Conversion of type '(props: Record<string, unknown>) => unknown' to type 'Component<CodeProps>' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.`
- `packages/plugins/satteri/src/index.ts(46,7): error TS2322: Type 'number' is not assignable to type 'string'.`
- `packages/notes-core/src/utils/docs.ts(306,3): error TS2322: Type '{ id: string; label: string; description: string | undefined; author: string | undefined; group: string | undefined; cover: string | undefined; coverImage: unknown; card: "book" | "standard"; badge: string | undefined; href: string; order: number; }[]' is not assignable to type 'Notebook[]'.`
- `packages/components/src/mdx.ts(23,18): error TS2307: Cannot find module './Icon.astro' or its corresponding type declarations.`
- `packages/components/src/mdx.ts(24,22): error TS2307: Cannot find module './DocImage.astro' or its corresponding type declarations.`
- `packages/components/src/mdx.ts(25,21): error TS2307: Cannot find module './MdImage.astro' or its corresponding type declarations.`

Formatting is opt-in; no whole-repository formatting rewrite was performed.
Existing formatting debt is reported, not silently fixed or ignored.
Authored Markdown/MDX, content, public/generated assets, research sources and
nested submodules are excluded from source formatting. Where present, Astro templates
use Prettier 3.9.10 with prettier-plugin-astro 1.1.1 through Bun's fallback.
Formatting does not replace linting. Astro applications retain their template checks.

## Validation and existing failures

- `packages / test`: passed.
- `packages / check`: passed.

## Compatibility and reproduction

Astro Check requires compatible TypeScript 6.0.3; PDF Studio uses TypeScript 7.0.2.
All ten original upgraded builds and frozen installs passed; all nine Docker
runtime smoke checks and eight Compose configurations passed.
Do not compare Bun's plain TS/TSX checker speed with Astro checking as equal coverage.
A faster command is not adopted as a replacement if it drops template diagnostics.

Original build measurements: `bun install --frozen-lockfile`, then two sequential
`bun run build` executions with Bun 1.4.3 before / Bun 1.4.4 after.
Use the exact before/after manifests and locks; checking out the baseline commit
alone does not recreate pre-existing dirty work used in the original measurement.

References:
- https://astro.build/blog/astro-740/
- https://bun.sh/blog/bun-v1.4.4
- https://bun.sh/docs/format
- https://bun.sh/docs/runtime/check
