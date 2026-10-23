# Dependency upgrade and Bun tooling observations

Date: 2026-10-23
Repository: `notes\interview-prep\dependencies\packages_astro`
Branch: `chore/upgrade-astro-bun-2026-10` (created from local `main`)
Baseline commit: `9592133ccc3e78d0896c116883a1c7e4d3107afa`

## Scope and provenance

These observations describe the measured upgrade working tree, not a released version.
This documentation commit does not commit the dependency, Docker, formatter, or
typechecker edits described below. Those remain separate working-tree changes.
Pre-existing user edits were retained. No remote submodule update or push was performed.

Before: existing dependency lockfiles, Bun 1.4.3, Node 24.20.0.
After: upgraded lockfiles and project/container Bun 1.4.4; the system Bun was not changed.
Run the new commands with Bun 1.4.4 or newer, not an older executable on PATH.

This is a sparse library submodule. Its consuming site's measurements below
are integration results, not standalone submodule build benchmarks.
Catalog dependencies resolve through the consuming site's package.json.
The local documentation commit is not a remote submodule synchronization;
the parent repository's gitlink is deliberately not staged by this task.
Run the reproduction commands from the consuming site `notes\interview-prep`, not this sparse root.

## Dependency changes

| Manifest | Section | Package | Before | After |
| --- | --- | --- | --- | --- |
| `packages\plugins\satteri\package.json` | dependencies | @astrojs/markdown-remark | ^7.3.0 | ^7.3.3 |
| `packages\plugins\satteri\package.json` | dependencies | @astrojs/mdx | ^8.0.0 | ^8.1.0 |
| `packages\plugins\satteri\package.json` | peerDependencies | astro | ^7.3.1 | ^7.4.0 |

## Build observations

Wall-clock seconds; the second of two sequential runs. These are indicative
measurements, not confidence intervals. Negative change means faster.
These original dependency-upgrade measurements precede the separate Bun tooling trial below.

| Target | Before | Upgraded serial | After selected optimization | Change | HTML paths retained |
| --- | ---: | ---: | ---: | ---: | ---: |
| notes-interview-prep | 114.759 | 111.224 | 105.239 | -8.30% | 2234 |

Original and final HTML path sets matched. HTML is not claimed byte-identical:
syntax-highlighting spans and build metadata changed some text signatures.

Four-worker experimental parallel prerendering was retained: 111.224s serial
versus 105.239s parallel on upgraded dependencies (5.38% faster).
The earlier baseline-to-final improvement (8.30%) also includes dependency changes.
`build:timings` was added. A diagnostic run took 103.125s including Pagefind;
Astro reported about 66s in prerender bundling and 10s generating pages.
Worker rendering does not parallelize the entire MDX/Vite bundling pipeline.
Only four workers were evaluated; no worker-count sweep was performed.

## Docker changes and observations

Bun base images were updated to `oven/bun:1.4.4-alpine`; Caddy references
to `caddy:2.11.7-alpine`; Dockerfile frontend to `docker/dockerfile:1.28.0`.
Dependency stages use manifest-only copies, `bun pm fetch`, a BuildKit cache
mount and `bun install --offline --frozen-lockfile`. Registry selection is configurable.
Workspace manifests are copied before fetch when required by workspace dependencies.

| Target | Before image bytes | After image bytes | Before build s | After build s | HTTP |
| --- | ---: | ---: | ---: | ---: | --- |
| notes-interview-prep | 1186163638 | 1216848740 | 45.686 | 177.931 | pass |
| notes-interview-prep-static | 388631633 | 395231589 | 24.840 | 26.409 | pass |

Build times have different download/cache states and are not a clean-build
speedup claim. Interview-prep's baseline timed out at export before a cached retry.
Some images and memory samples grew; there was no universal performance improvement.

- notes-interview-prep memory sample: 199.8MiB / 31.32GiB -> 183.2MiB / 31.32GiB.
- notes-interview-prep-static memory sample: 13.36MiB / 31.32GiB -> 14.16MiB / 31.32GiB.

## Bun formatter and typechecker trial

No formatter command was configured before this trial. Prettier below is a
candidate reference using the same new configuration, not a replaced existing formatter.
Initial checker and formatter comparisons show the second of two runs.
PDF follow-up checker rows show the third of three runs; its new build was run twice.

| Target | Check command | Warm seconds | Exit | Coverage / decision |
| --- | --- | ---: | ---: | --- |
| notes-interview-prep | `bun run check` | 16.826 | 0 | Full Astro checking retained. |
| notes-interview-prep | `bun check --no-script --timing` | 0.340 | 1 | Plain TS only; does not cover Astro templates. Additional Astro import / dependency diagnostics; not a drop-in replacement. |
| notes-interview-prep | `node ..\..\packages\node_modules\prettier\bin\prettier.cjs "**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts,json,jsonc,json5,css,scss,less,html,astro,yml,yaml}" --check` | 2.516 | 1 | Same 38 files need formatting; no source rewrite. |
| notes-interview-prep | `bun fmt --no-script "**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts,json,jsonc,json5,css,scss,less,html,astro,yml,yaml}" --check` | 0.067 | 1 | Same 38 files need formatting; no source rewrite. |

Adopted Bun's built-in formatter as the opt-in source formatter in all ten active JavaScript projects. Prettier and its Astro plugin are retained only in the five projects that actually format Astro templates. Five projects use Bun without any formatter dependency. Formatting warning-file sets matched the reference. Sample output was identical except for equivalent simple CSS string-quote choices, which were checked with both formatters' semantic debug checks. Existing formatting debt remains; format:check is not claimed green and was not added as a new CI gate.

Adopted native checking as PDF Studio's build gate after source-coverage and negative-error tests. Added optional TS-only commands to homepage and both slides projects. Kept Astro checking everywhere: a controlled template error was rejected by Astro and missed by Bun.

### notes-interview-prep

Did not replace Astro checking with Bun's native checker: the native trial reported non-equivalent Astro import/dependency diagnostics and does not check Astro templates. No mandatory failing native-check script was introduced. The existing Astro check remains the supported full-project command.

- Added `format: bun fmt --no-script` and `format:check: bun fmt --no-script --check`.
- Added source-formatting configuration and exclusions; authored content and generated assets are not reformatted.
- No formatter dependency was added: all files in this project's formatting scope use Bun natively.

Native checker examples (trial diagnostics, not new supported check gates):

- `node_modules/.bun/astro-expressive-code@0.44.2+ad5fd7099df662e8/node_modules/astro-expressive-code/components/index.ts(17,21): error TS2352: Conversion of type '(props: Record<string, unknown>) => unknown' to type 'Component<CodeProps>' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.`

Formatting is opt-in; no whole-repository formatting rewrite was performed.
Existing formatting debt is reported, not silently fixed or ignored.
Authored Markdown/MDX, content, public/generated assets, research sources and
nested submodules are excluded from source formatting. Where present, Astro templates
use Prettier 3.9.10 with prettier-plugin-astro 1.1.1 through Bun's fallback.
Formatting does not replace linting. Astro applications retain their template checks.

## Validation and existing failures

- `notes-interview-prep / check`: passed.
- `notes-interview-prep / check:mermaid`: passed.
- `notes-interview-prep / check:links`: Same pre-existing Python 3.14 documentation URL fetch failure; bot-blocked URLs remain inconclusive..
- `notes-interview-prep / check:citations`: passed.
- `notes-interview-prep / check:snippets`: passed.
- `notes-interview-prep / build:timings`: passed.
- Mermaid validation: 475/475 diagrams passed after installing the required browser.

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
