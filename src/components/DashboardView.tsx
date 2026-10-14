import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronRight,
  ChevronLeft,
  Search,
  Filter,
  Plus,
  MapPin,
  AlertTriangle,
  Droplets,
  Trash2,
  TrafficCone,
  Lightbulb,
  X,
  ExternalLink,
  Building2,
  Calendar,
} from 'lucide-react';
import { HazardReport, ReportStatus } from '../types';
import { filterReports, paginateReports } from '../utils/reportList';
import { CivicLogo } from './CivicLogo';
import { MapModal } from './MapModal';

interface DashboardViewProps {
  reports: HazardReport[];
  onStartReport: () => void;
  onGoHome: () => void;
  onUpdateReportStatus: (
    id: string,
    status: ReportStatus
  ) => Promise<HazardReport>;
  isLoading: boolean;
  loadError: string | null;
  onRetryLoad: () => void;
  currentUser: { name: string };
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  reports,
  onStartReport,
  onGoHome,
  onUpdateReportStatus,
  isLoading,
  loadError,
  onRetryLoad,
  currentUser,
}) => {
  const [activeNav, setActiveNav] = useState<'dashboard' | 'reports'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'ALL' | ReportStatus>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  // Selected report for inspection modal
  const [selectedReport, setSelectedReport] = useState<HazardReport | null>(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [updatingReportId, setUpdatingReportId] = useState<string | null>(null);
  const [statusUpdateError, setStatusUpdateError] = useState<string | null>(null);
  const reportsSectionRef = useRef<HTMLDivElement>(null);

  // Status metrics calculation
  const totalReportsCount = reports.length;
  const assignedCount = reports.filter((r) => r.status === 'Assigned').length;
  const inProgressCount = reports.filter((r) => r.status === 'In Progress').length;
  const resolvedCount = reports.filter((r) => r.status === 'Resolved').length;
  const rejectedCount = reports.filter((r) => r.status === 'Rejected').length;

  // Filtered reports
  const filteredReports = useMemo(() => {
    return filterReports(reports, searchQuery, selectedStatusFilter);
  }, [reports, searchQuery, selectedStatusFilter]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredReports.length / pageSize) || 1;
  const paginatedReports = useMemo(() => {
    return paginateReports(filteredReports, currentPage, pageSize);
  }, [filteredReports, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  useEffect(() => {
    if (!selectedReport) return;
    const latestReport = reports.find((report) => report.id === selectedReport.id);
    if (latestReport) setSelectedReport(latestReport);
  }, [reports, selectedReport]);

  const handleStatusChange = async (status: ReportStatus) => {
    if (!selectedReport || updatingReportId) return;
    setUpdatingReportId(selectedReport.id);
    setStatusUpdateError(null);
    try {
      const updatedReport = await onUpdateReportStatus(selectedReport.id, status);
      setSelectedReport(updatedReport);
    } catch (error) {
      setStatusUpdateError(
        error instanceof Error ? error.message : 'Could not update the report status.'
      );
    } finally {
      setUpdatingReportId(null);
    }
  };

  // Icon selector based on hazard subtype
  const getHazardIcon = (subType: string) => {
    const s = subType.toLowerCase();
    if (s.includes('water') || s.includes('drain')) {
      return (
        <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center flex-shrink-0">
          <Droplets className="w-4 h-4" />
        </div>
      );
    }
    if (s.includes('dump') || s.includes('waste') || s.includes('bin')) {
      return (
        <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center flex-shrink-0">
          <Trash2 className="w-4 h-4" />
        </div>
      );
    }
    if (s.includes('traffic') || s.includes('light') || s.includes('lamp')) {
      return (
        <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0">
          <Lightbulb className="w-4 h-4" />
        </div>
      );
    }
    return (
      <div className="w-7 h-7 rounded-lg bg-orange-100 text-[#E65A2C] flex items-center justify-center flex-shrink-0">
        <TrafficCone className="w-4 h-4" />
      </div>
    );
  };

  // Status Badge Renderer
  const renderStatusBadge = (status: ReportStatus) => {
    switch (status) {
      case 'In Progress':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100/90 text-amber-800 border border-amber-200/60">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            In Progress
          </span>
        );
      case 'Assigned':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-100/90 text-sky-800 border border-sky-200/60">
            <CheckCircle2 className="w-3 h-3 text-sky-600" />
            Assigned
          </span>
        );
      case 'Resolved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100/90 text-emerald-800 border border-emerald-200/60">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Resolved
          </span>
        );
      case 'Rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100/90 text-rose-800 border border-rose-200/60">
            <XCircle className="w-3 h-3 text-rose-600" />
            Rejected
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F8F5] flex flex-col md:flex-row">
      {/* ---------------------------------------------------- */}
      {/* SIDEBAR */}
      {/* ---------------------------------------------------- */}
      <aside className="w-full md:w-60 bg-white border-r border-slate-200/90 p-5 flex flex-col justify-between flex-shrink-0">
        <div>
          {/* Logo */}
          <div className="mb-8">
            <CivicLogo showTagline={false} onClick={onGoHome} className="cursor-pointer" />
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            <button
              onClick={() => {
                setActiveNav('dashboard');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition ${
                activeNav === 'dashboard'
                  ? 'bg-[#234E35] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => {
                setActiveNav('reports');
                reportsSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition ${
                activeNav === 'reports'
                  ? 'bg-[#234E35] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>My Reports</span>
            </button>

          </nav>
        </div>

        {/* Sidebar Quick Action & Return */}
        <div className="pt-6 border-t border-slate-100 mt-6 space-y-2">
          <button
            onClick={onStartReport}
            className="w-full py-2.5 px-3.5 rounded-xl bg-[#E65A2C] hover:bg-[#D44E22] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Report Hazard</span>
          </button>

          <button
            onClick={onGoHome}
            className="w-full py-2 px-3 rounded-lg text-slate-500 hover:text-slate-800 text-xs font-medium text-center"
          >
            ← Back to Homepage
          </button>
        </div>
      </aside>

      {/* ---------------------------------------------------- */}
      {/* MAIN CONTENT AREA */}
      {/* ---------------------------------------------------- */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-200/90 px-6 sm:px-8 flex items-center justify-between sticky top-0 z-10">
          <div className="text-xs text-slate-500 hidden sm:block">
            Cape Town • CivicFix report tracking demo
          </div>

          {/* User profile dropdown button */}
          <div className="flex items-center gap-3 ml-auto">
            <div className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full border border-slate-200">
              <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                MS
              </div>
              <span className="text-xs font-semibold text-slate-800">
                {currentUser.name}
              </span>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="p-4 sm:p-8 flex-1 max-w-7xl w-full mx-auto">
          {/* Heading */}
          <div className="mb-6">
            <h1
              className="text-2xl sm:text-3xl font-extrabold text-[#163D25] mb-1"
              style={{ fontFamily: "'Space Grotesk', 'Plus Jakarta Sans', sans-serif" }}
            >
              My Reports
            </h1>
            <p className="text-xs sm:text-sm text-slate-600">
              Track the status of your submitted hazards.
            </p>
          </div>

          {isLoading ? (
            <p role="status" className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
              Loading reports from the backend...
            </p>
          ) : loadError ? (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
              <p>Reports could not be loaded: {loadError}</p>
              <button type="button" onClick={onRetryLoad} className="mt-3 font-semibold underline">
                Retry
              </button>
            </div>
          ) : (
          <>
          {/* 4 Metric Cards Row */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-8">
            {/* 1. Total Reports */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 flex items-center gap-3.5 shadow-2xs">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-[#234E35] border border-emerald-100 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-[#234E35]" />
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500 block">
                  Total Reports
                </span>
                <span className="text-xl sm:text-2xl font-extrabold text-slate-900 block leading-tight">
                  {totalReportsCount}
                </span>
              </div>
            </div>

            {/* Assigned */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 flex items-center gap-3.5 shadow-2xs">
              <div className="w-11 h-11 rounded-xl bg-sky-50 text-sky-700 border border-sky-100 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-5 h-5 text-sky-700" />
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500 block">Assigned</span>
                <span className="text-xl sm:text-2xl font-extrabold text-slate-900 block leading-tight">
                  {assignedCount}
                </span>
              </div>
            </div>

            {/* 2. In Progress */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 flex items-center gap-3.5 shadow-2xs">
              <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500 block">
                  In Progress
                </span>
                <span className="text-xl sm:text-2xl font-extrabold text-slate-900 block leading-tight">
                  {inProgressCount}
                </span>
              </div>
            </div>

            {/* 3. Resolved */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 flex items-center gap-3.5 shadow-2xs">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500 block">
                  Resolved
                </span>
                <span className="text-xl sm:text-2xl font-extrabold text-slate-900 block leading-tight">
                  {resolvedCount}
                </span>
              </div>
            </div>

            {/* 4. Rejected */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 flex items-center gap-3.5 shadow-2xs">
              <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center flex-shrink-0">
                <XCircle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500 block">
                  Rejected
                </span>
                <span className="text-xl sm:text-2xl font-extrabold text-slate-900 block leading-tight">
                  {rejectedCount}
                </span>
              </div>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div ref={reportsSectionRef} className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs mb-6">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-center justify-between">
              {/* Search input */}
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search ID, hazard, location..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#234E35]"
                />
              </div>

              {/* Status pills filter */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                <span className="text-[11px] font-semibold text-slate-400 mr-1 flex items-center gap-1">
                  <Filter className="w-3 h-3" /> Filter:
                </span>
                {(['ALL', 'In Progress', 'Assigned', 'Resolved', 'Rejected'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => {
                      setSelectedStatusFilter(st);
                      setCurrentPage(1);
                    }}
                    className={`text-[11px] px-2.5 py-1 rounded-full transition font-medium whitespace-nowrap ${
                      selectedStatusFilter === st
                        ? 'bg-[#234E35] text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {st === 'ALL' ? 'All' : st}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">ID</th>
                    <th className="py-3 px-4">Hazard Type</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {paginatedReports.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        {reports.length === 0
                          ? 'No reports have been submitted yet.'
                          : 'No reports match your filters.'}
                      </td>
                    </tr>
                  ) : (
                    paginatedReports.map((report) => (
                      <tr
                        key={report.id}
                        className="hover:bg-slate-50/80 transition group"
                      >
                        {/* ID */}
                        <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap font-mono text-[11px]">
                          {report.id}
                        </td>

                        {/* Hazard Type with icon */}
                        <td className="py-3.5 px-4 font-semibold text-slate-800 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            {getHazardIcon(report.subType)}
                            <span>{report.subType}</span>
                          </div>
                        </td>

                        {/* Department */}
                        <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                          {report.department}
                        </td>

                        {/* Location */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[11px]">
                            <MapPin className="w-3.5 h-3.5 text-emerald-700 flex-shrink-0" />
                            <span>{report.location}</span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {renderStatusBadge(report.status)}
                        </td>

                        {/* Date */}
                        <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap text-[11px]">
                          {report.date}
                        </td>

                        {/* Arrow > */}
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedReport(report)}
                            aria-label={`View report ${report.id}`}
                            className="p-1 rounded-full group-hover:bg-slate-200/60 inline-flex items-center justify-center text-slate-400 group-hover:text-slate-700 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#234E35]"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer with Pagination */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>
                Showing {Math.min((currentPage - 1) * pageSize + 1, filteredReports.length)}-
                {Math.min(currentPage * pageSize, filteredReports.length)} of {filteredReports.length}
              </span>

              {/* Pagination controls */}
              <div className="flex items-center gap-1.5 select-none">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  className="w-7 h-7 rounded-md border border-slate-200 flex items-center justify-center hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
                  <button
                    key={pageNumber}
                    onClick={() => setCurrentPage(pageNumber)}
                    className={`w-7 h-7 rounded-md text-xs font-semibold transition ${
                      currentPage === pageNumber
                        ? 'bg-[#234E35] text-white'
                        : 'border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {pageNumber}
                  </button>
                ))}

                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  className="w-7 h-7 rounded-md border border-slate-200 flex items-center justify-center hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
          </>
          )}
        </main>
      </div>

      {/* ---------------------------------------------------- */}
      {/* TICKET INSPECTION MODAL / DRAWER */}
      {/* ---------------------------------------------------- */}
      {selectedReport && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedReport(null);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setSelectedReport(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-dialog-title"
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200"
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span id="report-dialog-title" className="font-extrabold text-base sm:text-lg text-slate-900 font-mono">
                  Ticket {selectedReport.id}
                </span>
                {renderStatusBadge(selectedReport.status)}
              </div>
              <button
                type="button"
                aria-label="Close report details"
                onClick={() => setSelectedReport(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Report photo */}
              <div className="relative rounded-xl overflow-hidden bg-slate-900 max-h-64 flex items-center justify-center">
                <img
                  src={selectedReport.photoUrl}
                  alt={selectedReport.subType}
                  className="w-full h-64 object-cover"
                />
                <div className="absolute top-3 right-3 px-2.5 py-1 rounded bg-slate-900/80 text-white text-[11px] font-bold shadow-xs">
                  Report photo
                </div>
              </div>

              {/* Primary Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Hazard Classification
                  </span>
                  <span className="font-bold text-slate-900 text-sm block">
                    {selectedReport.hazardType}
                  </span>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-slate-500">Severity:</span>
                    <span className="text-xs font-bold text-white px-2 py-0.5 rounded-full bg-[#E65A2C]">
                      {selectedReport.severity}
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Department
                  </span>
                  <span className="font-bold text-slate-900 text-sm block">
                    {selectedReport.department}
                  </span>
                  {selectedReport.departmentUnit && (
                    <span className="text-xs text-slate-500">{selectedReport.departmentUnit}</span>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <label htmlFor="report-status" className="block text-xs font-semibold text-slate-700 mb-2">
                  Report status
                </label>
                <select
                  id="report-status"
                  value={selectedReport.status}
                  disabled={updatingReportId === selectedReport.id}
                  onChange={(event) => void handleStatusChange(event.target.value as ReportStatus)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:cursor-wait disabled:opacity-60"
                >
                  {(['Assigned', 'In Progress', 'Resolved', 'Rejected'] as const).map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
                {updatingReportId === selectedReport.id && (
                  <p role="status" className="mt-2 text-xs text-slate-500">Saving status...</p>
                )}
                {statusUpdateError && (
                  <p role="alert" className="mt-2 text-xs text-red-700">{statusUpdateError}</p>
                )}
              </div>

              {/* Location & Address */}
              <div className="p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-700 block">
                    Location Coordinates
                  </span>
                  <span className="font-mono text-xs text-slate-600">
                    {selectedReport.location}
                  </span>
                  {selectedReport.address && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      {selectedReport.address}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setShowMapModal(true)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-50 text-[#234E35] border border-emerald-200 text-xs font-semibold hover:bg-emerald-100 transition inline-flex items-center gap-1.5"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>View on map</span>
                </button>
              </div>

              {/* Description */}
              <div>
                <span className="text-xs font-semibold text-slate-700 block mb-1">
                  Report Description
                </span>
                <p className="text-xs sm:text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200/60 leading-relaxed">
                  {selectedReport.description}
                </p>
              </div>

              {/* Progress Timeline */}
              <div>
                <span className="text-xs font-semibold text-slate-700 block mb-3">
                  Resolution Timeline
                </span>
                <div className="space-y-3">
                  {(selectedReport.timeline ?? []).length === 0 ? (
                    <p className="text-xs text-slate-500">No timeline updates have been recorded.</p>
                  ) : selectedReport.timeline?.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${
                          step.done
                            ? 'bg-[#234E35] text-white'
                            : 'bg-slate-200 text-slate-400'
                        }`}
                      >
                        {step.done ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900 block leading-tight">
                          {step.stage}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {step.timestamp}
                        </span>
                        {step.note && (
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {step.note}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Reporting Contact: {selectedReport.contact || 'Not provided'}
              </span>
              <button
                onClick={() => setSelectedReport(null)}
                className="px-5 py-2 rounded-xl bg-[#234E35] text-white text-xs font-semibold hover:bg-[#1A3D29] transition"
              >
                Close Ticket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Map modal for selected report */}
      {selectedReport && (
        <MapModal
          isOpen={showMapModal}
          onClose={() => setShowMapModal(false)}
          coordinates={selectedReport.location}
          address={selectedReport.address}
          hazardTitle={selectedReport.hazardType}
        />
      )}
    </div>
  );
};
