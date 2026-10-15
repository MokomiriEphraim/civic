import type {
  HazardReport,
  ReportEngagement,
  ReportStatus,
  ResidentRating,
  ResolutionProof,
  TicketThread,
} from '../types';
import { INITIAL_REPORTS } from './mockReports';
import { POTHOLE_IMAGE, REPAIRED_ROAD_IMAGE } from './images';
import { applyStatusToTimeline, initialTimeline } from '../utils/timeline';

const WATER_PHOTO = 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80';
const DUMPING_PHOTO = 'https://images.unsplash.com/photo-1605600659908-0ef719419d41?auto=format&fit=crop&w=800&q=80';
const SIGNAL_PHOTO = 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&w=800&q=80';
const DRAIN_PHOTO = 'https://images.unsplash.com/photo-1541888946425-d0fbb186f5f8?auto=format&fit=crop&w=800&q=80';
const LAMP_PHOTO = 'https://images.unsplash.com/photo-1508873696983-2df57046475a?auto=format&fit=crop&w=800&q=80';
const MANHOLE_PHOTO = 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=800&q=80';
const TREE_PHOTO = 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=800&q=80';
const CROSSING_PHOTO = 'https://images.unsplash.com/photo-1494783367193-149034c05e8f?auto=format&fit=crop&w=800&q=80';
const BIN_PHOTO = 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80';

interface SeedReportInput {
  id: string;
  hazardType: string;
  subType: string;
  department: string;
  departmentUnit: string;
  location: string;
  address: string;
  status: ReportStatus;
  date: string;
  detectedAt: string;
  severity: HazardReport['severity'];
  description: string;
  photoUrl: string;
  assignedTeam: string;
  detectionNote: string;
}

function makeReport(input: SeedReportInput): HazardReport {
  return {
    id: input.id,
    hazardType: input.hazardType,
    subType: input.subType,
    department: input.department,
    departmentUnit: input.departmentUnit,
    location: input.location,
    address: input.address,
    status: input.status,
    date: input.date,
    severity: input.severity,
    description: input.description,
    photoUrl: input.photoUrl,
    contact: 'mpho.shiang@example.com',
    assignedTeam: input.assignedTeam,
    detectedAt: input.detectedAt,
    timeline: applyStatusToTimeline(
      initialTimeline(input.detectedAt, input.detectionNote),
      input.status,
      input.detectedAt
    ),
  };
}

const EXTRA_REPORTS: HazardReport[] = [
  makeReport({
    id: '#CF-45824',
    hazardType: 'Road Hazard (Pothole)',
    subType: 'Pothole',
    department: 'Roads & Stormwater',
    departmentUnit: '(Maintenance & Repairs)',
    location: '-33.9275, 18.4186',
    address: 'Buitengracht St & Long St, Cape Town',
    status: 'Resolved',
    date: '14 Oct 2026',
    detectedAt: '14 Oct 2026, 07:48',
    severity: 'High',
    description: 'Deep pothole in the eastbound lane where buses brake for the intersection.',
    photoUrl: POTHOLE_IMAGE,
    assignedTeam: 'Roads Crew Delta 4',
    detectionNote: 'Pothole · 94% confidence · severity High',
  }),
  makeReport({
    id: '#CF-45823',
    hazardType: 'Water Hazard',
    subType: 'Broken Water Main',
    department: 'Water & Sanitation',
    departmentUnit: '(Emergency Valve Team)',
    location: '-33.9262, 18.4225',
    address: 'St Georges Mall, Cape Town CBD',
    status: 'Received',
    date: '15 Oct 2026',
    detectedAt: '15 Oct 2026, 06:52',
    severity: 'Critical',
    description: 'Water surfacing through a pavement joint and running down the pedestrian lane.',
    photoUrl: WATER_PHOTO,
    assignedTeam: 'Rapid Water Response 2',
    detectionNote: 'Broken water main · 96% confidence · severity Critical',
  }),
  makeReport({
    id: '#CF-45822',
    hazardType: 'Traffic Infrastructure',
    subType: 'Traffic Light Fault',
    department: 'Traffic & Transport',
    departmentUnit: '(Signal Electronics)',
    location: '-33.923, 18.4195',
    address: 'Darling St & Buitengracht St, Cape Town',
    status: 'Verified',
    date: '15 Oct 2026',
    detectedAt: '15 Oct 2026, 05:31',
    severity: 'High',
    description: 'Intersection signal stuck on amber flash, causing uncertain right-of-way.',
    photoUrl: SIGNAL_PHOTO,
    assignedTeam: 'Traffic Signals Squad 3',
    detectionNote: 'Traffic light fault · 97% confidence · severity High',
  }),
  makeReport({
    id: '#CF-45825',
    hazardType: 'Waste Hazard',
    subType: 'Illegal Dumping',
    department: 'Waste Management',
    departmentUnit: '(Special Waste Removal)',
    location: '-33.9338, 18.4225',
    address: 'Hatton St, Foreshore',
    status: 'Assigned',
    date: '14 Oct 2026',
    detectedAt: '14 Oct 2026, 10:26',
    severity: 'Medium',
    description: 'Construction rubble dumped against the boundary fence overnight.',
    photoUrl: DUMPING_PHOTO,
    assignedTeam: 'Civic Clean Sweep 1',
    detectionNote: 'Illegal dumping · 91% confidence · severity Medium',
  }),
  makeReport({
    id: '#CF-45826',
    hazardType: 'Electrical Hazard',
    subType: 'Damaged Street Lamp',
    department: 'Electricity Services',
    departmentUnit: '(Public Lighting)',
    location: '-33.9205, 18.4155',
    address: 'Bloem St, Cape Town',
    status: 'In Progress',
    date: '13 Oct 2026',
    detectedAt: '13 Oct 2026, 20:04',
    severity: 'Medium',
    description: 'Lamp head hanging loose after a delivery vehicle clipped the pole.',
    photoUrl: LAMP_PHOTO,
    assignedTeam: 'Lighting Crew 2',
    detectionNote: 'Damaged street lamp · 93% confidence · severity Medium',
  }),
  makeReport({
    id: '#CF-45827',
    hazardType: 'Drainage Hazard',
    subType: 'Drainage Issue',
    department: 'Water & Sanitation',
    departmentUnit: '(Stormwater Catchments)',
    location: '-33.9288, 18.4248',
    address: 'Barrack St, Cape Town',
    status: 'Received',
    date: '15 Oct 2026',
    detectedAt: '15 Oct 2026, 08:12',
    severity: 'Medium',
    description: 'Stormwater grate blocked with litter, water pooling across the kerb lane.',
    photoUrl: DRAIN_PHOTO,
    assignedTeam: 'Drainage Jet Vac Unit 7',
    detectionNote: 'Blocked drain · 92% confidence · severity Medium',
  }),
  makeReport({
    id: '#CF-45828',
    hazardType: 'Road Hazard',
    subType: 'Missing Manhole Cover',
    department: 'Roads & Stormwater',
    departmentUnit: '(Safety Hazards)',
    location: '-33.9365, 18.4212',
    address: 'Mill Ln, Gardens',
    status: 'Verified',
    date: '14 Oct 2026',
    detectedAt: '14 Oct 2026, 21:37',
    severity: 'Critical',
    description: 'Open manhole with no cover or cone in a residential street.',
    photoUrl: MANHOLE_PHOTO,
    assignedTeam: 'Emergency Road Safety',
    detectionNote: 'Missing manhole cover · 95% confidence · severity Critical',
  }),
  makeReport({
    id: '#CF-45829',
    hazardType: 'Waste Hazard',
    subType: 'Overflowing Public Bin',
    department: 'Waste Management',
    departmentUnit: '(Street Cleansing)',
    location: '-33.9215, 18.4255',
    address: 'Church St, Cape Town',
    status: 'Resolved',
    date: '11 Oct 2026',
    detectedAt: '11 Oct 2026, 13:02',
    severity: 'Low',
    description: 'Public bin overflowing after the lunchtime rush onto the paving.',
    photoUrl: BIN_PHOTO,
    assignedTeam: 'Area Cleansing Crew 4',
    detectionNote: 'Overflowing bin · 90% confidence · severity Low',
  }),
  makeReport({
    id: '#CF-45830',
    hazardType: 'Traffic Infrastructure',
    subType: 'Faded Pedestrian Crossing',
    department: 'Traffic & Transport',
    departmentUnit: '(Road Markings)',
    location: '-33.9165, 18.4148',
    address: 'Somerset Rd, Green Point',
    status: 'Assigned',
    date: '12 Oct 2026',
    detectedAt: '12 Oct 2026, 17:18',
    severity: 'Low',
    description: 'Crossing markings faded to nothing outside the primary school gate.',
    photoUrl: CROSSING_PHOTO,
    assignedTeam: 'Line Marking Ops',
    detectionNote: 'Faded crossing · 89% confidence · severity Low',
  }),
  makeReport({
    id: '#CF-45831',
    hazardType: 'Parks & Recreation',
    subType: 'Fallen Tree Branch',
    department: 'City Parks',
    departmentUnit: '(Arboriculture)',
    location: '-33.9302, 18.4172',
    address: 'Company’s Garden Walkway',
    status: 'In Progress',
    date: '12 Oct 2026',
    detectedAt: '12 Oct 2026, 09:44',
    severity: 'Medium',
    description: 'Storm-snapped branch resting across the pedestrian walkway.',
    photoUrl: TREE_PHOTO,
    assignedTeam: 'Tree Care Specialists',
    detectionNote: 'Fallen branch · 94% confidence · severity Medium',
  }),
];

export const SEED_REPORTS: HazardReport[] = [...EXTRA_REPORTS, ...INITIAL_REPORTS];

export const SEED_ENGAGEMENTS: ReportEngagement[] = [
  { id: '#CF-45821', affected: 126, confirmations: ['Thandi M.', 'Sipho D.', 'Ayesha K.'] },
  { id: '#CF-45824', affected: 27, confirmations: ['Naledi P.'] },
  { id: '#CF-45820', affected: 47, confirmations: ['Riaan V.', 'Fatima S.'] },
  { id: '#CF-45819', affected: 18, confirmations: ['Jabu N.'] },
  { id: '#CF-45815', affected: 31, confirmations: ['Peter L.', 'Zanele K.'] },
  { id: '#CF-45823', affected: 12, confirmations: [] },
];

export const SEED_THREADS: TicketThread[] = [
  {
    id: '#CF-45820',
    messages: [
      {
        id: 'M-1',
        from: 'resident',
        author: 'Mpho S.',
        text: 'The leak is getting worse — it now reaches the pedestrian crossing.',
        at: '14 Oct 2026, 13:58',
      },
      {
        id: 'M-2',
        from: 'municipality',
        author: 'Water & Sanitation',
        text: 'Thank you. We have escalated this to the emergency response team.',
        at: '14 Oct 2026, 14:14',
      },
      {
        id: 'M-3',
        from: 'municipality',
        author: 'Water & Sanitation',
        text: 'Team dispatched at 14:32. Rapid Water Response 2 is on site to isolate the valve.',
        at: '14 Oct 2026, 14:33',
      },
      {
        id: 'M-4',
        from: 'resident',
        author: 'Mpho S.',
        text: 'Thank you — traffic cones are up now, that already helps.',
        at: '14 Oct 2026, 14:51',
      },
    ],
  },
  {
    id: '#CF-45821',
    messages: [
      {
        id: 'M-1',
        from: 'resident',
        author: 'Mpho S.',
        text: 'Is the resurfacing still planned for today? Two more cars hit this hole this morning.',
        at: '14 Oct 2026, 10:05',
      },
      {
        id: 'M-2',
        from: 'municipality',
        author: 'Roads & Stormwater',
        text: 'The asphalt patching vehicle is en route. We expect the patch to be in place before the afternoon peak.',
        at: '14 Oct 2026, 11:24',
      },
    ],
  },
];

export const SEED_RESOLUTIONS: ResolutionProof[] = [
  {
    id: '#CF-45824',
    before: POTHOLE_IMAGE,
    after: REPAIRED_ROAD_IMAGE,
    note: 'Asphalt patch compacted, lane reopened and road markings restored.',
    at: '14 Oct 2026, 15:20',
    residentConfirmed: null,
  },
];

export const SEED_RATINGS: ResidentRating[] = [
  {
    id: '#CF-45818',
    stars: 5,
    comment: 'Signal fixed the same morning — the intersection flows properly again.',
    at: '11 Oct 2026, 12:40',
  },
  {
    id: '#CF-45817',
    stars: 4,
    comment: 'Drain cleared quickly. A lid would stop leaves falling straight back in.',
    at: '11 Oct 2026, 09:12',
  },
];
