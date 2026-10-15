import React from 'react';
import { UserRole } from '../types';
import { Building2, User } from 'lucide-react';

interface RoleSwitcherProps {
  role: UserRole;
  onChange: (role: UserRole) => void;
  compact?: boolean;
}

/**
 * Demo-only role switcher: swaps between the resident experience and the
 * municipal staff workspace (Ops / Field worker views).
 */
export const RoleSwitcher: React.FC<RoleSwitcherProps> = ({ role, onChange, compact = false }) => {
  const options: { value: UserRole; label: string; icon: React.ReactNode }[] = [
    { value: 'resident', label: 'Resident', icon: <User className="w-3.5 h-3.5" /> },
    { value: 'staff', label: 'Municipal', icon: <Building2 className="w-3.5 h-3.5" /> },
  ];

  return (
    <div
      className={`inline-flex items-center rounded-full border border-slate-200 bg-white p-0.5 shadow-xs ${
        compact ? 'text-[11px]' : 'text-xs'
      }`}
      role="group"
      aria-label="Demo role"
      title="Demo role switcher"
    >
      {options.map((option) => {
        const active = option.value === role;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={active}
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold transition ${
              active
                ? 'bg-[#234E35] text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            {option.icon}
            {!compact && option.label}
          </button>
        );
      })}
    </div>
  );
};
