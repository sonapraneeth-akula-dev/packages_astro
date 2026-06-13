---
title: 'Designing Accessible Color Tokens'
description: 'A dedicated text-accent token per theme is the trick to passing WCAG AA contrast without dulling your brand color.'
pubDate: 2026-05-26
category: 'Design'
tags: ['accessibility', 'design', 'css']
cover: '🎨'
---

Your brand accent is often perfect for borders and backgrounds but too light for
small text. The fix is a separate, contrast-tuned token.

## The contrast problem

Lighthouse flags any text below 4.5:1 (normal) or 3:1 (large or bold). A light
indigo that looks great as a button background can fail badly as 14px link text.

## A dedicated text-accent token

Create a `--accent-text` variable tuned per theme — darker in light mode, lighter
in dark mode — and use it everywhere you render small accent-colored text.

## Make overrides explicit

Support all three states: system preference, explicit light and explicit dark.
That way the color is always correct regardless of how the theme was chosen.
