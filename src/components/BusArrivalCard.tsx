import React from 'react';
import { BusServiceArrival, NextBusInfo, UserReportedDelay } from '../types.ts';
import { RouteImpact } from '../utils/trafficImpact.ts';
import { Bus, MapPin, Users, Accessibility, ArrowRight, AlertTriangle, AlertOctagon, Compass } from 'lucide-react';

interface BusArrivalCardProps {
  service: BusServiceArrival;
  delaysForService: UserReportedDelay[];
  routeImpactsForService?: RouteImpact[];
  isSelected: boolean;
  onSelect: () => void;
  onFocusCoordinates: (coords: [number, number]) => void;
}

export const BusArrivalCard: React.FC<BusArrivalCardProps> = ({
  service,
  delaysForService,
  routeImpactsForService = [],
  isSelected,
  onSelect,
  onFocusCoordinates
}) => {
  const getMinutesUntil = (estimatedArrival?: string): { minutes: number; label: string; isNow: boolean } => {
    if (!estimatedArrival) return { minutes: -1, label: '--', isNow: false };
    const diffMs = new Date(estimatedArrival).getTime() - Date.now();
    const mins = Math.round(diffMs / 60000);
    if (mins <= 0) return { minutes: 0, label: 'Arr', isNow: true };
    return { minutes: mins, label: `${mins}m`, isNow: false };
  };

  const renderLoadIndicator = (load?: string) => {
    if (load === 'SEA') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          Seats Avail
        </span>
      );
    }
    if (load === 'SDA') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
          Standing
        </span>
      );
    }
    if (load === 'LSD') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
          Crowded
        </span>
      );
    }
    return <span className="text-[11px] text-slate-500">Normal</span>;
  };

  const renderBusType = (type?: string, feature?: string) => {
    const isDD = type === 'DD';
    const isBendy = type === 'BD';
    const isWAB = feature === 'WAB';

    return (
      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
        <span className="font-mono">{isDD ? 'Double Deck' : isBendy ? 'Bendy' : 'Single Deck'}</span>
        {isWAB && (
          <span title="Wheelchair Accessible" className="text-slate-400">
            <Accessibility className="w-3.5 h-3.5 inline text-sky-400" />
          </span>
        )}
      </div>
    );
  };

  const next1 = service.NextBus;
  const next2 = service.NextBus2;
  const next3 = service.NextBus3;

  const t1 = getMinutesUntil(next1?.EstimatedArrival);
  const t2 = getMinutesUntil(next2?.EstimatedArrival);
  const t3 = getMinutesUntil(next3?.EstimatedArrival);

  const hasGPS1 = next1?.Latitude && next1?.Longitude && parseFloat(next1.Latitude) !== 0;

  const handleLocateBus = (e: React.MouseEvent, bus?: NextBusInfo) => {
    e.stopPropagation();
    if (bus?.Latitude && bus?.Longitude) {
      const lat = parseFloat(bus.Latitude);
      const lng = parseFloat(bus.Longitude);
      if (!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) {
        onFocusCoordinates([lat, lng]);
      }
    }
  };

  const handleLocateIncident = (e: React.MouseEvent, imp: RouteImpact) => {
    e.stopPropagation();
    const lat = typeof imp.incident.Latitude === 'number' ? imp.incident.Latitude : parseFloat(String(imp.incident.Latitude));
    const lng = typeof imp.incident.Longitude === 'number' ? imp.incident.Longitude : parseFloat(String(imp.incident.Longitude));
    if (!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) {
      onFocusCoordinates([lat, lng]);
    }
  };

  const topImpact = routeImpactsForService.length > 0 ? routeImpactsForService[0] : null;

  return (
    <div
      onClick={onSelect}
      className={`group relative p-3.5 rounded-xl border transition-all cursor-pointer ${
        isSelected
          ? 'bg-slate-800/95 border-emerald-500/60 shadow-lg shadow-emerald-950/20 ring-1 ring-emerald-500/30'
          : 'bg-slate-900/75 border-slate-800 hover:border-slate-700 hover:bg-slate-800/60'
      }`}
    >
      {/* Header: Service No, Operator, and Primary Next Bus Arrival Badge */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-11 h-11 rounded-lg bg-emerald-600 text-white font-extrabold text-lg flex items-center justify-center tracking-tight shadow-md">
            {service.ServiceNo}
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-300">
              {service.Operator || 'SBS Transit'}
            </div>
            <div className="text-[11px] text-slate-500">
              {service.NextBus?.DestinationCode ? `To interchange #${service.NextBus.DestinationCode}` : 'Scheduled route'}
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className={`text-2xl font-black font-mono tracking-tight tabular-nums ${
            t1.isNow ? 'text-emerald-400 animate-pulse' : 'text-slate-100'
          }`}>
            {t1.label}
          </div>
          <div className="text-[10px] uppercase font-mono text-slate-400">Next Bus</div>
        </div>
      </div>

      {/* Traffic Incident Route Impact Callout */}
      {topImpact && (
        <div className="mb-2.5 p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0" />
            <div className="truncate">
              <span className="font-semibold">{topImpact.incident.Type}:</span>{' '}
              <span className="text-rose-200">{topImpact.incident.Message}</span>{' '}
              <span className="font-mono text-[11px] font-bold text-amber-300">
                (+{topImpact.estimatedAddedDelayMins}m delay risk)
              </span>
            </div>
          </div>
          <button
            onClick={(e) => handleLocateIncident(e, topImpact)}
            title="Locate incident on map"
            className="shrink-0 px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-200 transition-colors flex items-center gap-1"
          >
            <Compass className="w-3 h-3 text-rose-400" />
            <span>Map Choke</span>
          </button>
        </div>
      )}

      {/* Commuter Delay Alert Callout if commuters reported delay */}
      {delaysForService.length > 0 && (
        <div className="mb-2.5 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <div className="truncate">
            <span className="font-semibold">Commuter Alert:</span> {delaysForService[0].description} (+{delaysForService[0].estimatedDelayMinutes}m)
          </div>
        </div>
      )}

      {/* Next Bus Details & Live GPS Pill */}
      <div className="bg-slate-950/60 rounded-lg p-2.5 border border-slate-800/80 mb-2.5 flex items-center justify-between text-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {renderLoadIndicator(next1?.Load)}
            {renderBusType(next1?.Type, next1?.Feature)}
          </div>
          {hasGPS1 && (
            <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>GPS: {parseFloat(next1!.Latitude).toFixed(4)}, {parseFloat(next1!.Longitude).toFixed(4)}</span>
            </div>
          )}
        </div>

        {hasGPS1 ? (
          <button
            onClick={(e) => handleLocateBus(e, next1)}
            title="Focus bus GPS on map"
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-700/60 rounded-md transition-colors shadow-sm"
          >
            <MapPin className="w-3 h-3 text-emerald-400" />
            <span>Map GPS</span>
          </button>
        ) : (
          <span className="text-[10px] font-mono text-slate-500">Scheduled</span>
        )}
      </div>

      {/* Subsequent Arrivals: 2nd and 3rd bus */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 text-[11px]">Subsequent:</span>
          {next2?.EstimatedArrival ? (
            <div className="flex items-center gap-1.5 bg-slate-800/80 px-2 py-0.5 rounded text-[11px] font-mono">
              <span className="font-bold text-slate-200">{t2.label}</span>
              <span className="text-slate-400">·</span>
              <span className="text-slate-400">{next2.Type || 'SD'}</span>
            </div>
          ) : (
            <span className="text-slate-600 text-[11px]">-</span>
          )}

          {next3?.EstimatedArrival && (
            <div className="flex items-center gap-1.5 bg-slate-800/80 px-2 py-0.5 rounded text-[11px] font-mono">
              <span className="font-bold text-slate-200">{t3.label}</span>
              <span className="text-slate-400">·</span>
              <span className="text-slate-400">{next3.Type || 'SD'}</span>
            </div>
          )}
        </div>

        <div className="text-[11px] text-emerald-400/80 group-hover:text-emerald-400 flex items-center gap-0.5">
          <span>Filter map</span>
          <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </div>
  );
};
