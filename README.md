# @sonapraneeth/notes

Grihasetu docs/notes platform — a static MDX docs engine (Astro + MDX) split
into a shared core, a feature demo and real note apps.

Managed with [Bun](https://bun.sh) workspaces. See `package.json` for the full
list of workspaces and scripts.

## Package registry

The default install registry is configured in [`bunfig.toml`](bunfig.toml).

It currently points at the **Microsoft CFS (Central Feed Services)** proxy:

```
https://packagefeedproxy.microsoft.io/npm/
```

This is required on **Microsoft-managed devices**, where direct access to
`registry.npmjs.org` is blocked by policy. CFS transparently proxies public
npm, so it serves the full npm catalog plus quarantine/vetting protection — no
fallback registry is needed.

### Switching back on non-Microsoft devices

When developing on a machine that is **not** a Microsoft-managed device, update
the `registry` line in [`bunfig.toml`](bunfig.toml) back to the public registry
(or remove it to use Bun's default):

```toml
[install]
registry = "https://registry.npmjs.org/"
```

Then re-run `bun install` to refresh the lockfile against the chosen registry.

## Engineering references

- [Astro production hosting on a public server](docs/astro-production-hosting.md) explains why `astro preview` is only a build verification server, how to serve static output with Caddy, when SSR needs an adapter, and the current preview-based runtime caveat.
- [Package performance and correctness improvements](docs/package-performance-and-correctness-improvements.md) records the 2026-07-27 package review, implemented optimizations, validation, known limitations, and troubleshooting guidance.
