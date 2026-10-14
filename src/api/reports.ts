import type { HazardReport, ReportStatus } from '../types';

type NewHazardReport = Omit<HazardReport, 'id'>;

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  const body: unknown = await response.json();

  if (!response.ok) {
    const message =
      typeof body === 'object' && body !== null && 'error' in body &&
      typeof body.error === 'string'
        ? body.error
        : `Request failed with status ${response.status}.`;
    throw new Error(message);
  }

  return body as T;
}

export function getReports(): Promise<HazardReport[]> {
  return request<HazardReport[]>('/api/reports');
}

export function createReport(report: NewHazardReport): Promise<HazardReport> {
  return request<HazardReport>('/api/reports', {
    method: 'POST',
    body: JSON.stringify(report),
  });
}


export function updateReportStatus(
  id: string,
  status: ReportStatus
): Promise<HazardReport> {
  return request<HazardReport>(
    `/api/reports/${encodeURIComponent(id)}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }
  );
}
