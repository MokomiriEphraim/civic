/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActiveView, StepNumber, HazardReport, UserRole } from './types';
import { getReports, updateReportStatus } from './api/reports';
import { loadCollections, type CivicCollections } from './api/collections';
import { Navbar } from './components/Navbar';
import { LandingView } from './components/LandingView';
import { ReportWizard } from './components/ReportWizard';
import { DashboardView } from './components/DashboardView';
import { HomeView } from './components/HomeView';
import { CivicMapView } from './components/CivicMapView';
import { TransparencyView } from './components/TransparencyView';
import { TicketView } from './components/TicketView';
import { CommunityView } from './components/CommunityView';
import { BulletinsView } from './components/BulletinsView';
import { DiscoverView } from './components/DiscoverView';
import { OpsView } from './components/OpsView';
import { WorkerView } from './components/WorkerView';
import { AssistantDock } from './components/AssistantDock';
import { Eye, Layers } from 'lucide-react';

const EMPTY_COLLECTIONS: CivicCollections = {
  alerts: [],
  announcements: [],
  discussions: [],
  polls: [],
  events: [],
  documents: [],
  projects: [],
};

const USERS: Record<UserRole, { name: string; email: string }> = {
  resident: { name: 'Demo Citizen', email: 'demo@example.com' },
  staff: { name: 'Municipal Officer', email: 'ops@capetown.gov.za' },
};

function readStoredRole(): UserRole {
  try {
    return window.localStorage.getItem('civic-role') === 'staff' ? 'staff' : 'resident';
  } catch {
    return 'resident';
  }
}

export default function App() {
  const [activeView, setActiveView] = useState<ActiveView>('landing');
  const [wizardStep, setWizardStep] = useState<StepNumber>(1);
  const [reports, setReports] = useState<HazardReport[]>([]);
  const [collections, setCollections] = useState<CivicCollections>(EMPTY_COLLECTIONS);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isLoadingReports, setIsLoadingReports] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);
  const [role, setRole] = useState<UserRole>(readStoredRole);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [showScreenSwitcher, setShowScreenSwitcher] = useState(import.meta.env.DEV);

  const currentUser = USERS[role];

  useEffect(() => {
    try {
      window.localStorage.setItem('civic-role', role);
    } catch {
      // Storage may be unavailable; the role still works for this session.
    }
  }, [role]);

  useEffect(() => {
    let cancelled = false;

    const loadReports = async () => {
      try {
        setIsLoadingReports(true);
        setApiError(null);
        const loadedReports = await getReports();
        if (!cancelled) {
          setReports(loadedReports);
          setSelectedReportId((current) =>
            current && loadedReports.some((report) => report.id === current)
              ? current
              : loadedReports[0]?.id ?? null
          );
        }
      } catch (error) {
        if (!cancelled) {
          setApiError(
            error instanceof Error ? error.message : 'Could not connect to the reports service.'
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingReports(false);
        }
      }
    };

    void loadReports();
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  useEffect(() => {
    let cancelled = false;
    void loadCollections()
      .then((loaded) => {
        if (!cancelled) setCollections(loaded);
      })
      .catch(() => {
        if (!cancelled) setCollections(EMPTY_COLLECTIONS);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  const handleStartReport = (step: StepNumber = 1) => {
    setWizardStep(step);
    setActiveView('report');
  };

  const handleReportFinish = (newReport: HazardReport) => {
    setReports((prev) => [
      newReport,
      ...prev.filter((report) => report.id !== newReport.id),
    ]);
    setSelectedReportId(newReport.id);
  };

  const handleReportStatusUpdate = async (
    id: string,
    status: HazardReport['status']
  ): Promise<HazardReport> => {
    const updatedReport = await updateReportStatus(id, status);

    setReports((prev) => {
      const exists = prev.some((report) => report.id === id);
      return exists
        ? prev.map((report) => (report.id === id ? updatedReport : report))
        : [updatedReport, ...prev];
    });

    return updatedReport;
  };

  const openTicket = useCallback((id: string) => {
    setSelectedReportId(id);
    setActiveView('ticket');
  }, []);

  const jumpToScreen = (screenIndex: number) => {
    switch (screenIndex) {
      case 1:
        setActiveView('landing');
        break;
      case 2:
        setWizardStep(1);
        setActiveView('report');
        break;
      case 3:
        setWizardStep(2);
        setActiveView('report');
        break;
      case 4:
        setWizardStep(3);
        setActiveView('report');
        break;
      case 5:
        setWizardStep(4);
        setActiveView('report');
        break;
      case 6:
        setActiveView('dashboard');
        break;
    }
  };

  const viewNode = useMemo(() => {
    switch (activeView) {
      case 'landing':
        return (
          <LandingView
            onStartReport={() => handleStartReport(1)}
            onTrackReport={() => setActiveView('dashboard')}
          />
        );
      case 'report':
        return (
          <ReportWizard
            initialStep={wizardStep}
            onCancel={() => setActiveView('landing')}
            onFinish={handleReportFinish}
            onViewReports={() => setActiveView('dashboard')}
          />
        );
      case 'dashboard':
        return (
          <DashboardView
            reports={reports}
            onStartReport={() => handleStartReport(1)}
            onGoHome={() => setActiveView('home')}
            onUpdateReportStatus={handleReportStatusUpdate}
            isLoading={isLoadingReports}
            loadError={apiError}
            onRetryLoad={reload}
            currentUser={currentUser}
          />
        );
      case 'home':
        return (
          <HomeView
            reports={reports}
            collections={collections}
            role={role}
            currentUser={currentUser}
            onNavigate={(view) => setActiveView(view)}
            onStartReport={() => handleStartReport(1)}
            onOpenReport={openTicket}
          />
        );
      case 'map':
        return (
          <CivicMapView
            reports={reports}
            selectedId={selectedReportId}
            onSelectReport={setSelectedReportId}
            onOpenTicket={openTicket}
          />
        );
      case 'transparency':
        return <TransparencyView reports={reports} />;
      case 'ticket':
        return (
          <TicketView
            reports={reports}
            selectedId={selectedReportId}
            onSelectTicket={setSelectedReportId}
            onUpdateReportStatus={handleReportStatusUpdate}
            onRefreshReports={reload}
            role={role}
            currentUser={currentUser}
          />
        );
      case 'community':
        return (
          <CommunityView
            discussions={collections.discussions}
            events={collections.events}
            onRefresh={reload}
            onNavigate={(view) => setActiveView(view)}
          />
        );
      case 'bulletins':
        return (
          <BulletinsView
            alerts={collections.alerts}
            announcements={collections.announcements}
            onRefresh={reload}
          />
        );
      case 'discover':
        return (
          <DiscoverView
            projects={collections.projects}
            polls={collections.polls}
            documents={collections.documents}
            onRefresh={reload}
          />
        );
      case 'ops':
        return (
          <OpsView
            reports={reports}
            onUpdateReportStatus={handleReportStatusUpdate}
            onRefresh={reload}
          />
        );
      case 'worker':
        return (
          <WorkerView reports={reports} onUpdateReportStatus={handleReportStatusUpdate} />
        );
    }
  }, [
    activeView,
    wizardStep,
    reports,
    collections,
    role,
    currentUser,
    selectedReportId,
    isLoadingReports,
    apiError,
    reload,
    openTicket,
  ]);

  return (
    <div className="min-h-screen bg-[#F6F8F5] text-slate-800 flex flex-col font-sans relative pb-14">
      {apiError && activeView !== 'dashboard' && (
        <div role="alert" className="bg-red-50 px-4 py-2 text-center text-sm text-red-800">
          Could not load reports from the backend: {apiError}{' '}
          <button
            type="button"
            onClick={reload}
            className="font-semibold underline underline-offset-2"
          >
            Retry
          </button>
        </div>
      )}
      {activeView !== 'dashboard' && (
        <Navbar
          activeView={activeView}
          role={role}
          onNavigate={(view) => setActiveView(view)}
          onRoleChange={setRole}
          onStartReport={() => handleStartReport(1)}
          user={currentUser}
          onToggleUser={() => setActiveView('dashboard')}
          variant={activeView === 'report' ? 'wizard' : 'landing'}
        />
      )}

      <main className="flex-1 flex flex-col">{viewNode}</main>

      {activeView !== 'report' && (
        <AssistantDock
          reports={reports}
          alerts={collections.alerts}
          announcements={collections.announcements}
          discussions={collections.discussions}
          onNavigate={(view) => setActiveView(view)}
          onStartReport={() => handleStartReport(1)}
          onOpenReport={openTicket}
        />
      )}

      {import.meta.env.DEV && showScreenSwitcher && (
        <aside
          aria-label="Screen navigator"
          className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 bg-slate-900/90 hover:bg-slate-900 backdrop-blur-md text-white px-3 sm:px-4 py-2 rounded-full shadow-2xl border border-white/20 flex items-center gap-1.5 sm:gap-2.5 text-xs transition duration-200"
        >
          <div className="flex items-center gap-1.5 pr-1 text-emerald-400 font-bold text-[11px] uppercase tracking-wider hidden sm:flex">
            <Layers className="w-3.5 h-3.5" />
            <span>Mockup Screens:</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => jumpToScreen(1)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition ${
                activeView === 'landing'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'bg-white/10 hover:bg-white/20 text-slate-200'
              }`}
              title="Screen 1: Landing Page"
            >
              1. Home
            </button>

            <button
              onClick={() => jumpToScreen(2)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition ${
                activeView === 'report' && wizardStep === 1
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'bg-white/10 hover:bg-white/20 text-slate-200'
              }`}
              title="Screen 2: Step 1 Photo Upload"
            >
              2. Photo
            </button>

            <button
              onClick={() => jumpToScreen(3)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition ${
                activeView === 'report' && wizardStep === 2
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'bg-white/10 hover:bg-white/20 text-slate-200'
              }`}
              title="Screen 3: Step 2 AI Review"
            >
              3. Review
            </button>

            <button
              onClick={() => jumpToScreen(4)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition ${
                activeView === 'report' && wizardStep === 3
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'bg-white/10 hover:bg-white/20 text-slate-200'
              }`}
              title="Screen 4: Step 3 Details"
            >
              4. Details
            </button>

            <button
              onClick={() => jumpToScreen(5)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition ${
                activeView === 'report' && wizardStep === 4
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'bg-white/10 hover:bg-white/20 text-slate-200'
              }`}
              title="Screen 5: Step 4 Submitted"
            >
              5. Submit
            </button>

            <button
              onClick={() => jumpToScreen(6)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition ${
                activeView === 'dashboard'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'bg-white/10 hover:bg-white/20 text-slate-200'
              }`}
              title="Screen 6: Dashboard My Reports"
            >
              6. Dashboard
            </button>
          </div>

          <button
            onClick={() => setShowScreenSwitcher(false)}
            className="ml-1 text-slate-400 hover:text-white p-1"
            title="Minimize bar"
          >
            ×
          </button>
        </aside>
      )}

      {import.meta.env.DEV && !showScreenSwitcher && (
        <button
          onClick={() => setShowScreenSwitcher(true)}
          className="fixed bottom-3 right-3 z-40 bg-slate-900/90 text-white p-2 rounded-full shadow-lg hover:bg-slate-800 transition"
          title="Open Screen Switcher"
        >
          <Eye className="w-4 h-4 text-emerald-400" />
        </button>
      )}
    </div>
  );
}
