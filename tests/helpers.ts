import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

export interface RunningApi {
  baseUrl: string;
  stop: () => Promise<void>;
}

export interface StartApiOptions {
  /** Extra environment variables for the spawned API process. */
  env?: Record<string, string>;
}

/**
 * Spawns `server/index.ts` on an ephemeral port against a temporary
 * REPORTS_FILE, and resolves once it logs its listening URL.
 */
export async function startApi(
  dataFile: string,
  options: StartApiOptions = {}
): Promise<RunningApi> {
  const child: ChildProcess = spawn(
    process.execPath,
    ['--import', 'tsx', 'server/index.ts'],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        API_PORT: '0',
        REPORTS_FILE: dataFile,
        ...options.env,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );

  let output = '';
  let baseUrl: string | undefined;
  const ready = new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`API did not start. ${output}`)), 10_000);
    child.stdout?.setEncoding('utf8');
    child.stdout?.on('data', (chunk: string) => {
      output += chunk;
      const match = output.match(/listening on http:\/\/localhost:(\d+)/);
      if (match && !baseUrl) {
        baseUrl = `http://localhost:${match[1]}`;
        clearTimeout(timeout);
        resolve();
      }
    });
    child.stderr?.setEncoding('utf8');
    child.stderr?.on('data', (chunk: string) => {
      output += chunk;
    });
    child.once('exit', (code) => {
      clearTimeout(timeout);
      reject(new Error(`API exited before becoming ready (${code}). ${output}`));
    });
    child.once('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });

  try {
    await ready;
  } catch (error) {
    child.kill();
    throw error;
  }
  if (!baseUrl) {
    child.kill();
    throw new Error(`API did not report a listening port. ${output}`);
  }
  return {
    baseUrl,
    stop: async () => {
      if (child.exitCode !== null || child.signalCode !== null) return;
      const exited = new Promise<void>((resolve) => child.once('exit', () => resolve()));
      child.kill();
      await Promise.race([
        exited,
        delay(3_000).then(() => {
          throw new Error(`API did not stop cleanly. ${output}`);
        }),
      ]);
    },
  };
}

export async function jsonRequest<T>(
  api: RunningApi,
  route: string,
  init?: RequestInit
): Promise<{ response: Response; body: T }> {
  const response = await fetch(`${api.baseUrl}${route}`, init);
  const body = (await response.json()) as T;
  return { response, body };
}

export function jsonInit(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

export async function createTemporaryDirectory(): Promise<string> {
  return mkdtemp(path.join(tmpdir(), 'civicfix-api-test-'));
}
