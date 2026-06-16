import { docsCollection } from '@sonapraneeth/notes-core/content';

export const collections = {
  // Notes live in the top-level `content/` directory (outside `src/`).
  docs: docsCollection('./content'),
};
