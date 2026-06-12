/**
 * Shared MDX components for docs/notes.
 *
 * Two ways to use them in a note:
 *
 * 1. Auto-mapped (no import) — these names are passed to <Content /> on the doc
 *    page, so you can write <Callout>, <Tabs>, <Card>, <DocImage>, … directly.
 *    Markdown images (`![alt](src)`) are auto-upgraded to lazy/async via the
 *    `img` mapping for high Lighthouse scores.
 *
 * 2. Explicit import:
 *      import { Callout, Steps } from '@grihasetu/notes-core/components/mdx';
 *
 * Sites can extend the map per-site with {@link mergeMdxComponents}.
 */
import Callout from './Callout.astro';
import Tabs from './Tabs.astro';
import TabItem from './TabItem.astro';
import Card from './Card.astro';
import CardGrid from './CardGrid.astro';
import LinkCard from './LinkCard.astro';
import Badge from './Badge.astro';
import LinkButton from './LinkButton.astro';
import Steps from './Steps.astro';
import FileTree from './FileTree.astro';
import Icon from './Icon.astro';
import DocImage from './DocImage.astro';
import MdImage from './MdImage.astro';
import { Code } from 'astro-expressive-code/components';

export {
  Callout,
  Tabs,
  TabItem,
  Card,
  CardGrid,
  LinkCard,
  Badge,
  LinkButton,
  Steps,
  FileTree,
  Icon,
  DocImage,
  Code,
};

/** Components auto-injected into every note via <Content components={...} />. */
export const mdxComponents = {
  Callout,
  Tabs,
  TabItem,
  Card,
  CardGrid,
  LinkCard,
  Badge,
  LinkButton,
  Steps,
  FileTree,
  Icon,
  DocImage,
  Code,
  // Upgrade plain Markdown images to lazy/async for performance.
  img: MdImage,
};

/** Merge site-specific components onto the shared map (site values win). */
export function mergeMdxComponents(
  extra: Record<string, unknown>,
): Record<string, unknown> {
  return { ...mdxComponents, ...extra };
}
