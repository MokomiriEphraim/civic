import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { JsonDocumentStore } from './jsonDocumentStore';

export interface JsonStoreOptions<T> {
  file: string;
  validate: (value: unknown) => boolean;
  seed?: () => T[];
  documentStore?: JsonDocumentStore;
  documentKey?: string;
}

/**
 * A single JSON array file with an in-process cache, a serialized write queue
 * and atomic temp-file + rename persistence. Same guarantees as the report store.
 */
export class JsonStore<T extends { id: string }> {
  private cache: T[] | undefined;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly options: JsonStoreOptions<T>) {}

  get file(): string {
    return this.options.file;
  }

  async list(): Promise<T[]> {
    if (this.options.documentStore) {
      return (await this.readRemoteItems()).items;
    }
    if (this.cache) return this.cache;

    try {
      const contents = await readFile(this.options.file, 'utf8');
      const parsed: unknown = JSON.parse(contents);
      if (!Array.isArray(parsed) || !parsed.every(this.options.validate)) {
        throw new Error(`Data at ${this.options.file} has an invalid format.`);
      }
      this.cache = parsed;
    } catch (error) {
      if (isEnoent(error)) {
        this.cache = this.options.seed ? this.options.seed() : [];
        return this.cache;
      }
      throw error;
    }

    return this.cache;
  }

  async get(id: string): Promise<T | undefined> {
    return (await this.list()).find((item) => item.id === id);
  }

  async create(
    body: Record<string, unknown>,
    makeId: (existing: T[]) => string
  ): Promise<T> {
    return this.mutate((items) => {
      const created = { ...body, id: makeId(items) } as T;
      if (!this.options.validate(created)) {
        throw new StoreValidationError('The submitted record is not valid.');
      }
      return { items: [created, ...items], result: created, changed: true };
    });
  }

  async upsert(id: string, body: Record<string, unknown>): Promise<T> {
    return this.mutate((items) => {
      const candidate = { ...body, id } as T;
      if (!this.options.validate(candidate)) {
        throw new StoreValidationError('The submitted record is not valid.');
      }
      const index = items.findIndex((item) => item.id === id);
      const next = [...items];
      if (index === -1) next.unshift(candidate);
      else next[index] = candidate;
      return { items: next, result: candidate, changed: true };
    });
  }

  async update(id: string, update: (current: T | undefined) => T | undefined): Promise<T | undefined> {
    return this.mutate((items) => {
      const index = items.findIndex((item) => item.id === id);
      const current = index === -1 ? undefined : items[index];
      const candidate = update(current);
      if (!candidate || candidate === current) {
        return { items, result: candidate, changed: false };
      }
      if (candidate.id !== id || !this.options.validate(candidate)) {
        throw new StoreValidationError('The updated record is not valid.');
      }

      const next = [...items];
      if (index === -1) next.unshift(candidate);
      else next[index] = candidate;
      return { items: next, result: candidate, changed: true };
    });
  }

  async patch(id: string, changes: Record<string, unknown>): Promise<T | undefined> {
    return this.mutate((items) => {
      const index = items.findIndex((item) => item.id === id);
      if (index === -1) return { items, result: undefined, changed: false };

      const candidate = { ...items[index], ...changes } as T;
      if (!this.options.validate(candidate)) {
        throw new StoreValidationError('The updated record is not valid.');
      }
      const next = [...items];
      next[index] = candidate;
      return { items: next, result: candidate, changed: true };
    });
  }

  async remove(id: string): Promise<boolean> {
    return this.mutate((items) => {
      const next = items.filter((item) => item.id !== id);
      const changed = next.length !== items.length;
      return { items: changed ? next : items, result: changed, changed };
    });
  }

  private async mutate<R>(
    operation: (items: T[]) => { items: T[]; result: R; changed: boolean }
  ): Promise<R> {
    const documentStore = this.options.documentStore;
    if (documentStore) {
      const key = this.documentKey();
      for (let attempt = 0; attempt < 32; attempt += 1) {
        const document = await this.readRemoteItems();
        const mutation = operation(document.items);
        if (!mutation.changed) return mutation.result;
        if (
          await documentStore.compareAndSet(
            key,
            document.revision,
            mutation.items
          )
        ) {
          return mutation.result;
        }
      }
      throw new Error(`Concurrent updates prevented saving document "${key}".`);
    }

    return this.enqueue(async () => {
      const mutation = operation(await this.list());
      if (mutation.changed) await this.persist(mutation.items);
      return mutation.result;
    });
  }

  private async readRemoteItems(): Promise<{ items: T[]; revision: number | null }> {
    const store = this.options.documentStore;
    if (!store) throw new Error('Remote document storage is not configured.');
    const key = this.documentKey();

    for (let attempt = 0; attempt < 12; attempt += 1) {
      const document = await store.read<unknown>(key);
      if (document) {
        if (!Array.isArray(document.value) || !document.value.every(this.options.validate)) {
          throw new Error(`Data for document "${key}" has an invalid format.`);
        }
        return { items: document.value, revision: document.revision };
      }

      const seed = this.options.seed?.() ?? [];
      if (seed.length === 0) return { items: seed, revision: null };
      if (await store.compareAndSet(key, null, seed)) {
        return { items: seed, revision: 1 };
      }
    }

    throw new Error(`Could not initialize document "${key}" after concurrent writes.`);
  }

  private documentKey(): string {
    const key = this.options.documentKey;
    if (!key) throw new Error('Remote document storage requires a document key.');
    return key;
  }

  private enqueue<R>(operation: () => Promise<R>): Promise<R> {
    const result = this.queue.then(operation);
    this.queue = result.then(
      () => undefined,
      () => undefined
    );
    return result;
  }

  private async persist(next: T[]): Promise<void> {
    await mkdir(path.dirname(this.options.file), { recursive: true });
    const temporary = `${this.options.file}.${process.pid}.${randomUUID()}.tmp`;
    try {
      await writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`, {
        encoding: 'utf8',
        flag: 'wx',
      });
      await rename(temporary, this.options.file);
    } catch (error) {
      try {
        await unlink(temporary);
      } catch (cleanupError) {
        console.error('Could not remove temporary file:', cleanupError);
      }
      throw error;
    }
    this.cache = next;
  }
}

export class StoreValidationError extends Error {}

function isEnoent(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: string }).code === 'ENOENT'
  );
}

export function nextCollectionId(prefix: string, items: { id: string }[]): string {
  const used = new Set(items.map((item) => item.id));
  let counter = 100 + items.length;
  let id = `${prefix}-${counter}`;
  while (used.has(id)) {
    counter += 1;
    id = `${prefix}-${counter}`;
  }
  return id;
}
