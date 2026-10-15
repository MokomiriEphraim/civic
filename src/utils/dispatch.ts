import { FIELD_TEAMS, type FieldTeam } from '../data/teams';
import { distanceMeters, parseCoordinates } from './proximity';

export interface DispatchResult {
  team: FieldTeam | null;
  distanceMetres: number | null;
  reason: string;
}

export function servesDepartment(team: FieldTeam, department: string): boolean {
  const wanted = department.trim().toLocaleLowerCase();
  if (wanted.length === 0) return false;
  return team.departments.some((entry) => {
    const known = entry.toLocaleLowerCase();
    return known === wanted || wanted.includes(known) || known.includes(wanted);
  });
}

/**
 * Automatic dispatch: the nearest active crew serving the report's department.
 * Falls back to a clear reason so the UI can explain why nothing was assigned.
 */
export function dispatchTeam(
  department: string,
  location: string,
  teams: FieldTeam[] = FIELD_TEAMS
): DispatchResult {
  const origin = parseCoordinates(location);
  const candidates = teams.filter((team) => team.active && servesDepartment(team, department));

  if (candidates.length === 0) {
    return {
      team: null,
      distanceMetres: null,
      reason: `No active field team is registered for ${department || 'this department'}.`,
    };
  }

  if (!origin) {
    return {
      team: null,
      distanceMetres: null,
      reason: 'Report location is not usable for distance-based dispatch.',
    };
  }

  let best: FieldTeam | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const team of candidates) {
    const distance = distanceMeters(origin, { lat: team.lat, lon: team.lon });
    if (distance < bestDistance) {
      best = team;
      bestDistance = distance;
    }
  }

  if (!best) {
    return { team: null, distanceMetres: null, reason: 'No dispatchable crew found.' };
  }

  return {
    team: best,
    distanceMetres: bestDistance,
    reason: `Nearest active ${best.departments[0]} crew (${bestDistance} m away).`,
  };
}
