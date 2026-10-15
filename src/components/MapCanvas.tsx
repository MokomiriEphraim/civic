import React, { useMemo } from 'react';
import type { HazardReport, HazardSeverity } from '../types';
import { parseCoordinates } from '../utils/proximity';

const MAP_W = 800;
const MAP_H = 600;

/** Rough urban driving speed: 25 km/h ≈ 417 m per minute. */
export function crewEtaMinutes(metres: number): number {
  return Math.max(1, Math.round(metres / 417));
}

export interface CrewMarker {
  id: string;
  label: string;
  lat: number;
  lon: number;
  minutes?: number;
}

interface MapCanvasProps {
  reports: HazardReport[];
  selectedId?: string | null;
  onSelectReport?: (id: string) => void;
  crews?: CrewMarker[];
  className?: string;
  /** HTML rendered over the SVG (legends, chips). */
  overlay?: React.ReactNode;
}

export const SEVERITY_FILL: Record<HazardSeverity, string> = {
  Low: '#64748b',
  Medium: '#f59e0b',
  High: '#f97316',
  Critical: '#ef4444',
};

const SEVERITY_RADIUS: Record<HazardSeverity, number> = {
  Low: 5,
  Medium: 6,
  High: 7,
  Critical: 8,
};

interface Projector {
  (lat: number, lon: number): { x: number; y: number };
}

function buildProjector(
  coords: { lat: number; lon: number }[]
): { project: Projector; total: number } {
  if (coords.length === 0) {
    return { project: () => ({ x: MAP_W / 2, y: MAP_H / 2 }), total: 0 };
  }
  let minLat = Math.min(...coords.map((p) => p.lat));
  let maxLat = Math.max(...coords.map((p) => p.lat));
  let minLon = Math.min(...coords.map((p) => p.lon));
  let maxLon = Math.max(...coords.map((p) => p.lon));

  if (maxLat - minLat < 0.0001) {
    minLat -= 0.01;
    maxLat += 0.01;
  }
  if (maxLon - minLon < 0.0001) {
    minLon -= 0.01;
    maxLon += 0.01;
  }

  const padLat = (maxLat - minLat) * 0.1;
  const padLon = (maxLon - minLon) * 0.1;
  minLat -= padLat;
  maxLat += padLat;
  minLon -= padLon;
  maxLon += padLon;

  return {
    total: coords.length,
    project: (lat, lon) => ({
      x: ((lon - minLon) / (maxLon - minLon)) * MAP_W,
      y: (1 - (lat - minLat) / (maxLat - minLat)) * MAP_H,
    }),
  };
}

/**
 * The shared SVG map: soft terrain, roads and a river, hazard markers
 * coloured by severity, plus optional crew chips. Used by the civic map
 * screen and the home console.
 */
export const MapCanvas: React.FC<MapCanvasProps> = ({
  reports,
  selectedId,
  onSelectReport,
  crews = [],
  className = 'absolute inset-0 h-full w-full',
  overlay,
}) => {
  const { reportPoints, crewPoints } = useMemo(() => {
    const reportCoords: { lat: number; lon: number }[] = [];
    for (const report of reports) {
      const coords = parseCoordinates(report.location);
      if (coords) reportCoords.push(coords);
    }
    const crewCoords = crews
      .map((crew) => ({ lat: crew.lat, lon: crew.lon }))
      .filter((coords) => Number.isFinite(coords.lat) && Number.isFinite(coords.lon));

    const { project } = buildProjector([...reportCoords, ...crewCoords]);

    return {
      reportPoints: reports
        .flatMap((report) => {
          const coords = parseCoordinates(report.location);
          if (!coords) return [];
          const point = project(coords.lat, coords.lon);
          return [{ report, x: point.x, y: point.y }];
        }),
      crewPoints: crews.map((crew) => ({ crew, ...project(crew.lat, crew.lon) })),
    };
  }, [reports, crews]);

  return (
    <div className={`relative overflow-hidden bg-[#EEF5EE] ${className}`}>
      <svg
        viewBox={`0 0 ${MAP_W} ${MAP_H}`}
        className="absolute inset-0 h-full w-full"
        role="img"
        aria-label="Map of reported hazards and field crews"
      >
        <rect x="0" y="0" width={MAP_W} height={MAP_H} fill="#EEF5EE" />
        <rect x="60" y="50" width="220" height="150" rx="14" fill="#E1EBE2" />
        <rect x="480" y="90" width="240" height="180" rx="14" fill="#E1EBE2" />
        <rect x="90" y="330" width="200" height="170" rx="14" fill="#E4EEE6" />
        <rect x="520" y="380" width="210" height="150" rx="14" fill="#E1EBE2" />
        <path
          d="M0 430 C 140 390, 260 500, 420 460 S 680 520, 800 470"
          stroke="#BFDBFE"
          strokeWidth="22"
          fill="none"
          strokeLinecap="round"
          opacity="0.8"
        />
        <path d="M0 240 H800" stroke="#CBD5E1" strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M300 0 V600" stroke="#CBD5E1" strokeWidth="4" fill="none" strokeLinecap="round" />
        <path
          d="M0 90 C 200 130, 420 40, 800 120"
          stroke="#D6DEE8"
          strokeWidth="2.5"
          fill="none"
        />
        <path
          d="M120 600 C 180 420, 520 360, 640 0"
          stroke="#D6DEE8"
          strokeWidth="2.5"
          fill="none"
        />

        {reportPoints.map((point) => {
          const selected = point.report.id === selectedId;
          const radius = SEVERITY_RADIUS[point.report.severity];
          return (
            <g key={point.report.id}>
              {selected && (
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={radius + 5}
                  fill="none"
                  stroke="#0f172a"
                  strokeWidth="2"
                  opacity="0.65"
                >
                  <animate
                    attributeName="r"
                    values={`${radius + 5};${radius + 13};${radius + 5}`}
                    dur="1.8s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="0.65;0;0.65"
                    dur="1.8s"
                    repeatCount="indefinite"
                  />
                </circle>
              )}
              {selected && (
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={radius + 3}
                  fill="none"
                  stroke="#0f172a"
                  strokeWidth="2.5"
                />
              )}
              <circle
                cx={point.x}
                cy={point.y}
                r={radius}
                fill={SEVERITY_FILL[point.report.severity]}
                stroke="#ffffff"
                strokeWidth="1.5"
                className={onSelectReport ? 'cursor-pointer' : undefined}
                onClick={
                  onSelectReport ? () => onSelectReport(point.report.id) : undefined
                }
              >
                <title>
                  {`${point.report.id} · ${point.report.subType} · ${point.report.location}`}
                </title>
              </circle>
            </g>
          );
        })}

        {crewPoints.map(({ crew, x, y }) => {
          const chip = crew.minutes !== undefined ? `${crew.label} · ${crew.minutes} MIN` : crew.label;
          const width = Math.max(74, chip.length * 6.4 + 16);
          return (
            <g key={crew.id} transform={`translate(${x} ${y})`}>
              <line x1="0" y1="0" x2="0" y2="14" stroke="#0f172a" strokeWidth="1.5" opacity="0.5" />
              <circle r="8" fill="#0f172a" stroke="#ffffff" strokeWidth="2.5" />
              <rect x={-width / 2} y="16" width={width} height="18" rx="9" fill="#0f172a" />
              <text
                x="0"
                y="28.5"
                textAnchor="middle"
                fill="#ffffff"
                fontSize="9.5"
                fontWeight="700"
                letterSpacing="0.4"
              >
                {chip.toUpperCase()}
              </text>
            </g>
          );
        })}
      </svg>
      {overlay}
    </div>
  );
};
