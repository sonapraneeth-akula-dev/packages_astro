import { docsCollection } from '@grihasetu/notes-core/content';

export const collections = {
  // Notes live in the top-level `content/` directory (outside `src/`).
  docs: docsCollection('./content'),
};
