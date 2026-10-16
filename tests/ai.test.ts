import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  HAZARD_OPTIONS,
  HAZARD_VISION_VERSION,
  interpretHazardPredictions,
} from '../src/utils/hazardVision';

test('maps a model label into an editable civic service suggestion', () => {
  const result = interpretHazardPredictions([
    { label: 'Broken water pipe or water leak', score: 0.32 },
    { label: 'Pothole or damaged road surface', score: 0.68 },
  ], 175);

  assert.equal(result.model, HAZARD_VISION_VERSION);
  assert.equal(result.suggestion?.subType, 'Pothole');
  assert.equal(result.suggestion?.department, 'Roads & Stormwater');
  assert.equal(result.score, 0.68);
  assert.equal(result.inferenceMs, 175);
  assert.equal(result.lowMatch, false);
});

test('does not fabricate a hazard when the model identifies no visible hazard', () => {
  const result = interpretHazardPredictions([
    { label: 'No clear municipal infrastructure hazard', score: 0.7 },
    { label: 'Pothole or damaged road surface', score: 0.3 },
  ], 80);

  assert.equal(result.suggestion, null);
  assert.equal(result.lowMatch, false);
});

test('marks weak and invalid model results for manual handling', () => {
  const result = interpretHazardPredictions([
    { label: HAZARD_OPTIONS[0].label, score: 0.1 },
  ], 50);
  assert.equal(result.suggestion, null);
  assert.equal(result.lowMatch, true);

  assert.throws(
    () => interpretHazardPredictions([{ label: 'unknown label', score: 0.8 }], 50),
    /unsupported label/
  );
  assert.throws(
    () => interpretHazardPredictions([{ label: HAZARD_OPTIONS[0].label, score: 1.2 }], 50),
    /invalid result/
  );
  assert.throws(
    () => interpretHazardPredictions([{ label: HAZARD_OPTIONS[0].label, score: 0.8 }], -1),
    /invalid duration/
  );
});
