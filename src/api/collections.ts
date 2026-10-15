import type {
  Announcement,
  CivicAlert,
  CivicDocument,
  CommunityEvent,
  Discussion,
  InfrastructureProject,
  Poll,
} from '../types';
import { patch, post, request } from './request';

export function listAlerts(): Promise<CivicAlert[]> {
  return request<CivicAlert[]>('/api/c/alerts');
}

export function listAnnouncements(): Promise<Announcement[]> {
  return request<Announcement[]>('/api/c/announcements');
}

export function listDiscussions(): Promise<Discussion[]> {
  return request<Discussion[]>('/api/c/discussions');
}

export function listPolls(): Promise<Poll[]> {
  return request<Poll[]>('/api/c/polls');
}

export function listEvents(): Promise<CommunityEvent[]> {
  return request<CommunityEvent[]>('/api/c/events');
}

export function listDocuments(): Promise<CivicDocument[]> {
  return request<CivicDocument[]>('/api/c/documents');
}

export function listProjects(): Promise<InfrastructureProject[]> {
  return request<InfrastructureProject[]>('/api/c/projects');
}

export type CollectionName =
  | 'alerts'
  | 'announcements'
  | 'discussions'
  | 'polls'
  | 'events'
  | 'documents'
  | 'projects'
  | 'threads'
  | 'engagements'
  | 'resolutions'
  | 'ratings';

export function updateCollectionRecord<T>(
  name: CollectionName,
  id: string,
  value: unknown
): Promise<T> {
  return patch<T>(`/api/c/${name}/${encodeURIComponent(id)}`, value);
}

export function createCollectionRecord<T>(
  name: CollectionName,
  record: unknown
): Promise<T> {
  return post<T>(`/api/c/${name}`, record);
}

/** Loads every shared collection the resident-facing views need, tolerating failures. */
export interface CivicCollections {
  alerts: CivicAlert[];
  announcements: Announcement[];
  discussions: Discussion[];
  polls: Poll[];
  events: CommunityEvent[];
  documents: CivicDocument[];
  projects: InfrastructureProject[];
}

const EMPTY: CivicCollections = {
  alerts: [],
  announcements: [],
  discussions: [],
  polls: [],
  events: [],
  documents: [],
  projects: [],
};

export async function loadCollections(): Promise<CivicCollections> {
  const [alerts, announcements, discussions, polls, events, documents, projects] =
    await Promise.all([
      listAlerts().catch(() => EMPTY.alerts),
      listAnnouncements().catch(() => EMPTY.announcements),
      listDiscussions().catch(() => EMPTY.discussions),
      listPolls().catch(() => EMPTY.polls),
      listEvents().catch(() => EMPTY.events),
      listDocuments().catch(() => EMPTY.documents),
      listProjects().catch(() => EMPTY.projects),
    ]);
  return { alerts, announcements, discussions, polls, events, documents, projects };
}
