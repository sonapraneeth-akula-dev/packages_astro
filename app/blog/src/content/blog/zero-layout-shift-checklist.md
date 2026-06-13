---
title: 'Zero Layout Shift: A Practical Checklist'
description: 'Cumulative Layout Shift is one of the easiest Core Web Vitals to drive to zero. Here is the short list that does it.'
pubDate: 2026-05-12
category: 'Performance'
tags: ['cls', 'performance', 'css']
cover: '📐'
---

Cumulative Layout Shift punishes content that moves after it paints. Almost all
of it comes from a handful of predictable sources.

## Reserve space for media

Always set explicit `width`/`height` or an `aspect-ratio` on images, videos and
SVGs so the browser can lay them out before they load.

## Tame your fonts

Self-hosted fonts with metric-matched fallbacks remove the shift that happens
when a web font swaps in.

## Account for fixed UI

When you add a sticky header or a fixed mobile nav, pad the layout so content
never reflows underneath it.
