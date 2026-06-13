---
title: 'Theming with CSS Custom Properties'
description: 'A single set of design tokens drives light, dark and system themes — and makes accessibility fixes apply everywhere at once.'
pubDate: 2026-04-28
category: 'Design'
tags: ['css', 'design', 'theming']
cover: '🌗'
---

Centralizing color and typography in CSS custom properties turns theming from a
chore into a one-line change.

## Tokens, not magic values

Define every color and radius as a variable. A contrast fix to one token then
ripples through every component that references it.

## Three theme states

Support system preference via `prefers-color-scheme`, plus explicit light and
dark overrides set on the root element. A tiny inline script applies the stored
choice before paint to avoid a flash.

## Prevent the flash

Read the saved theme synchronously in the document head and set the attribute
before the first paint. It is the one blocking script worth keeping.
