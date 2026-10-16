import React from 'react';
import { ArrowRight, Building2 } from 'lucide-react';
import heroBg from '../assets/images/civicfix_hero_landscape_1791996007184.jpg';

interface LandingViewProps {
  onOpenDashboard: () => void;
}

export const LandingView: React.FC<LandingViewProps> = ({
  onOpenDashboard,
}) => {
  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#F2F1EC] px-4 pb-12 pt-5 sm:px-8 sm:pt-8">
      <div className="mx-auto max-w-7xl">
        <section className="relative isolate min-h-[min(680px,calc(100vh-128px))] overflow-hidden rounded-[2rem] bg-[#17291f] shadow-[0_24px_70px_-32px_rgba(16,35,24,0.55)]">
          <img
            src={heroBg}
            alt="Cape Town and Table Mountain"
            className="absolute inset-0 -z-20 h-full w-full object-cover object-[58%_center]"
          />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#10251c]/95 via-[#10251c]/75 to-[#10251c]/10" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#10251c]/40 via-transparent to-black/10" />

          <div className="flex min-h-[min(680px,calc(100vh-128px))] flex-col justify-between p-7 text-white sm:p-12 lg:p-16">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/90 backdrop-blur-md">
              <Building2 className="h-3.5 w-3.5" />
              Cape Town · City services
            </div>

            <div className="max-w-2xl pb-4 pt-20 sm:pb-8">
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100/90">
                Your city, connected
              </p>
              <h1 className="max-w-xl text-4xl font-semibold leading-[1.04] tracking-tight sm:text-6xl lg:text-7xl">
                A closer view of city life.
              </h1>
              <p className="mt-5 max-w-md text-sm leading-relaxed text-white/80 sm:text-base">
                City updates, community and local services — together in one place.
              </p>
              <div className="mt-8">
                <button
                  type="button"
                  onClick={onOpenDashboard}
                  className="inline-flex items-center gap-2 rounded-full bg-[#234E35] px-6 py-3.5 text-sm font-bold text-white shadow-lg transition hover:bg-[#1A3D29] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  Explore city services
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-7 text-xs font-medium text-white/70">
                Updates <span className="px-2 text-white/40">·</span>
                Community <span className="px-2 text-white/40">·</span>
                City services
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
