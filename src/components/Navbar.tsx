import React, { useState } from 'react';
import { CivicLogo } from './CivicLogo';
import { ActiveView, UserRole } from '../types';
import { RoleSwitcher } from './RoleSwitcher';
import { Building2, LayoutDashboard, Menu, PlusCircle, User, X } from 'lucide-react';

interface NavbarProps {
  activeView: ActiveView;
  role: UserRole;
  onNavigate: (view: ActiveView) => void;
  onRoleChange: (role: UserRole) => void;
  onStartReport: () => void;
  user: { name: string; email: string; avatar?: string } | null;
  onToggleUser: () => void;
  variant?: 'landing' | 'wizard' | 'dashboard';
}

interface NavItem {
  view: ActiveView;
  label: string;
}

const RESIDENT_NAV: NavItem[] = [
  { view: 'home', label: 'Home' },
  { view: 'map', label: 'Map' },
  { view: 'ticket', label: 'Tickets' },
  { view: 'community', label: 'Community' },
  { view: 'discover', label: 'Discover' },
  { view: 'bulletins', label: 'Bulletins' },
  { view: 'transparency', label: 'Transparency' },
];

const STAFF_NAV: NavItem[] = [
  { view: 'home', label: 'Home' },
  { view: 'ops', label: 'Ops' },
  { view: 'worker', label: 'Field crew' },
  { view: 'map', label: 'Map' },
  { view: 'ticket', label: 'Tickets' },
  { view: 'bulletins', label: 'Bulletins' },
  { view: 'transparency', label: 'Transparency' },
];

export const Navbar: React.FC<NavbarProps> = ({
  activeView,
  role,
  onNavigate,
  onRoleChange,
  onStartReport,
  user,
  onToggleUser,
  variant = 'landing',
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const navItems = role === 'staff' ? STAFF_NAV : RESIDENT_NAV;

  const navButtons = navItems.map((item) => (
    <button
      key={item.view}
      type="button"
      onClick={() => {
        setMenuOpen(false);
        onNavigate(item.view);
      }}
      className={`text-xs sm:text-sm font-semibold transition ${
        activeView === item.view ? 'text-[#1A4329] font-bold' : 'text-slate-600 hover:text-slate-900'
      }`}
    >
      {item.label}
    </button>
  ));

  if (variant === 'dashboard') {
    return (
      <header className="h-16 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3 md:hidden">
          <CivicLogo showTagline={false} onClick={() => onNavigate('landing')} />
        </div>
        <div className="hidden md:block text-xs font-medium text-slate-400">
          Cape Town • CivicFix report tracking demo
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onStartReport}
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold bg-[#234E35] text-white px-3.5 py-1.5 rounded-lg hover:bg-[#1A3D29] transition shadow-xs"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Report Hazard
          </button>

          <RoleSwitcher role={role} onChange={onRoleChange} compact />

          <button
            type="button"
            onClick={onToggleUser}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full border border-slate-200 text-slate-700 text-sm font-medium hover:border-slate-300 transition"
          >
            <span className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs border border-slate-300">
              {role === 'staff' ? (
                <Building2 className="w-4 h-4" />
              ) : (
                <User className="w-4 h-4" />
              )}
            </span>
            <span className="hidden sm:inline font-semibold text-xs text-slate-800">
              {user?.name || 'Mpho Shiang'}
            </span>
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
              onClick={() => onNavigate('home')}
              className="text-xs font-medium text-slate-600 hover:text-[#234E35] transition hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-50"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Home
            </button>

            <button
              onClick={onToggleUser}
              className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-xs hover:ring-2 hover:ring-[#234E35]/30 transition"
              title="Open dashboard"
              aria-label="Open dashboard"
            >
              <User className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="w-full bg-white/80 backdrop-blur-sm border-b border-slate-200/70 pt-3 pb-2.5 px-4 sm:px-10 z-20">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <CivicLogo showTagline={true} onClick={() => onNavigate('landing')} />

        <nav className="hidden lg:flex items-center gap-4 xl:gap-6">{navButtons}</nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <RoleSwitcher role={role} onChange={onRoleChange} compact />

          <button
            type="button"
            onClick={onStartReport}
            className="inline-flex items-center justify-center gap-1.5 text-xs sm:text-sm font-semibold bg-[#234E35] hover:bg-[#1A3D29] text-white px-3.5 sm:px-5 py-2 rounded-full transition shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Report Hazard</span>
            <span className="sm:hidden">Report</span>
          </button>

          <button
            type="button"
            onClick={onToggleUser}
            className="hidden sm:flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-slate-300 transition"
            title="Open my reports"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            My Reports
          </button>

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="lg:hidden inline-flex items-center justify-center rounded-full border border-slate-200 bg-white p-2 text-slate-600 hover:border-slate-300 transition"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="lg:hidden mt-3 flex flex-col gap-1 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          {navItems.map((item) => (
            <button
              key={item.view}
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onNavigate(item.view);
              }}
              className={`rounded-lg px-3 py-2 text-left text-sm font-semibold transition ${
                activeView === item.view
                  ? 'bg-[#234E35]/10 text-[#1A4329]'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {item.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              onToggleUser();
            }}
            className="rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
          >
            My Reports
          </button>
        </nav>
      )}
    </header>
  );
};
