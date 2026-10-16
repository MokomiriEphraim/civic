import type { HazardReport } from '../src/types';
import { HAZARD_SEVERITIES, REPORT_STATUSES } from '../src/types';

export const severities = HAZARD_SEVERITIES;
export const statuses = REPORT_STATUSES;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isBoundedString(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength;
}

export function hasOptionalString(
  record: Record<string, unknown>,
  key: string,
  maxLength: number
): boolean {
  const value = record[key];
  return value === undefined || (typeof value === 'string' && value.length <= maxLength);
}

export function isPhotoReference(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 14_500_000) {
    return false;
  }
  const dataImage = value.match(
    /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/
  );
  if (dataImage) {
    const bytes = Buffer.from(dataImage[2], 'base64');
    switch (dataImage[1]) {
      case 'jpeg':
        return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
      case 'png':
        return (
          bytes.length >= 8 &&
          bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
        );
      case 'webp':
        return (
          bytes.length >= 12 &&
          bytes.toString('ascii', 0, 4) === 'RIFF' &&
          bytes.toString('ascii', 8, 12) === 'WEBP'
        );
    }
  }
  if (value.startsWith('/') && !value.startsWith('//') && !value.includes('\\')) {
    return true;
  }

  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function isTimeline(value: unknown): boolean {
  return (
    value === undefined ||
    (Array.isArray(value) &&
      value.every(
        (entry) =>
          isRecord(entry) &&
          isBoundedString(entry.stage, 120) &&
          isBoundedString(entry.timestamp, 80) &&
          typeof entry.done === 'boolean' &&
          hasOptionalString(entry, 'note', 1000)
      ))
  );
}

function isAiAssessment(value: unknown): boolean {
  if (value === undefined) return true;
  if (!isRecord(value)) return false;
  return (
    isBoundedString(value.model, 120) &&
    isBoundedString(value.label, 160) &&
    typeof value.score === 'number' &&
    Number.isFinite(value.score) &&
    value.score >= 0 &&
    value.score <= 1 &&
    typeof value.inferenceMs === 'number' &&
    Number.isFinite(value.inferenceMs) &&
    value.inferenceMs >= 0 &&
    value.inferenceMs <= 600_000 &&
    ['accepted', 'edited', 'unclassified'].includes(String(value.outcome))
  );
}

export function isHazardReport(value: unknown): value is HazardReport {
  if (!isRecord(value)) return false;

  return (
    isBoundedString(value.id, 40) &&
    isBoundedString(value.hazardType, 120) &&
    isBoundedString(value.subType, 120) &&
    isBoundedString(value.department, 120) &&
    isBoundedString(value.location, 200) &&
    isBoundedString(value.status, 30) &&
    statuses.includes(value.status as HazardReport['status']) &&
    isBoundedString(value.date, 50) &&
    isBoundedString(value.severity, 20) &&
    severities.includes(value.severity as HazardReport['severity']) &&
    isBoundedString(value.description, 5000) &&
    isPhotoReference(value.photoUrl) &&
    hasOptionalString(value, 'departmentUnit', 120) &&
    hasOptionalString(value, 'address', 300) &&
    hasOptionalString(value, 'contact', 254) &&
    hasOptionalString(value, 'assignedTeam', 120) &&
    hasOptionalString(value, 'notes', 5000) &&
    hasOptionalString(value, 'detectedAt', 80) &&
    isAiAssessment(value.aiAssessment) &&
    isTimeline(value.timeline)
  );
}

export type FieldSpec =
  | { kind: 'string'; max: number; optional?: boolean }
  | { kind: 'enum'; values: readonly string[]; optional?: boolean }
  | { kind: 'boolean'; optional?: boolean }
  | { kind: 'number'; min?: number; max?: number; integer?: boolean; optional?: boolean }
  | { kind: 'photo'; optional?: boolean }
  | { kind: 'array'; of: FieldSpec; maxItems?: number; optional?: boolean }
  | { kind: 'object'; fields: Record<string, FieldSpec>; optional?: boolean };

export type Shape = Record<string, FieldSpec>;

function checkField(value: unknown, spec: FieldSpec): boolean {
  if (value === undefined || value === null) return spec.optional === true;

  switch (spec.kind) {
    case 'string':
      return typeof value === 'string' && value.length <= spec.max &&
        (spec.optional === true || value.trim().length > 0);
    case 'enum':
      return typeof value === 'string' && spec.values.includes(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'number':
      if (typeof value !== 'number' || !Number.isFinite(value)) return false;
      if (spec.integer === true && !Number.isInteger(value)) return false;
      if (spec.min !== undefined && value < spec.min) return false;
      if (spec.max !== undefined && value > spec.max) return false;
      return true;
    case 'photo':
      return isPhotoReference(value);
    case 'array':
      return (
        Array.isArray(value) &&
        (spec.maxItems === undefined || value.length <= spec.maxItems) &&
        value.every((item) => checkField(item, spec.of))
      );
    case 'object':
      return isRecord(value) && validateShape(value, spec.fields);
  }
}

/** Declarative field validation for the generic collections. */
export function validateShape(value: unknown, shape: Shape): boolean {
  if (!isRecord(value)) return false;
  return Object.entries(shape).every(([key, spec]) => checkField(value[key], spec));
}
