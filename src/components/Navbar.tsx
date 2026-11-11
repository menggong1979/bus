import React from 'react';
import { Key } from 'lucide-react';

interface NavbarProps {
  activeView: 'dashboard' | 'map' | 'incidents' | 'delays';
  onSelectView: (view: 'dashboard' | 'map' | 'incidents' | 'delays') => void;
  onOpenKeyModal: () => void;
  hasActiveKey: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeView,
  onSelectView,
  onOpenKeyModal,
  hasActiveKey
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3.5 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md sticky top-0 z-50">
      {/* Zone 1: Brand wordmark (single text element) */}
      <a
        href="/"
        onClick={(e) => {
          e.preventDefault();
          onSelectView('dashboard');
        }}
        className="text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 flex items-center gap-2 group"
      >
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 group-hover:scale-125 transition-transform"></span>
        <span>SG BusPulse</span>
      </a>

      {/* Zone 2: 4 single-line text navigation links */}
      <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-400">
        <button
          onClick={() => onSelectView('dashboard')}
          className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
            activeView === 'dashboard' ? 'text-emerald-400 font-bold underline underline-offset-4' : ''
          }`}
        >
          Arrivals Board
        </button>
        <button
          onClick={() => onSelectView('map')}
          className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
            activeView === 'map' ? 'text-emerald-400 font-bold underline underline-offset-4' : ''
          }`}
        >
          Live Map
        </button>
        <button
          onClick={() => onSelectView('incidents')}
          className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
            activeView === 'incidents' ? 'text-emerald-400 font-bold underline underline-offset-4' : ''
          }`}
        >
          Traffic Incidents
        </button>
        <button
          onClick={() => onSelectView('delays')}
          className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
            activeView === 'delays' ? 'text-emerald-400 font-bold underline underline-offset-4' : ''
          }`}
        >
          Commuter Delays
        </button>
      </nav>

      {/* Zone 3: 1 primary action */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onOpenKeyModal}
          className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
            hasActiveKey
              ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/30'
              : 'bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700'
          }`}
        >
          <Key className="w-3.5 h-3.5 text-emerald-400" />
          <span>{hasActiveKey ? 'LTA Key: Active' : 'Configure API Key'}</span>
        </button>
      </div>
    </header>
  );
};
