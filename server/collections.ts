import path from 'node:path';
import { Router } from 'express';

import { JsonStore, nextCollectionId, StoreValidationError } from './store';
import type { JsonDocumentStore } from './jsonDocumentStore';
import { isRecord, validateShape, type Shape } from './validation';
import {
  ALERT_CATEGORIES,
  COMMUNITY_CATEGORIES,
} from '../src/types';
import {
  SEED_ALERTS,
  SEED_ANNOUNCEMENTS,
  SEED_DISCUSSIONS,
  SEED_DOCUMENTS,
  SEED_EVENTS,
  SEED_POLLS,
  SEED_PROJECTS,
} from '../src/data/seed';
import {
  SEED_ENGAGEMENTS,
  SEED_RATINGS,
  SEED_RESOLUTIONS,
  SEED_THREADS,
} from '../src/data/seedReports';

export interface CollectionConfig {
  prefix: string;
  shape: Shape;
  allowCustomId?: boolean;
  seed?: () => unknown[];
}

const COMMENT_SHAPE: Shape = {
  id: { kind: 'string', max: 40 },
  author: { kind: 'string', max: 80 },
  text: { kind: 'string', max: 2000 },
  at: { kind: 'string', max: 80 },
};

const MESSAGE_SHAPE: Shape = {
  id: { kind: 'string', max: 40 },
  from: { kind: 'enum', values: ['resident', 'municipality'] },
  author: { kind: 'string', max: 80 },
  text: { kind: 'string', max: 2000 },
  at: { kind: 'string', max: 80 },
};

/** Ticket-keyed records reuse the ticket id, e.g. "#CF-45821". */
const TICKET_KEYED = true;

export const COLLECTION_CONFIGS: Record<string, CollectionConfig> = {
  alerts: {
    prefix: 'AL',
    shape: {
      level: { kind: 'enum', values: ['emergency', 'important', 'info'] },
      title: { kind: 'string', max: 160 },
      body: { kind: 'string', max: 2000 },
      category: { kind: 'enum', values: ALERT_CATEGORIES },
      area: { kind: 'string', max: 120 },
      createdAt: { kind: 'string', max: 80 },
      active: { kind: 'boolean' },
    },
    seed: () => SEED_ALERTS,
  },
  announcements: {
    prefix: 'AN',
    shape: {
      municipality: { kind: 'string', max: 120 },
      title: { kind: 'string', max: 200 },
      body: { kind: 'string', max: 4000 },
      date: { kind: 'string', max: 60 },
      category: { kind: 'enum', values: COMMUNITY_CATEGORIES },
      verified: { kind: 'boolean' },
    },
    seed: () => SEED_ANNOUNCEMENTS,
  },
  discussions: {
    prefix: 'DS',
    shape: {
      title: { kind: 'string', max: 200 },
      body: { kind: 'string', max: 5000 },
      category: { kind: 'enum', values: COMMUNITY_CATEGORIES },
      author: { kind: 'string', max: 80 },
      area: { kind: 'string', max: 120 },
      createdAt: { kind: 'string', max: 60 },
      photos: { kind: 'array', of: { kind: 'photo' }, maxItems: 6, optional: true },
      votes: { kind: 'number', min: 0, max: 1_000_000, integer: true },
      comments: { kind: 'array', of: { kind: 'object', fields: COMMENT_SHAPE }, maxItems: 300 },
    },
    seed: () => SEED_DISCUSSIONS,
  },
  polls: {
    prefix: 'PL',
    shape: {
      question: { kind: 'string', max: 300 },
      options: {
        kind: 'array',
        of: {
          kind: 'object',
          fields: {
            id: { kind: 'string', max: 40 },
            label: { kind: 'string', max: 160 },
            votes: { kind: 'number', min: 0, integer: true },
          },
        },
        maxItems: 8,
      },
      createdAt: { kind: 'string', max: 60 },
      active: { kind: 'boolean' },
    },
    seed: () => SEED_POLLS,
  },
  events: {
    prefix: 'EV',
    shape: {
      title: { kind: 'string', max: 200 },
      kind: { kind: 'string', max: 80 },
      date: { kind: 'string', max: 60 },
      time: { kind: 'string', max: 60 },
      location: { kind: 'string', max: 200 },
      description: { kind: 'string', max: 2000 },
    },
    seed: () => SEED_EVENTS,
  },
  documents: {
    prefix: 'DC',
    shape: {
      title: { kind: 'string', max: 200 },
      category: { kind: 'string', max: 80 },
      description: { kind: 'string', max: 3000 },
      publishedAt: { kind: 'string', max: 60 },
      municipality: { kind: 'string', max: 120 },
      pages: { kind: 'number', min: 0, integer: true },
    },
    seed: () => SEED_DOCUMENTS,
  },
  projects: {
    prefix: 'PJ',
    shape: {
      name: { kind: 'string', max: 200 },
      category: { kind: 'string', max: 80 },
      percent: { kind: 'number', min: 0, max: 100 },
      budget: { kind: 'string', max: 60 },
      start: { kind: 'string', max: 60 },
      expectedEnd: { kind: 'string', max: 60 },
      location: { kind: 'string', max: 200 },
      updates: {
        kind: 'array',
        of: {
          kind: 'object',
          fields: {
            date: { kind: 'string', max: 60 },
            text: { kind: 'string', max: 600 },
          },
        },
        maxItems: 50,
      },
    },
    seed: () => SEED_PROJECTS,
  },
  threads: {
    prefix: 'TH',
    allowCustomId: TICKET_KEYED,
    shape: {
      messages: { kind: 'array', of: { kind: 'object', fields: MESSAGE_SHAPE }, maxItems: 300 },
    },
    seed: () => SEED_THREADS,
  },
  engagements: {
    prefix: 'EN',
    allowCustomId: TICKET_KEYED,
    shape: {
      affected: { kind: 'number', min: 0, max: 1_000_000, integer: true },
      confirmations: { kind: 'array', of: { kind: 'string', max: 80 }, maxItems: 50_000 },
    },
    seed: () => SEED_ENGAGEMENTS,
  },
  resolutions: {
    prefix: 'RS',
    allowCustomId: TICKET_KEYED,
    shape: {
      before: { kind: 'photo' },
      after: { kind: 'photo' },
      note: { kind: 'string', max: 1000, optional: true },
      at: { kind: 'string', max: 80 },
      residentConfirmed: { kind: 'boolean', optional: true },
    },
    seed: () => SEED_RESOLUTIONS,
  },
  ratings: {
    prefix: 'RT',
    allowCustomId: TICKET_KEYED,
    shape: {
      stars: { kind: 'number', min: 1, max: 5, integer: true },
      comment: { kind: 'string', max: 1000, optional: true },
      at: { kind: 'string', max: 80 },
    },
    seed: () => SEED_RATINGS,
  },
};

export type CollectionStores = Map<string, JsonStore<any>>;

/** Resolves a registered collection store, failing fast when it is missing. */
export function requireStore(stores: CollectionStores, name: string): JsonStore<any> {
  const store = stores.get(name);
  if (!store) {
    throw new Error(`Collection "${name}" is not registered.`);
  }
  return store;
}

function hasUsableId(value: unknown): value is { id: string } & Record<string, unknown> {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    value.id.trim().length > 0 &&
    value.id.length <= 40
  );
}

export function createStores(
  dataDirectory: string,
  seedEnabled: boolean,
  documentStore?: JsonDocumentStore
): CollectionStores {
  const stores: CollectionStores = new Map();

  for (const [name, config] of Object.entries(COLLECTION_CONFIGS)) {
    stores.set(
      name,
      new JsonStore<any>({
        file: path.join(dataDirectory, 'collections', `${name}.json`),
        validate: (value) =>
          hasUsableId(value) && validateShape(value, config.shape),
        seed: seedEnabled && config.seed ? config.seed : undefined,
        documentStore,
        documentKey: `collection:${name}`,
      })
    );
  }

  return stores;
}

function configFor(name: string): CollectionConfig | undefined {
  return COLLECTION_CONFIGS[name];
}

export function createCollectionsRouter(stores: CollectionStores): Router {
  const router = Router();

  router.get('/:name', async (request, response, next) => {
    try {
      const store = stores.get(request.params.name);
      if (!store) {
        response.status(404).json({ error: 'Unknown collection.' });
        return;
      }
      response.json(await store.list());
    } catch (error) {
      next(error);
    }
  });

  router.post('/:name', async (request, response, next) => {
    try {
      const name = request.params.name;
      const config = configFor(name);
      const store = stores.get(name);
      if (!config || !store) {
        response.status(404).json({ error: 'Unknown collection.' });
        return;
      }
      if (!isRecord(request.body)) {
        response.status(400).json({ error: 'Request body must contain a JSON object.' });
        return;
      }

      const providedId =
        typeof request.body.id === 'string' && request.body.id.trim().length > 0
          ? request.body.id.trim()
          : undefined;

      if (config.allowCustomId) {
        if (!providedId) {
          response.status(400).json({ error: 'This collection requires a ticket id.' });
          return;
        }
        const { id: _id, ...rest } = request.body;
        if (!validateShape(rest, config.shape)) {
          response.status(400).json({ error: 'The submitted record is not valid.' });
          return;
        }
        const existing = await store.list();
        const replaced = existing.some((item) => item.id === providedId);
        response.status(replaced ? 200 : 201).json(await store.upsert(providedId, rest));
        return;
      }

      if (providedId) {
        response.status(400).json({ error: 'Ids are assigned by the server.' });
        return;
      }
      if (!validateShape(request.body, config.shape)) {
        response.status(400).json({ error: 'The submitted record is not valid.' });
        return;
      }
      const created = await store.create(request.body, (items) =>
        nextCollectionId(config.prefix, items)
      );
      response.status(201).json(created);
    } catch (error) {
      next(error);
    }
  });

  router.patch('/:name/:id', async (request, response, next) => {
    try {
      const store = stores.get(request.params.name);
      if (!store) {
        response.status(404).json({ error: 'Unknown collection.' });
        return;
      }
      if (!isRecord(request.body)) {
        response.status(400).json({ error: 'Request body must contain a JSON object.' });
        return;
      }
      const updated = await store.patch(request.params.id, request.body);
      if (!updated) {
        response.status(404).json({ error: 'Record not found.' });
        return;
      }
      response.json(updated);
    } catch (error) {
      next(error);
    }
  });

  router.delete('/:name/:id', async (request, response, next) => {
    try {
      const store = stores.get(request.params.name);
      if (!store) {
        response.status(404).json({ error: 'Unknown collection.' });
        return;
      }
      const removed = await store.remove(request.params.id);
      if (!removed) {
        response.status(404).json({ error: 'Record not found.' });
        return;
      }
      response.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  router.use(
    (error: unknown, _request: any, response: any, next: (err?: unknown) => void) => {
      if (error instanceof StoreValidationError) {
        response.status(400).json({ error: error.message });
        return;
      }
      next(error);
    }
  );

  return router;
}
