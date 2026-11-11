import React, { useState } from 'react';
import { StopImpactSummary, RouteImpact } from '../utils/trafficImpact.ts';
import { AlertTriangle, AlertOctagon, CheckCircle2, ChevronDown, ChevronUp, Compass, ArrowRight, Clock, ShieldAlert } from 'lucide-react';

interface StopImpactBannerProps {
  summary: StopImpactSummary;
  onFocusIncident: (coords: [number, number]) => void;
  onFilterService?: (serviceNo: string) => void;
}

export const StopImpactBanner: React.FC<StopImpactBannerProps> = ({
  summary,
  onFocusIncident,
  onFilterService
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(summary.overallLevel === 'severe' || summary.overallLevel === 'moderate');

  if (summary.overallLevel === 'clear') {
    return (
      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs flex items-center justify-between gap-3 text-slate-300">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="font-semibold text-slate-200">Approach Routes Clear: </span>
            <span className="text-slate-400">No active traffic incidents are affecting bus arrivals at this stop.</span>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 font-medium">
          <span>Normal Headways</span>
        </div>
      </div>
    );
  }

  const isSevere = summary.overallLevel === 'severe';
  const isModerate = summary.overallLevel === 'moderate';

  const badgeBg = isSevere ? 'bg-rose-500/15 border-rose-500/30 text-rose-300' : isModerate ? 'bg-amber-500/15 border-amber-500/30 text-amber-300' : 'bg-sky-500/15 border-sky-500/30 text-sky-300';
  const iconColor = isSevere ? 'text-rose-400' : isModerate ? 'text-amber-400' : 'text-sky-400';
  const headerBg = isSevere ? 'bg-rose-950/30 border-rose-900/50' : isModerate ? 'bg-amber-950/30 border-amber-900/50' : 'bg-slate-900/90 border-slate-800';

  return (
    <div className={`rounded-xl border transition-all ${headerBg} overflow-hidden shadow-lg`}>
      {/* Primary Banner Header */}
      <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${badgeBg}`}>
            {isSevere ? <AlertOctagon className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${badgeBg}`}>
                {summary.overallLevel.toUpperCase()} ROUTE IMPACT
              </span>
              <span className="text-xs font-bold text-slate-100">{summary.title}</span>
            </div>
            <p className="text-xs text-slate-300 leading-snug">{summary.description}</p>
          </div>
        </div>

        {/* Max Estimated Delay and Toggle details button */}
        <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
          <div className="text-right">
            <div className={`text-base font-black font-mono tabular-nums leading-none ${iconColor}`}>
              +{summary.maxEstimatedDelay}m
            </div>
            <div className="text-[10px] font-mono text-slate-400">Est. Arrival Delay</div>
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 rounded-lg transition-colors"
          >
            <span>{isExpanded ? 'Hide Details' : 'Analyze Impact'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded Incident Breakdown Table / Details */}
      {isExpanded && (
        <div className="px-3.5 pb-3.5 pt-1 border-t border-slate-800/80 space-y-2.5 bg-slate-950/40">
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Corridor Disruption Breakdown ({summary.impacts.length})</span>
            <span>Impacted Bus Lines: {summary.affectedServiceNos.join(', ')}</span>
          </div>

          <div className="space-y-2">
            {summary.impacts.map((imp, idx) => {
              const lat = typeof imp.incident.Latitude === 'number' ? imp.incident.Latitude : parseFloat(String(imp.incident.Latitude));
              const lng = typeof imp.incident.Longitude === 'number' ? imp.incident.Longitude : parseFloat(String(imp.incident.Longitude));
              const hasCoords = !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;

              return (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-2.5"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-200">
                        {imp.incident.Type}
                      </span>
                      <span className="text-slate-500">·</span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {imp.distanceKm} km {imp.directionFromStop} of stop
                      </span>
                      <span className="text-slate-500">·</span>
                      <span className="text-[11px] font-mono font-bold text-amber-400">
                        +{imp.estimatedAddedDelayMins}m bus delay
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-snug">
                      {imp.reason}
                    </p>

                    <div className="flex items-center gap-1.5 pt-1 text-[11px] text-slate-400 flex-wrap">
                      <span className="text-slate-500">Affects Lines:</span>
                      {imp.affectedServices.map((svc) => (
                        <button
                          key={svc}
                          onClick={() => onFilterService && onFilterService(svc)}
                          className="px-1.5 py-0.2 rounded font-mono font-bold bg-slate-800 hover:bg-emerald-600 hover:text-white text-emerald-400 transition-colors"
                          title={`Filter bus ${svc}`}
                        >
                          {svc}
                        </button>
                      ))}
                    </div>
                  </div>

                  {hasCoords && (
                    <div className="shrink-0 flex items-center justify-end">
                      <button
                        onClick={() => onFocusIncident([lat, lng])}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:text-white bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 rounded-md transition-colors shadow-sm"
                      >
                        <Compass className="w-3.5 h-3.5" />
                        <span>Locate Choke Point</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
