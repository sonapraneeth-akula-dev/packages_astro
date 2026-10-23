# Astro production hosting on a public server

**Date:** 2026-08-18  
**Scope:** Astro sites deployed to an internet-accessible machine with a domain name  
**Status:** Production guidance and current repository caveat

## Purpose

`astro preview` serves the output of `astro build` for local verification. It is
useful for checking the built site before deployment, but Astro explicitly does
not design it as a production server.

Production hosting depends on the Astro output mode:

- A static site should be built once and its `dist/` directory served directly
  by a production web server such as Caddy or Nginx.
- An SSR site should use an Astro server adapter, run the adapter's generated
  server under a process supervisor, and place Caddy or Nginx in front of it.

The packages in this repository currently produce static sites, including the
Pagefind index, so direct static serving is the appropriate production model.

## Public-server requirements

For a machine that is reachable from the internet:

1. Point the domain's `A` and, when applicable, `AAAA` DNS records at the
   machine's public address.
2. Allow inbound TCP traffic on ports 80 and 443 through the host and provider
   firewalls.
3. Run `astro build` and any post-build indexing step, such as Pagefind.
4. Serve the generated `dist/` directory with Caddy or Nginx.
5. Run the web server through systemd, Docker with a restart policy, or another
   process supervisor.
6. Persist Caddy's data directory so issued TLS certificates survive restarts.

Caddy can obtain and renew public TLS certificates automatically when the
domain resolves to the server and the site block does not use `tls internal`.

## Static deployment with Caddy

A static Astro site needs no Node, Bun, or Astro process at runtime:

```caddyfile
notes.example.com {
	root * /srv/notes/dist
	encode zstd gzip
	try_files {path} {path}/ {path}.html /404.html
	file_server
}
```

The matching deployment flow is:

```text
source code -> astro build -> Pagefind indexing -> dist/ -> Caddy
```

For Docker, use a multi-stage image. The build stage contains Bun and Astro;
the final image contains only Caddy and the copied build output:

```dockerfile
FROM oven/bun:1.3.14-alpine AS build
WORKDIR /app
# Copy workspace manifests and source using the repository's existing pattern.
RUN bun install --frozen-lockfile
RUN bun run build

FROM caddy:2.11-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
```

In a container, the Caddy root would point at `/srv`. Expose Caddy on ports 80
and 443 rather than exposing an Astro preview port.

## SSR deployment

SSR is required only when a site performs request-time rendering or has
server-side endpoints, sessions, or similar runtime behavior. Configure an
adapter such as `@astrojs/node`, build the site, and run the generated server.
Caddy should terminate TLS and reverse-proxy to that private process:

```caddyfile
app.example.com {
	encode zstd gzip
	reverse_proxy 127.0.0.1:4321
}
```

The generated server should bind to loopback or a private container network and
run under a supervisor with restart, health-check, and logging policies. Do not
substitute `astro preview` for the adapter-generated server.

## Role of `astro preview`

Keep `astro preview` in the development workflow as a smoke test after a full
build. It is appropriate for local inspection and can be useful in a temporary
test or pre-production environment, but it should not be the public production
runtime.

The current `app/blog/Dockerfile` runtime target and the corresponding `prod`
Compose service run `bun run preview` behind Caddy. They therefore demonstrate
the routing and environment layout, but do not yet implement the static
production model described above. A future deployment change should replace
that runtime target with a Caddy static image containing `dist/`; this document
records the requirement without changing the current deployment files.

## References

- [Astro CLI: `astro preview`](https://docs.astro.build/en/reference/cli-reference/#astro-preview)
- [Astro deployment guide](https://docs.astro.build/en/guides/deploy/)
- [Caddy static files quick start](https://caddyserver.com/docs/quick-starts/static-files)
- [Caddy automatic HTTPS](https://caddyserver.com/docs/automatic-https)