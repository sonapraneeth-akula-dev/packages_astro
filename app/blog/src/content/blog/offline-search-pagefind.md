---
title: 'Offline-First Search with Pagefind'
description: 'Add a fully client-side search index that is generated at build time and works without any server round-trips.'
pubDate: 2026-05-19
category: 'Engineering'
tags: ['search', 'pagefind', 'performance']
cover: '🔎'
---

Search does not need a server. Pagefind indexes your static output at build time
and ships a tiny client that downloads only the index fragments it needs.

## How it works

After the site builds, a CLI walks the generated HTML and produces a chunked
index. The browser fetches just the fragments relevant to a query, so the
initial payload stays tiny.

## Indexing the right content

Mark the main article region as the searchable body and exclude navigation and
tag lists, so results point at real content rather than chrome.

## Offline by design

Once the page has loaded, search runs entirely in the browser. There are no API
calls, which keeps it fast, private and resilient.
