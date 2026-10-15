import type { DetectionResult, HazardSeverity } from '../types';

export interface DetectionPreset {
  hazardType: string;
  subType: string;
  severity: HazardSeverity;
  department: string;
  departmentUnit: string;
  description: string;
  location?: string;
  address?: string;
}

/** FNV-1a over a bounded prefix — stable for identical photos, cheap on big files. */
export function hashString(input: string): number {
  const limit = Math.min(input.length, 8192);
  let hash = 0x811c9dc5;
  for (let index = 0; index < limit; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  hash ^= input.length;
  return hash >>> 0;
}

const ROAD_DEFECTS = /pothole|manhole|trench|crack|road|asphalt|kerb/;
const WATER_WORKS = /water|drain|sewer|burst|leak|storm/i;
const WASTE = /dump|waste|bin|rubbish|refuse/i;
const SIGNALS = /traffic|signal|light|crossing/i;
const POWER = /electric|lamp|light pole|streetlight|power/i;

function detailFor(severity: HazardSeverity, subType: string): string {
  if (ROAD_DEFECTS.test(subType)) {
    return 'Large road defect with potential risk to vehicles and pedestrians.';
  }
  if (WATER_WORKS.test(subType)) {
    return 'Active water or drainage failure affecting nearby residents and infrastructure.';
  }
  if (WASTE.test(subType)) {
    return 'Accumulating waste creates a public health and blockage risk.';
  }
  if (SIGNALS.test(subType)) {
    return 'Faulty traffic control raises collision risk during peak movement.';
  }
  if (POWER.test(subType)) {
    return 'Damaged public lighting reduces night-time safety.';
  }
  switch (severity) {
    case 'Critical':
      return 'Immediate threat to public safety requiring an emergency crew.';
    case 'High':
      return 'Significant service disruption with growing risk to the public.';
    case 'Medium':
      return 'Service quality issue that will worsen without maintenance.';
    case 'Low':
      return 'Cosmetic or minor issue scheduled with routine maintenance.';
  }
}

function prefixFor(severity: HazardSeverity): string {
  switch (severity) {
    case 'Critical':
      return 'Critical';
    case 'High':
      return 'High';
    case 'Medium':
      return 'Moderate';
    case 'Low':
      return 'Low';
  }
}

/**
 * Deterministic local "AI": the same photo always yields the same hazard,
 * severity and confidence. Runs entirely offline — no model call, no key.
 */
export function analysePhoto(
  photoSource: string,
  presets: DetectionPreset[],
  includeLocation: boolean = false
): DetectionResult | null {
  if (presets.length === 0) return null;

  const hash = hashString(photoSource);
  const preset = presets[hash % presets.length];
  const confidence = 88 + (hash % 11);

  return {
    hazardType: preset.hazardType,
    subType: preset.subType,
    department: preset.department,
    departmentUnit: preset.departmentUnit,
    severity: preset.severity,
    confidence,
    severityReason: `${prefixFor(preset.severity)}: ${detailFor(preset.severity, preset.subType)}`,
    location: includeLocation ? preset.location : undefined,
    address: includeAddress(preset, includeLocation),
  };
}

function includeAddress(preset: DetectionPreset, includeLocation: boolean): string | undefined {
  return includeLocation ? preset.address : undefined;
}

/** Confidence shown as the wizard's badge copy. */
export function confidenceLabel(confidence: number): string {
  return `${confidence}% match`;
}
