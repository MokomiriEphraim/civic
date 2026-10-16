export type StepNumber = 1 | 2 | 3 | 4;

export type HazardSeverity = 'Low' | 'Medium' | 'High' | 'Critical';

export type ReportStatus =
  | 'Received'
  | 'Verified'
  | 'Assigned'
  | 'In Progress'
  | 'Resolved'
  | 'Rejected';

export const REPORT_STATUSES: ReportStatus[] = [
  'Received',
  'Verified',
  'Assigned',
  'In Progress',
  'Resolved',
  'Rejected',
];

export const OPEN_STATUSES: ReportStatus[] = [
  'Received',
  'Verified',
  'Assigned',
  'In Progress',
];

export const HAZARD_SEVERITIES: HazardSeverity[] = ['Low', 'Medium', 'High', 'Critical'];

export interface HazardReport {
  id: string; // e.g., "#CF-45821"
  hazardType: string; // e.g., "Road Hazard (Pothole)"
  subType: string; // e.g., "Pothole"
  department: string; // e.g., "Roads & Stormwater"
  departmentUnit?: string; // e.g., "(Maintenance & Repairs)"
  location: string; // e.g., "-33.9249, 18.4241"
  address?: string; // e.g., "Kloof Nek Rd & Camp St, Cape Town"
  status: ReportStatus;
  date: string; // e.g., "14 Oct 2026"
  severity: HazardSeverity;
  description: string;
  photoUrl: string;
  contact?: string;
  assignedTeam?: string;
  notes?: string;
  detectedAt?: string;
  aiAssessment?: AiAssessment;
  timeline?: {
    stage: string;
    timestamp: string;
    done: boolean;
    note?: string;
  }[];
}

export interface AiAssessment {
  model: string;
  label: string;
  score: number;
  inferenceMs: number;
  outcome: 'accepted' | 'edited' | 'unclassified';
}

export type ActiveView =
  | 'landing'
  | 'report'
  | 'home'
  | 'map'
  | 'transparency'
  | 'ticket'
  | 'community'
  | 'bulletins'
  | 'discover'
  | 'ops'
  | 'worker';

export type UserRole = 'resident' | 'staff';

export type AlertLevel = 'emergency' | 'important' | 'info';

export type AlertCategory =
  | 'Infrastructure'
  | 'Water'
  | 'Roads'
  | 'Electricity'
  | 'Waste'
  | 'Traffic'
  | 'Emergencies'
  | 'Community events';

export const ALERT_CATEGORIES: AlertCategory[] = [
  'Infrastructure',
  'Water',
  'Roads',
  'Electricity',
  'Waste',
  'Traffic',
  'Emergencies',
  'Community events',
];

export type CommunityCategory =
  | 'Roads'
  | 'Water'
  | 'Waste'
  | 'Traffic'
  | 'Electricity'
  | 'Development'
  | 'Parks'
  | 'Community'
  | 'Safety';

export const COMMUNITY_CATEGORIES: CommunityCategory[] = [
  'Roads',
  'Water',
  'Waste',
  'Traffic',
  'Electricity',
  'Development',
  'Parks',
  'Community',
  'Safety',
];

export interface CivicAlert {
  id: string;
  level: AlertLevel;
  title: string;
  body: string;
  category: AlertCategory;
  area: string;
  createdAt: string;
  active: boolean;
}

export interface Announcement {
  id: string;
  municipality: string;
  title: string;
  body: string;
  date: string;
  category: CommunityCategory;
  verified: boolean;
}

export interface DiscussionComment {
  id: string;
  author: string;
  text: string;
  at: string;
}

export interface Discussion {
  id: string;
  title: string;
  body: string;
  category: CommunityCategory;
  author: string;
  area: string;
  createdAt: string;
  photos: string[];
  votes: number;
  comments: DiscussionComment[];
}

export interface PollOption {
  id: string;
  label: string;
  votes: number;
}

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  createdAt: string;
  active: boolean;
}

export interface CommunityEvent {
  id: string;
  title: string;
  kind: string;
  date: string;
  time: string;
  location: string;
  description: string;
}

export interface CivicDocument {
  id: string;
  title: string;
  category: string;
  description: string;
  publishedAt: string;
  municipality: string;
  pages: number;
}

export interface ProjectUpdate {
  date: string;
  text: string;
}

export interface InfrastructureProject {
  id: string;
  name: string;
  category: string;
  percent: number;
  budget: string;
  start: string;
  expectedEnd: string;
  location: string;
  updates: ProjectUpdate[];
}

export interface TicketMessage {
  id: string;
  from: 'resident' | 'municipality';
  author: string;
  text: string;
  at: string;
}

/** `id` is the ticket id (e.g. "#CF-45821"). */
export interface TicketThread {
  id: string;
  messages: TicketMessage[];
}

/** `id` is the ticket id. */
export interface ReportEngagement {
  id: string;
  affected: number;
  confirmations: string[];
}

/** `id` is the ticket id. */
export interface ResolutionProof {
  id: string;
  before: string;
  after: string;
  note?: string;
  at: string;
  residentConfirmed: boolean | null;
}

/** `id` is the ticket id. */
export interface ResidentRating {
  id: string;
  stars: number;
  comment?: string;
  at: string;
}

export type PriorityBand = 'Critical' | 'High' | 'Moderate' | 'Low';

export interface PriorityBreakdown {
  score: number;
  band: PriorityBand;
  factors: { label: string; points: number }[];
}

export interface DuplicateMatch {
  id: string;
  distanceMeters: number;
  daysAgo: number;
  subType: string;
  address?: string;
  status: ReportStatus;
  affected: number;
}

export interface MunicipalityStats {
  reportsReceived: number;
  resolved: number;
  resolutionRate: number;
  avgResolutionDays: number;
  open: number;
  highPriority: number;
  awaitingAssignment: number;
}

export interface DepartmentStat {
  department: string;
  open: number;
  resolved: number;
  avgDays: number;
}

export interface AiInsight {
  id: string;
  tone: 'warning' | 'info';
  title: string;
  detail: string;
  action: string;
}

export interface AssistantSuggestion {
  label: string;
  view?: ActiveView;
  startReport?: boolean;
}

export interface AssistantReply {
  text: string;
  suggestions: AssistantSuggestion[];
}
