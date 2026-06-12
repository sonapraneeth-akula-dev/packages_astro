import { mergeMdxComponents } from '@grihasetu/notes-core/components/mdx';
import Demo from './Demo.astro';

/**
 * The component map injected into every note via <Content components={...} />.
 * It is the shared core set plus this site's own components.
 */
export const components = mergeMdxComponents({ Demo });
