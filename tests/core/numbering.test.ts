import { describe, expect, it } from 'bun:test';
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  buildNumberingMap,
  contentEntryId,
} from '../../packages/components/src/numbering.ts';

describe('contentEntryId', () => {
  it('matches Astro-style path slug normalization', () => {
    expect(contentEntryId('Guides/Getting Started.mdx')).toBe(
      'guides/getting-started',
    );
    expect(contentEntryId('API & HTTP/index.md')).toBe('api--http');
  });

  it('normalizes an explicit frontmatter slug', () => {
    expect(contentEntryId('ignored.mdx', '/Custom/Path/')).toBe('Custom/Path');
  });
});

describe('buildNumberingMap', () => {
  it('uses normalized ids, custom slugs, and route prefixes', () => {
    const contentDir = mkdtempSync(path.join(tmpdir(), 'numbering-'));
    try {
      writeFileSync(
        path.join(contentDir, 'Getting Started.mdx'),
        `---\nslug: custom/topic\n---\n\n## Intro\n\n<Algorithm id="search" />\n`,
      );
      mkdirSync(path.join(contentDir, 'API & HTTP'));
      writeFileSync(
        path.join(contentDir, 'API & HTTP', 'index.md'),
        `---\ntitle: API\n---\n\n<Listing id="request" />\n`,
      );

      const { byId } = buildNumberingMap(contentDir, '/blog');

      expect(byId.search).toMatchObject({
        number: '1.1',
        url: '/blog/custom/topic',
        type: 'Algorithm',
      });
      expect(byId.request).toMatchObject({
        number: '1',
        url: '/blog/api--http',
        type: 'Listing',
      });
    } finally {
      rmSync(contentDir, { recursive: true, force: true });
    }
  });
});
