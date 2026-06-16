import { mergeMdxComponents } from '@sonapraneeth/blog-core/components/mdx';

/**
 * The component map injected into every post via <Content components={...} />.
 * It is the shared blog-core set plus this site's own components (none yet).
 */
export const components = mergeMdxComponents({});
