import {
  pipeline,
  type ZeroShotImageClassificationPipeline,
} from '@huggingface/transformers';
import {
  HAZARD_OPTIONS,
  HAZARD_VISION_MODEL,
  HAZARD_VISION_REVISION,
} from '../utils/hazardTaxonomy';

type WorkerRequest = { id: number; image: string };
type WorkerResponse =
  | {
      id: number;
      status: 'loading-model' | 'model-progress' | 'analysing-image';
      progress?: number;
    }
  | { id: number; predictions: { label: string; score: number }[]; inferenceMs: number }
  | { id: number; error: string };

interface HazardModelWorkerScope {
  postMessage(message: WorkerResponse): void;
  addEventListener(
    type: 'message',
    listener: (event: MessageEvent<WorkerRequest>) => void
  ): void;
}

const workerScope = globalThis as unknown as HazardModelWorkerScope;
const labels = HAZARD_OPTIONS.map((option) => option.label);
let classifier: ZeroShotImageClassificationPipeline | undefined;
let requestQueue = Promise.resolve();

async function classify(request: WorkerRequest): Promise<void> {
  try {
    if (!classifier) {
      workerScope.postMessage({
        id: request.id,
        status: 'loading-model',
      } satisfies WorkerResponse);
      classifier = await pipeline(
        'zero-shot-image-classification',
        HAZARD_VISION_MODEL,
        {
          dtype: 'q8',
          revision: HAZARD_VISION_REVISION,
          progress_callback: (progress) => {
            if (progress.status === 'progress_total') {
              workerScope.postMessage({
                id: request.id,
                status: 'model-progress',
                progress: progress.progress,
              } satisfies WorkerResponse);
            }
          },
        }
      );
    }

    workerScope.postMessage({
      id: request.id,
      status: 'analysing-image',
    } satisfies WorkerResponse);
    const inferenceStartedAt = performance.now();
    const result = await classifier(request.image, labels);
    workerScope.postMessage({
      id: request.id,
      predictions: result.map(({ label, score }) => ({ label, score })),
      inferenceMs: performance.now() - inferenceStartedAt,
    } satisfies WorkerResponse);
  } catch (error) {
    workerScope.postMessage({
      id: request.id,
      error: error instanceof Error ? error.message : 'Local image analysis failed.',
    } satisfies WorkerResponse);
  }
}

workerScope.addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
  requestQueue = requestQueue.then(() => classify(event.data));
});
