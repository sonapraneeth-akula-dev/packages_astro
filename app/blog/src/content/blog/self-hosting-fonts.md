---
title: 'Self-Hosting Fonts for a Perfect First Paint'
description: 'Removing third-party font origins from the critical path is the single highest-leverage performance win. Here is how to do it at build time.'
pubDate: 2026-06-02
category: 'Performance'
tags: ['fonts', 'performance', 'astro']
cover: '🅰'
---

Loading fonts from a third-party CDN adds two extra origins to your critical
render path: DNS, TLS and a CSS fetch all happen *before* the first byte of the
font. Self-hosting fixes this in one move.

## Why it matters

Every extra origin delays first contentful paint and is the leading cause of
layout shift from font swaps. Bringing the files in-house removes the round trips
entirely.

## Do it at build time

A static build can download the font files, emit `@font-face` rules, generate
metric-matched fallbacks (which eliminate layout shift) and fingerprint the
files for long-term caching.

## Keep the payload lean

Declare only the weights you use, ship a single variable range where possible,
synthesize italics, and subset to just the characters you render. The result:
fewer, smaller files and a flat, fast first paint.
