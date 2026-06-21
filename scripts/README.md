# Shared site scripts

Project-agnostic tooling for any [`@sonapraneeth/notes-core`](../packages/notes-core)
site (books, docs, papers, …). These are synced into a consuming repo via the
sparse git submodule and invoked from its `package.json`, passing project
values as CLI args. Run every script from the **consuming repo's root** (paths
like `content/`, `public/`, `Caddyfile` are resolved relative to the cwd).

| Script | Purpose | Project-specific args |
| --- | --- | --- |
| `dev-server.ts` | Watchdog around `astro dev` (auto-restart + new-file/config re-scan). | `--port <n>` (falls back to `PORT` env) |
| `watch-content.ts` | Rebuild the Pagefind index on content changes. | — (cwd-relative) |
| `docker-compose.ts` | `docker compose` wrapper that injects git commit/branch metadata. | — (forwards all args) |
| `compress-images.ts` | Losslessly optimise images in place via `Bun.Image`. | `[path]` (default `content`) |
| `generate-pwa-icons.js` | Emit the PWA icon set into `public/`. | — (cwd-relative) |
| `setup-hosts.ps1` | Map a site's environment hostnames to a loopback IP (Windows hosts file). | `-Brand`, `-Domain`, `-LoopbackIp`, `[-Environments]`, `[-Remove]` |
| `setup-certs.ps1` | Trust the Caddy local CA for a site's HTTPS URLs. | `-Brand`, `-Domain`, `[-Environments]`, `[-CaddyContainer]`, `[-Remove]` |

`setup-hosts.ps1` / `setup-certs.ps1` require an elevated (Administrator)
PowerShell session.

> The submodule bootstrap (`sync-submodule.ps1`) intentionally lives in each
> consuming repo, not here — it is what fetches this submodule, so it cannot
> depend on the submodule being present.

## Example (package.json)

```jsonc
{
  "scripts": {
    "dev:serve": "bun run dependencies/packages_astro/scripts/dev-server.ts --port 4311",
    "hosts:setup": "pwsh -NoProfile -ExecutionPolicy Bypass -File dependencies/packages_astro/scripts/setup-hosts.ps1 -Brand books -Domain books.sonapraneeth.in -LoopbackIp 127.0.1.3",
    "certs:setup": "pwsh -NoProfile -ExecutionPolicy Bypass -File dependencies/packages_astro/scripts/setup-certs.ps1 -Brand books -Domain books.sonapraneeth.in"
  }
}
```
