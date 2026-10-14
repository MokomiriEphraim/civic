export type StepNumber = 1 | 2 | 3 | 4;

export type HazardSeverity = 'Low' | 'Medium' | 'High' | 'Critical';

export type ReportStatus = 'Assigned' | 'In Progress' | 'Resolved' | 'Rejected';

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
  timeline?: {
    stage: string;
    timestamp: string;
    done: boolean;
    note?: string;
  }[];
}

export type ActiveView = 'landing' | 'report' | 'dashboard';
