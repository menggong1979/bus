import React from 'react';
import { UserReportedDelay } from '../types.ts';
import { Users, AlertTriangle, ThumbsUp, Compass, Plus, Clock, MessageSquare } from 'lucide-react';

interface UserDelayReportsProps {
  delays: UserReportedDelay[];
  onOpenReportModal: () => void;
  onConfirmDelay: (id: string) => void;
  onFocusDelay: (coords: [number, number]) => void;
  currentStopCode: string;
}

export const UserDelayReports: React.FC<UserDelayReportsProps> = ({
  delays,
  onOpenReportModal,
  onConfirmDelay,
  onFocusDelay,
  currentStopCode
}) => {
  const formatTimeAgo = (isoString: string) => {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.max(1, Math.round(diffMs / 60000));
    if (diffMins < 60) return `${diffMins}m ago`;
    const hours = Math.floor(diffMins / 60);
    return `${hours}h ago`;
  };

  const getTypeLabel = (type: UserReportedDelay['type']) => {
    switch (type) {
      case 'heavy_crowd':
        return 'Heavy Crowd';
      case 'breakdown':
        return 'Bus Breakdown';
      case 'traffic_congestion':
        return 'Traffic Slowdown';
      case 'bad_weather':
        return 'Severe Weather';
      case 'route_detour':
        return 'Route Detour';
      case 'long_wait':
        return 'Long Wait Time';
      default:
        return 'Delay';
    }
  };

  return (
    <div className="space-y-3">
      {/* Header and Add Report Action */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-bold text-slate-100">Commuter Delay Reports</h3>
          <span className="text-xs font-mono text-slate-400">({delays.length} active)</span>
        </div>

        <button
          onClick={onOpenReportModal}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-lg transition-colors shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Report a Delay</span>
        </button>
      </div>

      {/* List of Delays */}
      {delays.length === 0 ? (
        <div className="p-6 text-center rounded-xl bg-slate-900/50 border border-slate-800 text-slate-400 text-xs">
          No delays reported by commuters yet. Everything running smoothly!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {delays.map((delay) => {
            const isForCurrentStop = delay.busStopCode === currentStopCode;
            const lat = typeof delay.latitude === 'number' ? delay.latitude : parseFloat(String(delay.latitude));
            const lng = typeof delay.longitude === 'number' ? delay.longitude : parseFloat(String(delay.longitude));
            const hasCoords = !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;

            return (
              <div
                key={delay.id}
                className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-2.5 ${
                  isForCurrentStop
                    ? 'bg-slate-900/90 border-amber-500/40 shadow-sm'
                    : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        {getTypeLabel(delay.type)}
                      </span>
                      {delay.serviceNo && (
                        <span className="px-1.5 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-500/15 text-emerald-300">
                          Bus {delay.serviceNo}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-[11px] font-mono text-amber-400 font-bold">
                      <Clock className="w-3 h-3" />
                      <span>+{delay.estimatedDelayMinutes}m</span>
                    </div>
                  </div>

                  <div className="text-xs font-semibold text-slate-200">
                    {delay.busStopDescription}
                  </div>
                  <p className="text-xs text-slate-300 mt-1 leading-snug">
                    "{delay.description}"
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                  <div className="text-[11px] text-slate-500 flex items-center gap-1">
                    <span>{formatTimeAgo(delay.reportedAt)}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {hasCoords && (
                      <button
                        onClick={() => onFocusDelay([lat, lng])}
                        className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-emerald-400 transition-colors"
                      >
                        <Compass className="w-3 h-3" />
                        <span>Map</span>
                      </button>
                    )}

                    <button
                      onClick={() => onConfirmDelay(delay.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-md transition-colors"
                      title="Confirm this delay"
                    >
                      <ThumbsUp className="w-3 h-3 text-emerald-400" />
                      <span>Confirm ({delay.confirmations})</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
