import {
  interpretHazardPredictions,
  type HazardVisionPrediction,
  type HazardVisionResult,
} from './hazardTaxonomy';
export {
  HAZARD_OPTIONS,
  HAZARD_VISION_MODEL,
  HAZARD_VISION_VERSION,
  interpretHazardPredictions,
} from './hazardTaxonomy';
export type { HazardVisionResult } from './hazardTaxonomy';

type WorkerRequest = { id: number; image: string };
type WorkerResponse =
  | {
      id: number;
      status: 'loading-model' | 'model-progress' | 'analysing-image';
      progress?: number;
    }
  | { id: number; predictions: HazardVisionPrediction[]; inferenceMs: number }
  | { id: number; error: string };

interface PendingRequest {
  resolve: (result: HazardVisionResult) => void;
  reject: (error: Error) => void;
  onStatus?: (
    status: 'loading-model' | 'model-progress' | 'analysing-image',
    progress?: number
  ) => void;
}

let worker: Worker | undefined;
let nextRequestId = 1;
const pendingRequests = new Map<number, PendingRequest>();

function getWorker(): Worker {
  if (worker) return worker;
  if (typeof Worker === 'undefined') {
    throw new Error('This browser does not support local image analysis.');
  }

  worker = new Worker(new URL('../workers/hazardVision.worker.ts', import.meta.url), {
    type: 'module',
  });
  worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
    const pending = pendingRequests.get(event.data.id);
    if (!pending) return;

    if ('status' in event.data) {
      pending.onStatus?.(event.data.status, event.data.progress);
      return;
    }

    pendingRequests.delete(event.data.id);
    if ('error' in event.data) {
      pending.reject(new Error(event.data.error));
      return;
    }

    try {
      pending.resolve(interpretHazardPredictions(event.data.predictions, event.data.inferenceMs));
    } catch (error) {
      pending.reject(
        error instanceof Error ? error : new Error('Local image analysis failed.')
      );
    }
  };
  worker.onerror = (event: ErrorEvent) => {
    const error = new Error(event.message || 'The local image analysis worker failed.');
    for (const pending of pendingRequests.values()) pending.reject(error);
    pendingRequests.clear();
    worker?.terminate();
    worker = undefined;
  };

  return worker;
}

export function analyseHazardImage(
  image: string,
  onStatus?: PendingRequest['onStatus']
): Promise<HazardVisionResult> {
  if (!image) return Promise.reject(new Error('Choose an image to analyse.'));

  let activeWorker: Worker;
  try {
    activeWorker = getWorker();
  } catch (error) {
    return Promise.reject(
      error instanceof Error ? error : new Error('Local image analysis is unavailable.')
    );
  }

  const id = nextRequestId++;
  return new Promise((resolve, reject) => {
    pendingRequests.set(id, { resolve, reject, onStatus });
    activeWorker.postMessage({ id, image } satisfies WorkerRequest);
  });
}
