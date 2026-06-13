---
title: 'Auditing Every Route with Unlighthouse'
description: 'Stop spot-checking single pages. Audit your whole site, in light and dark mode, against production-like infrastructure.'
pubDate: 2026-04-21
category: 'Engineering'
tags: ['lighthouse', 'performance', 'ci']
cover: '🚦'
---

A single Lighthouse run on your homepage tells you almost nothing about the rest
of the site. Audit every route instead.

## Scan all routes

Point the tool at your sitemap and let it crawl every page in one pass. Now a
regression on a deep tag page can't hide.

## Audit both themes

Emulate `prefers-color-scheme: dark` so contrast failures that only appear in one
theme get caught.

## Test the real output

Audit the built output behind your actual reverse proxy. Dev servers disable
compression and caching, giving misleadingly low scores.
