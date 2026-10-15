import type {
  DuplicateMatch,
  HazardReport,
  ReportEngagement,
  ReportStatus,
  ResidentRating,
  ResolutionProof,
  TicketMessage,
} from '../types';
import { patch, post, put, request } from './request';

type NewHazardReport = Omit<HazardReport, 'id'>;

export function getReports(): Promise<HazardReport[]> {
  return request<HazardReport[]>('/api/reports');
}

export function createReport(report: NewHazardReport): Promise<HazardReport> {
  return post<HazardReport>('/api/reports', report);
}

export function updateReportStatus(
  id: string,
  status: ReportStatus
): Promise<HazardReport> {
  return patch<HazardReport>(`/api/reports/${encodeURIComponent(id)}/status`, { status });
}

// --- duplicate detection ---------------------------------------------------

export interface DuplicateProbe {
  subType: string;
  hazardType?: string;
  location: string;
  id?: string;
}

export interface DuplicateDetection {
  matches: DuplicateMatch[];
  radiusMetres: number;
  windowDays: number;
}

export function detectDuplicates(probe: DuplicateProbe): Promise<DuplicateDetection> {
  return post<DuplicateDetection>('/api/reports/detect-duplicates', probe);
}

// --- community engagement --------------------------------------------------

export function getEngagement(id: string): Promise<ReportEngagement> {
  return request<ReportEngagement>(`/api/reports/${encodeURIComponent(id)}/engagement`);
}

export function confirmIssue(id: string, resident: string): Promise<ReportEngagement> {
  return post<ReportEngagement>(`/api/reports/${encodeURIComponent(id)}/confirm`, {
    resident,
  });
}

// --- proof of resolution ---------------------------------------------------

export function getResolution(id: string): Promise<ResolutionProof | null> {
  return request<ResolutionProof | null>(`/api/reports/${encodeURIComponent(id)}/resolution`);
}

export interface ResolutionInput {
  before: string;
  after: string;
  note?: string;
}

export function uploadResolution(id: string, proof: ResolutionInput): Promise<ResolutionProof> {
  return put<ResolutionProof>(`/api/reports/${encodeURIComponent(id)}/resolution`, proof);
}

export function setResolutionConfirmed(
  id: string,
  residentConfirmed: boolean
): Promise<{ resolution: ResolutionProof; report: HazardReport }> {
  return patch<{ resolution: ResolutionProof; report: HazardReport }>(
    `/api/reports/${encodeURIComponent(id)}/resolution`,
    { residentConfirmed }
  );
}

// --- resident rating -------------------------------------------------------

export function getRating(id: string): Promise<ResidentRating | null> {
  return request<ResidentRating | null>(`/api/reports/${encodeURIComponent(id)}/rating`);
}

export function submitRating(
  id: string,
  stars: number,
  comment?: string
): Promise<ResidentRating> {
  return post<ResidentRating>(`/api/reports/${encodeURIComponent(id)}/rating`, {
    stars,
    comment,
  });
}

// --- ticket messages -------------------------------------------------------

export function getMessages(id: string): Promise<TicketMessage[]> {
  return request<TicketMessage[]>(`/api/reports/${encodeURIComponent(id)}/messages`);
}

export interface MessageInput {
  from: 'resident' | 'municipality';
  author?: string;
  text: string;
}

export function sendMessage(id: string, message: MessageInput): Promise<TicketMessage> {
  return post<TicketMessage>(`/api/reports/${encodeURIComponent(id)}/messages`, message);
}
