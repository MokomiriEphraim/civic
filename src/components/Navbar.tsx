import React from 'react';
import { CivicLogo } from './CivicLogo';
import { ActiveView, UserRole } from '../types';
import { RoleSwitcher } from './RoleSwitcher';
import { LayoutDashboard, PlusCircle } from 'lucide-react';

interface NavbarProps {
  activeView: ActiveView;
  role: UserRole;
  onNavigate: (view: ActiveView) => void;
  onRoleChange: (role: UserRole) => void;
  onToggleUser: () => void;
  onStartReport?: () => void;
  variant?: 'landing' | 'wizard';
}

export const Navbar: React.FC<NavbarProps> = ({
  activeView,
  role,
  onNavigate,
  onRoleChange,
  onToggleUser,
  onStartReport,
  variant = 'landing',
}) => {
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
              onClick={onToggleUser}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#234E35] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#1A3D29]"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Dashboard
            </button>
          </div>
        </div>
      </header>
    );
  }

  const isLanding = activeView === 'landing';

  return (
    <header className="relative z-20 w-full border-b border-slate-200/70 bg-[#F2F1EC]/95 px-4 py-3 backdrop-blur-sm sm:px-10">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <CivicLogo showTagline onClick={() => onNavigate('landing')} />

        <div className="flex items-center gap-2 sm:gap-3">
          {onStartReport && activeView !== 'report' && (
            <button
              type="button"
              onClick={onStartReport}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#E65A2C] px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#D44E22]"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span>Report</span>
            </button>
          )}
          {!isLanding && <RoleSwitcher role={role} onChange={onRoleChange} compact />}
          <button
            type="button"
            onClick={onToggleUser}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#234E35] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#1A3D29]"
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            Dashboard
          </button>
        </div>
      </div>
    </header>
  );
};
