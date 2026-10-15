import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

export interface JsonStoreOptions<T> {
  file: string;
  validate: (value: unknown) => boolean;
  seed?: () => T[];
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
    return this.enqueue(async () => {
      const items = await this.list();
      const created = { ...body, id: makeId(items) } as T;
      if (!this.options.validate(created)) {
        throw new StoreValidationError('The submitted record is not valid.');
      }
      await this.persist([created, ...items]);
      return created;
    });
  }

  async upsert(id: string, body: Record<string, unknown>): Promise<T> {
    return this.enqueue(async () => {
      const items = await this.list();
      const candidate = { ...body, id } as T;
      if (!this.options.validate(candidate)) {
        throw new StoreValidationError('The submitted record is not valid.');
      }
      const index = items.findIndex((item) => item.id === id);
      const next = [...items];
      if (index === -1) next.unshift(candidate);
      else next[index] = candidate;
      await this.persist(next);
      return candidate;
    });
  }

  async patch(id: string, changes: Record<string, unknown>): Promise<T | undefined> {
    return this.enqueue(async () => {
      const items = await this.list();
      const index = items.findIndex((item) => item.id === id);
      if (index === -1) return undefined;

      const candidate = { ...items[index], ...changes } as T;
      if (!this.options.validate(candidate)) {
        throw new StoreValidationError('The updated record is not valid.');
      }
      const next = [...items];
      next[index] = candidate;
      await this.persist(next);
      return candidate;
    });
  }

  async remove(id: string): Promise<boolean> {
    return this.enqueue(async () => {
      const items = await this.list();
      const next = items.filter((item) => item.id !== id);
      if (next.length === items.length) return false;
      await this.persist(next);
      return true;
    });
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
