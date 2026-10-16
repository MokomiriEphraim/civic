import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { JsonDocument, JsonDocumentStore } from '../server/jsonDocumentStore';
import { JsonStore, nextCollectionId } from '../server/store';

class MemoryJsonDocumentStore implements JsonDocumentStore {
  private readonly documents = new Map<string, JsonDocument>();

  async read<T>(key: string): Promise<JsonDocument<T> | null> {
    const document = this.documents.get(key);
    return document
      ? { revision: document.revision, value: structuredClone(document.value) as T }
      : null;
  }

  async compareAndSet<T>(
    key: string,
    expectedRevision: number | null,
    value: T
  ): Promise<boolean> {
    const current = this.documents.get(key);
    if ((current?.revision ?? null) !== expectedRevision) return false;
    this.documents.set(key, {
      revision: (current?.revision ?? 0) + 1,
      value: structuredClone(value),
    });
    return true;
  }
}

interface TestRecord {
  id: string;
  value: number;
}

function createRemoteStore(documents: JsonDocumentStore, key: string): JsonStore<TestRecord> {
  return new JsonStore<TestRecord>({
    file: `${key}.json`,
    documentStore: documents,
    documentKey: key,
    validate: (value): value is TestRecord =>
      typeof value === 'object' &&
      value !== null &&
      'id' in value &&
      typeof value.id === 'string' &&
      'value' in value &&
      typeof value.value === 'number',
  });
}

test('remote JSON stores retry revision conflicts without dropping concurrent records', async () => {
  const documents = new MemoryJsonDocumentStore();
  const stores = Array.from({ length: 8 }, (_, index) =>
    createRemoteStore(documents, `collection-${index}`)
  );

  await Promise.all(
    stores.map((store, index) =>
      store.create({ value: index }, (records) => nextCollectionId('CT', records))
    )
  );

  const persisted = await documents.read<TestRecord[]>('collection-0');
  assert.equal(persisted?.value.length, 1);

  const store = createRemoteStore(documents, 'shared');
  await Promise.all(
    Array.from({ length: 24 }, (_, index) =>
      store.create({ value: index }, (records) => nextCollectionId('CT', records))
    )
  );

  const records = await store.list();
  assert.equal(records.length, 24);
  assert.equal(new Set(records.map((record) => record.id)).size, 24);
});

test('remote JSON store initializes configured seeds only once', async () => {
  const documents = new MemoryJsonDocumentStore();
  const options = {
    file: 'seeded.json',
    documentStore: documents,
    documentKey: 'seeded',
    validate: (value: unknown): value is TestRecord =>
      typeof value === 'object' &&
      value !== null &&
      'id' in value &&
      typeof value.id === 'string' &&
      'value' in value &&
      typeof value.value === 'number',
    seed: () => [{ id: 'seed', value: 1 }],
  };
  const first = new JsonStore(options);
  const second = new JsonStore(options);

  const [firstList, secondList] = await Promise.all([first.list(), second.list()]);
  assert.deepEqual(firstList, [{ id: 'seed', value: 1 }]);
  assert.deepEqual(secondList, [{ id: 'seed', value: 1 }]);
  assert.equal((await documents.read<TestRecord[]>('seeded'))?.revision, 1);
});
