import React from 'react';
import { CivicLogo } from './CivicLogo';
import { ActiveView } from '../types';
import { User, LogIn, PlusCircle, LayoutDashboard, Home } from 'lucide-react';

interface NavbarProps {
  activeView: ActiveView;
  onNavigate: (view: ActiveView) => void;
  onStartReport: () => void;
  user: { name: string; email: string; avatar?: string } | null;
  onToggleUser: () => void;
  variant?: 'landing' | 'wizard' | 'dashboard';
}

export const Navbar: React.FC<NavbarProps> = ({
  activeView,
  onNavigate,
  onStartReport,
  user,
  onToggleUser,
  variant = 'landing',
}) => {
  if (variant === 'dashboard') {
    // Top right user bar for dashboard
    return (
      <header className="h-16 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3 md:hidden">
          <CivicLogo showTagline={false} onClick={() => onNavigate('landing')} />
        </div>
        <div className="hidden md:block text-xs font-medium text-slate-400">
          City of Cape Town • Citizen Portal
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onStartReport}
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold bg-[#234E35] text-white px-3.5 py-1.5 rounded-lg hover:bg-[#1A3D29] transition shadow-xs"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Report Hazard
          </button>

          <button
            onClick={onToggleUser}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full hover:bg-slate-100 transition border border-slate-200 text-slate-700 text-sm font-medium"
          >
            <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs border border-slate-300">
              <User className="w-4 h-4" />
            </div>
            <span className="hidden sm:inline font-semibold text-xs text-slate-800">
              {user?.name || 'Mpho Shiang'}
            </span>
            <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </header>
    );
  }

  if (variant === 'wizard') {
    return (
      <header className="w-full bg-white border-b border-slate-100/90 py-3.5 px-4 sm:px-8">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <CivicLogo
            showTagline={false}
            onClick={() => onNavigate('landing')}
            className="cursor-pointer"
          />

          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('dashboard')}
              className="text-xs font-medium text-slate-600 hover:text-[#234E35] transition hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-50"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Track Reports
            </button>

            <button
              onClick={onToggleUser}
              className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-xs hover:ring-2 hover:ring-[#234E35]/30 transition"
              title={user ? user.name : 'Account Profile'}
            >
              <User className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </header>
    );
  }

  // Default Landing Header
  return (
    <header className="w-full bg-transparent pt-4 pb-2 px-4 sm:px-10 z-20">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <CivicLogo showTagline={true} onClick={() => onNavigate('landing')} />

        <nav className="flex items-center gap-3 sm:gap-7">
          <button
            onClick={() => onNavigate('landing')}
            className={`text-xs sm:text-sm font-semibold transition ${
              activeView === 'landing'
                ? 'text-[#1A4329] font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Home
          </button>

          <button
            onClick={onStartReport}
            className={`text-xs sm:text-sm font-semibold transition ${
              activeView === 'report'
                ? 'text-[#1A4329] font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Report Hazard
          </button>

          <button
            onClick={() => onNavigate('dashboard')}
            className={`text-xs sm:text-sm font-semibold transition ${
              activeView === 'dashboard'
                ? 'text-[#1A4329] font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Track Report
          </button>

          <button
            onClick={() => onNavigate('dashboard')}
            className="inline-flex items-center justify-center text-xs sm:text-sm font-semibold bg-[#234E35] hover:bg-[#1A3D29] text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-full transition shadow-xs"
          >
            Sign In
          </button>
        </nav>
      </div>
    </header>
  );
};
