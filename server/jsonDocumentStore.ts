export interface JsonDocument<T = unknown> {
  revision: number;
  value: T;
}

export interface JsonDocumentStore {
  read<T>(key: string): Promise<JsonDocument<T> | null>;
  compareAndSet<T>(
    key: string,
    expectedRevision: number | null,
    value: T
  ): Promise<boolean>;
}

export class SupabaseJsonDocumentStore implements JsonDocumentStore {
  private readonly restUrl: string;
  private readonly headers: HeadersInit;

  constructor(
    supabaseUrl: string,
    serviceRoleKey: string,
    private readonly fetcher: typeof fetch = fetch
  ) {
    const baseUrl = new URL(supabaseUrl);
    if (baseUrl.protocol !== 'https:' && baseUrl.hostname !== 'localhost') {
      throw new Error('SUPABASE_URL must use HTTPS.');
    }
    this.restUrl = new URL('/rest/v1', baseUrl).toString();
    this.headers = {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    };
  }

  async read<T>(key: string): Promise<JsonDocument<T> | null> {
    const query = new URLSearchParams({
      key: `eq.${key}`,
      select: 'revision,value',
      limit: '1',
    });
    const response = await this.fetcher(
      `${this.restUrl}/civic_json_documents?${query.toString()}`,
      { headers: this.headers }
    );
    if (!response.ok) {
      throw new Error(`Supabase document read failed (${response.status}).`);
    }
    const rows: unknown = await response.json();
    if (!Array.isArray(rows)) {
      throw new Error('Supabase returned an invalid document response.');
    }
    if (rows.length === 0) return null;

    const row: unknown = rows[0];
    if (
      typeof row !== 'object' ||
      row === null ||
      !('revision' in row) ||
      typeof row.revision !== 'number' ||
      !Number.isSafeInteger(row.revision) ||
      !('value' in row)
    ) {
      throw new Error('Supabase returned an invalid document row.');
    }
    return { revision: row.revision, value: row.value as T };
  }

  async compareAndSet<T>(
    key: string,
    expectedRevision: number | null,
    value: T
  ): Promise<boolean> {
    const response = await this.fetcher(
      `${this.restUrl}/rpc/civic_compare_and_set_json_document`,
      {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          p_key: key,
          p_expected_revision: expectedRevision,
          p_value: value,
        }),
      }
    );
    if (!response.ok) {
      throw new Error(`Supabase document write failed (${response.status}).`);
    }
    const result: unknown = await response.json();
    if (typeof result !== 'boolean') {
      throw new Error('Supabase returned an invalid document write response.');
    }
    return result;
  }
}
