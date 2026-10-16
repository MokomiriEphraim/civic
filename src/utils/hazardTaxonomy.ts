export const HAZARD_VISION_MODEL = 'Xenova/clip-vit-base-patch32';
export const HAZARD_VISION_REVISION = 'd15189d7028b43f1d3e65039190477f6af591c2a';
export const HAZARD_VISION_VERSION = `${HAZARD_VISION_MODEL}@${HAZARD_VISION_REVISION}`;
export const MINIMUM_MATCH_SCORE = 0.2;

export interface HazardOption {
  id: string;
  label: string;
  hazardType: string;
  subType: string;
  department: string;
  departmentUnit: string;
  description: string;
}

export const HAZARD_OPTIONS: HazardOption[] = [
  {
    id: 'pothole',
    label: 'Pothole or damaged road surface',
    hazardType: 'Road Hazard',
    subType: 'Pothole',
    department: 'Roads & Stormwater',
    departmentUnit: '(Maintenance & Repairs)',
    description: 'Road surface damage reported by a resident.',
  },
  {
    id: 'water-main',
    label: 'Broken water pipe or water leak',
    hazardType: 'Water Hazard',
    subType: 'Broken Water Main',
    department: 'Water & Sanitation',
    departmentUnit: '(Emergency Valve Team)',
    description: 'Possible water leak or pipe damage reported by a resident.',
  },
  {
    id: 'blocked-drain',
    label: 'Blocked storm drain or street flooding',
    hazardType: 'Drainage Hazard',
    subType: 'Blocked Drain',
    department: 'Water & Sanitation',
    departmentUnit: '(Stormwater Catchments)',
    description: 'Possible drainage blockage or street flooding reported by a resident.',
  },
  {
    id: 'illegal-dumping',
    label: 'Dumped rubbish or overflowing public waste',
    hazardType: 'Waste Hazard',
    subType: 'Illegal Dumping',
    department: 'Waste Management',
    departmentUnit: '(Special Waste Removal)',
    description: 'Possible dumped or overflowing waste reported by a resident.',
  },
  {
    id: 'traffic-signal',
    label: 'Broken traffic light or pedestrian signal',
    hazardType: 'Traffic Infrastructure',
    subType: 'Traffic Light Fault',
    department: 'Traffic & Transport',
    departmentUnit: '(Signal Electronics)',
    description: 'Possible traffic signal fault reported by a resident.',
  },
  {
    id: 'streetlight',
    label: 'Damaged or non-working streetlight',
    hazardType: 'Electrical Hazard',
    subType: 'Streetlight Fault',
    department: 'Electricity Services',
    departmentUnit: '(Public Lighting)',
    description: 'Possible public lighting fault reported by a resident.',
  },
  {
    id: 'sidewalk',
    label: 'Damaged sidewalk or pedestrian path',
    hazardType: 'Road Hazard',
    subType: 'Damaged Sidewalk',
    department: 'Roads & Stormwater',
    departmentUnit: '(Maintenance & Repairs)',
    description: 'Possible pedestrian path damage reported by a resident.',
  },
  {
    id: 'fallen-tree',
    label: 'Fallen tree or public-space obstruction',
    hazardType: 'Public Space Hazard',
    subType: 'Fallen Tree or Obstruction',
    department: 'Parks & Recreation',
    departmentUnit: '(Tree Management)',
    description: 'Possible obstruction in a public space reported by a resident.',
  },
  {
    id: 'other-hazard',
    label: 'Other visible municipal infrastructure issue',
    hazardType: 'Other Civic Hazard',
    subType: 'Other Infrastructure Issue',
    department: 'Municipal Services',
    departmentUnit: '(Needs review)',
    description: 'Possible infrastructure issue; please provide a clear description.',
  },
  {
    id: 'not-a-hazard',
    label: 'No clear municipal infrastructure hazard',
    hazardType: '',
    subType: '',
    department: '',
    departmentUnit: '',
    description: '',
  },
];

export interface HazardVisionPrediction {
  label: string;
  score: number;
}

export interface HazardVisionResult {
  model: string;
  label: string;
  score: number;
  inferenceMs: number;
  suggestion: HazardOption | null;
  lowMatch: boolean;
}

export function interpretHazardPredictions(
  predictions: HazardVisionPrediction[],
  inferenceMs: number
): HazardVisionResult {
  const ordered = [...predictions].sort((left, right) => right.score - left.score);
  const top = ordered[0];
  if (!top || !Number.isFinite(top.score) || top.score < 0 || top.score > 1) {
    throw new Error('The vision model returned an invalid result.');
  }
  if (!Number.isFinite(inferenceMs) || inferenceMs < 0 || inferenceMs > 600_000) {
    throw new Error('The vision model returned an invalid duration.');
  }

  const option = HAZARD_OPTIONS.find((candidate) => candidate.label === top.label);
  if (!option) {
    throw new Error('The vision model returned an unsupported label.');
  }

  return {
    model: HAZARD_VISION_VERSION,
    label: top.label,
    score: top.score,
    inferenceMs,
    suggestion: option.id === 'not-a-hazard' || top.score < MINIMUM_MATCH_SCORE ? null : option,
    lowMatch: top.score < MINIMUM_MATCH_SCORE,
  };
}
