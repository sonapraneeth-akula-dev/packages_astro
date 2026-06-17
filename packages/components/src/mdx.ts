/**
 * Shared MDX component map used by both the notes and blog engines.
 *
 * These are the dependency-free UI components (no engine-specific integrations
 * such as expressive-code). Each engine re-exports these from its own
 * `components/mdx` entrypoint and merges in its additions (e.g. the `Code`
 * block) via {@link baseMdxComponents}.
 *
 * Markdown images (`![alt](src)`) are auto-upgraded to optimized, lazy/async
 * output through the `img` mapping for high Lighthouse scores.
 */
import Callout from './Callout.astro';
import Annotation from './Annotation.astro';
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

export {
  Callout,
  Annotation,
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
};

/** Dependency-free UI components auto-injected into every note/post. */
export const baseMdxComponents = {
  Callout,
  Annotation,
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
  // Upgrade plain Markdown images to lazy/async, optimized output.
  img: MdImage,
};
