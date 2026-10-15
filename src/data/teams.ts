export interface FieldTeam {
  id: string;
  name: string;
  departments: string[];
  lat: number;
  lon: number;
  active: boolean;
  members: number;
  zone: string;
}

/** Field teams used by automatic dispatch (nearest matching crew wins). */
export const FIELD_TEAMS: FieldTeam[] = [
  {
    id: 'T-ROAD-04',
    name: 'Roads Crew Delta 4',
    departments: ['Roads & Stormwater'],
    lat: -33.9249,
    lon: 18.4241,
    active: true,
    members: 6,
    zone: 'City Bowl',
  },
  {
    id: 'T-ROAD-02',
    name: 'Roads Crew Beta',
    departments: ['Roads & Stormwater'],
    lat: -33.921,
    lon: 18.423,
    active: true,
    members: 4,
    zone: 'District Six',
  },
  {
    id: 'T-ROAD-09',
    name: 'Emergency Road Safety',
    departments: ['Roads & Stormwater'],
    lat: -33.935,
    lon: 18.418,
    active: true,
    members: 3,
    zone: 'Gardens',
  },
  {
    id: 'T-WAT-02',
    name: 'Rapid Water Response 2',
    departments: ['Water & Sanitation'],
    lat: -33.9152,
    lon: 18.4087,
    active: true,
    members: 5,
    zone: 'Green Point',
  },
  {
    id: 'T-WAT-07',
    name: 'Drainage Jet Vac Unit 7',
    departments: ['Water & Sanitation'],
    lat: -33.9221,
    lon: 18.4172,
    active: true,
    members: 4,
    zone: 'CBD',
  },
  {
    id: 'T-WST-01',
    name: 'Civic Clean Sweep 1',
    departments: ['Waste Management'],
    lat: -33.9314,
    lon: 18.426,
    active: true,
    members: 5,
    zone: 'East City',
  },
  {
    id: 'T-WST-04',
    name: 'Area Cleansing Crew 4',
    departments: ['Waste Management'],
    lat: -33.9234,
    lon: 18.4211,
    active: true,
    members: 4,
    zone: 'CBD',
  },
  {
    id: 'T-TRF-03',
    name: 'Traffic Signals Squad 3',
    departments: ['Traffic & Transport'],
    lat: -33.9176,
    lon: 18.4198,
    active: true,
    members: 4,
    zone: 'Foreshore',
  },
  {
    id: 'T-TRF-06',
    name: 'Line Marking Ops',
    departments: ['Traffic & Transport'],
    lat: -33.9189,
    lon: 18.413,
    active: true,
    members: 3,
    zone: 'De Waterkant',
  },
  {
    id: 'T-ELC-02',
    name: 'Lighting Crew 2',
    departments: ['Electricity Services'],
    lat: -33.9288,
    lon: 18.4115,
    active: true,
    members: 4,
    zone: 'Oranjezicht',
  },
  {
    id: 'T-PRK-01',
    name: 'Tree Care Specialists',
    departments: ['City Parks'],
    lat: -33.9295,
    lon: 18.4162,
    active: false,
    members: 3,
    zone: 'Company Garden',
  },
  {
    id: 'T-BLD-05',
    name: 'Municipal Inspectorate',
    departments: ['Building Compliance'],
    lat: -33.9312,
    lon: 18.4145,
    active: true,
    members: 2,
    zone: 'Gardens',
  },
];
