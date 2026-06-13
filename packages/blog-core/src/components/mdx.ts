/**
 * Shared MDX components.
 *
 * Two ways to use them in a post:
 *
 * 1. Auto-mapped (no import needed) — these names are passed to <Content /> on
 *    the post page, so you can write <Callout>, <Tabs>, <Card>, … directly.
 *
 * 2. Explicit import for anything custom:
 *      import { Callout, Card, Steps } from '@components/mdx';
 *
 * To register your OWN component for auto-mapping, add it to `mdxComponents`
 * below and it becomes available in every post without an import.
 */
import Callout from '@grihasetu/components/Callout.astro';
import Tabs from '@grihasetu/components/Tabs.astro';
import TabItem from '@grihasetu/components/TabItem.astro';
import Card from '@grihasetu/components/Card.astro';
import CardGrid from '@grihasetu/components/CardGrid.astro';
import LinkCard from '@grihasetu/components/LinkCard.astro';
import Badge from '@grihasetu/components/Badge.astro';
import LinkButton from '@grihasetu/components/LinkButton.astro';
import Steps from '@grihasetu/components/Steps.astro';
import FileTree from '@grihasetu/components/FileTree.astro';
import Icon from '@grihasetu/components/Icon.astro';
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
  Code,
};

/** Components auto-injected into every MDX post via <Content components={...} />. */
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
  Code,
};

/** Merge site-specific components onto the shared map (site values win). */
export function mergeMdxComponents(
  extra: Record<string, unknown>,
): Record<string, unknown> {
  return { ...mdxComponents, ...extra };
}
