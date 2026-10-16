import React from 'react';
import type { HazardReport, ReportStatus } from '../types';
import { REPORT_STATUSES } from '../types';
import {
  computeAiReviewMetrics,
  computeDepartmentStats,
  computeInsights,
  computeMunicipalityStats,
} from '../utils/stats';
import { parseLooseDate } from '../utils/dates';
import { Card, EmptyState, SectionHeading, StatusBadge } from './ui';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Clock,
  Gauge,
  Inbox,
  Info,
  TrendingUp,
} from 'lucide-react';

interface TransparencyViewProps {
  reports: HazardReport[];
}

const STATUS_BARS: Record<ReportStatus, string> = {
  Received: 'bg-slate-400',
  Verified: 'bg-sky-500',
  Assigned: 'bg-amber-500',
  'In Progress': 'bg-indigo-500',
  Resolved: 'bg-emerald-500',
  Rejected: 'bg-rose-500',
};

export const TransparencyView: React.FC<TransparencyViewProps> = ({ reports }) => {
  const stats = computeMunicipalityStats(reports);
  const departments = computeDepartmentStats(reports);
  const insights = computeInsights(reports);
  const aiReview = computeAiReviewMetrics(reports);

  const kpis = [
    { label: 'Reports received', value: String(stats.reportsReceived), accent: 'text-slate-800', icon: <Inbox className="w-4 h-4" /> },
    { label: 'Resolution rate', value: `${stats.resolutionRate}%`, accent: 'text-emerald-700', icon: <CheckCircle2 className="w-4 h-4" /> },
    { label: 'Open now', value: String(stats.open), accent: 'text-sky-700', icon: <Clock className="w-4 h-4" /> },
    { label: 'Awaiting assignment', value: String(stats.awaitingAssignment), accent: 'text-amber-700', icon: <ClipboardList className="w-4 h-4" /> },
    { label: 'High priority', value: String(stats.highPriority), accent: 'text-rose-700', icon: <Gauge className="w-4 h-4" /> },
    { label: 'Avg. resolution', value: `${stats.avgResolutionDays} d`, accent: 'text-indigo-700', icon: <TrendingUp className="w-4 h-4" /> },
  ];

  const statusCounts = REPORT_STATUSES.map((status) => ({
    status,
    count: reports.filter((report) => report.status === status).length,
  }));
  const maxCount = Math.max(1, ...statusCounts.map((entry) => entry.count));

  const recentWins = reports
    .filter((report) => report.status === 'Resolved')
    .sort(
      (left, right) => (parseLooseDate(right.date) ?? 0) - (parseLooseDate(left.date) ?? 0)
    )
    .slice(0, 6);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
      <header className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#234E35]/70">
          Open data · Civic transparency
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
          How the municipality is performing
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Live figures computed from every hazard report filed on CivicFix — no cherry-picking,
          no quarterly delay.
        </p>
      </header>

      {reports.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No reports to publish yet"
            hint="Performance figures will appear as soon as residents start filing hazards."
          />
        </div>
      ) : (
        <>
          <section className="mt-6">
            <SectionHeading
              title="Headline figures"
              hint="Updated live from the report feed."
            />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {kpis.map((kpi) => (
                <Card key={kpi.label} className="p-3 sm:p-4">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    <span className="text-[#234E35]/70">{kpi.icon}</span>
                    {kpi.label}
                  </p>
                  <p className={`mt-1 text-2xl font-bold ${kpi.accent}`}>{kpi.value}</p>
                </Card>
              ))}
            </div>
          </section>

          <section className="mt-8">
            <SectionHeading
              title="AI assistance review"
              hint="Resident edits provide a workflow signal; they are not verified model accuracy."
            />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {[
                { label: 'Reports analysed', value: aiReview.reportsAnalysed },
                { label: 'Suggestions accepted', value: aiReview.accepted },
                { label: 'Suggestions edited', value: aiReview.edited },
                { label: 'Unclassified', value: aiReview.unclassified },
                {
                  label: 'Acceptance rate',
                  value: aiReview.acceptanceRate === null ? '—' : `${aiReview.acceptanceRate}%`,
                },
                {
                  label: 'Avg. model time',
                  value: aiReview.averageInferenceMs === null
                    ? '—'
                    : `${aiReview.averageInferenceMs} ms`,
                },
              ].map((metric) => (
                <Card key={metric.label} className="p-3 sm:p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    {metric.label}
                  </p>
                  <p className="mt-1 text-2xl font-bold text-[#234E35]">{metric.value}</p>
                </Card>
              ))}
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
              Acceptance rate = accepted AI suggestions ÷ suggestions accepted or edited at submission.
              Unclassified images are excluded. Average model time excludes first-time model download.
              Acceptance is not a precision, recall, or safety measure; evaluate against a consented,
              human-labelled dataset before operational use.
            </p>
          </section>

          <section className="mt-8">
            <SectionHeading
              title="Department performance"
              hint="Open and resolved tickets with average resolution time."
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {departments.map((dept) => {
                const total = dept.open + dept.resolved;
                const rate = total === 0 ? 0 : Math.round((dept.resolved / total) * 100);
                return (
                  <Card key={dept.department}>
                    <p className="text-sm font-bold text-slate-800">{dept.department}</p>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-xl bg-slate-50 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Open</p>
                        <p className="text-lg font-bold text-slate-800">{dept.open}</p>
                      </div>
                      <div className="rounded-xl bg-emerald-50 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700/70">Resolved</p>
                        <p className="text-lg font-bold text-emerald-700">{dept.resolved}</p>
                      </div>
                      <div className="rounded-xl bg-sky-50 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-sky-700/70">Avg. days</p>
                        <p className="text-lg font-bold text-sky-700">{dept.avgDays}</p>
                      </div>
                    </div>
                    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-[#234E35] transition-all"
                        style={{ width: `${rate}%` }}
                      />
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Resolution rate</span>
                      <span className="font-semibold text-slate-600">{rate}%</span>
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>

          <section className="mt-8">
            <SectionHeading
              title="Insights"
              hint="Automated trend analysis over the last 60 days of reports."
            />
            {insights.length === 0 ? (
              <EmptyState
                title="No trends to report yet"
                hint="Insights appear once enough reports are filed to compare periods."
              />
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {insights.map((insight) => {
                  const warning = insight.tone === 'warning';
                  return (
                    <Card
                      key={insight.id}
                      className={
                        warning
                          ? 'border-amber-200 bg-amber-50/60'
                          : 'border-sky-200 bg-sky-50/60'
                      }
                    >
                      <div className="flex items-start gap-2.5">
                        <span
                          className={`rounded-lg p-1.5 ${
                            warning ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'
                          }`}
                        >
                          {warning ? <AlertTriangle className="w-4 h-4" /> : <Info className="w-4 h-4" />}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-800">{insight.title}</p>
                          <p className="mt-1 text-xs leading-relaxed text-slate-600">
                            {insight.detail}
                          </p>
                          <p
                            className={`mt-2 flex items-start gap-1.5 text-xs font-semibold ${
                              warning ? 'text-amber-800' : 'text-sky-800'
                            }`}
                          >
                            <ArrowRight className="mt-0.5 w-3.5 h-3.5 shrink-0" />
                            {insight.action}
                          </p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>

          <section className="mt-8">
            <SectionHeading
              title="Recent wins"
              hint="Latest tickets closed by municipal crews."
            />
            {recentWins.length === 0 ? (
              <EmptyState title="Nothing resolved yet" hint="Closed tickets will be listed here." />
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {recentWins.map((report) => (
                  <Card key={report.id}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-400">{report.id}</span>
                      <StatusBadge status="Resolved" />
                    </div>
                    <p className="mt-2 text-sm font-semibold text-slate-800">{report.subType}</p>
                    <p className="mt-1 font-mono text-[11px] text-slate-500">{report.location}</p>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                      <span>{report.department}</span>
                      <span>{report.date}</span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>

          <section className="mt-8">
            <SectionHeading
              title="Report volume by status"
              hint="Where the whole backlog sits right now."
            />
            <Card>
              <div className="space-y-3">
                {statusCounts.map((entry) => (
                  <div key={entry.status} className="flex items-center gap-3">
                    <div className="w-40 shrink-0 sm:w-48">
                      <StatusBadge status={entry.status} />
                    </div>
                    <div className="h-4 flex-1 overflow-hidden rounded bg-slate-100">
                      <div
                        className={`h-full rounded ${STATUS_BARS[entry.status]}`}
                        style={{ width: `${(entry.count / maxCount) * 100}%` }}
                      />
                    </div>
                    <span className="w-8 shrink-0 text-right text-xs font-bold text-slate-600">
                      {entry.count}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400">
                <BarChart3 className="w-3.5 h-3.5" />
                Bar length is proportional to the busiest status in the feed.
              </p>
            </Card>
          </section>
        </>
      )}
    </div>
  );
};
