import React, { useState } from 'react';
import { TrafficIncident } from '../types.ts';
import { AlertOctagon, Construction, Car, Compass, ShieldAlert, AlertTriangle } from 'lucide-react';

interface TrafficIncidentsListProps {
  incidents: TrafficIncident[];
  onFocusIncident: (coords: [number, number]) => void;
  dataSource?: 'lta_live' | 'simulated';
}

export const TrafficIncidentsList: React.FC<TrafficIncidentsListProps> = ({
  incidents,
  onFocusIncident,
  dataSource
}) => {
  const [filterType, setFilterType] = useState<string>('all');

  const filtered = incidents.filter(inc => {
    if (filterType === 'all') return true;
    if (filterType === 'accident') return inc.Type?.toLowerCase().includes('accident');
    if (filterType === 'roadworks') return inc.Type?.toLowerCase().includes('road work');
    if (filterType === 'heavy') return inc.Type?.toLowerCase().includes('heavy');
    return true;
  });

  const getIncidentIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('accident')) return <AlertOctagon className="w-4 h-4 text-rose-400" />;
    if (t.includes('road work')) return <Construction className="w-4 h-4 text-amber-400" />;
    if (t.includes('breakdown')) return <Car className="w-4 h-4 text-orange-400" />;
    return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
  };

  return (
    <div className="space-y-3">
      {/* Header and Filter segmented control */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          <h3 className="text-sm font-bold text-slate-100">Live Traffic Incidents</h3>
          <span className="text-xs font-mono text-slate-400">({incidents.length})</span>
          {dataSource === 'lta_live' ? (
            <span className="text-[10px] font-mono font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-1.5 py-0.5 rounded">
              LTA Live
            </span>
          ) : (
            <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
              Simulated Feed
            </span>
          )}
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setFilterType('all')}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              filterType === 'all' ? 'bg-slate-800 text-white font-medium shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterType('accident')}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              filterType === 'accident' ? 'bg-slate-800 text-rose-300 font-medium shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Accidents
          </button>
          <button
            onClick={() => setFilterType('roadworks')}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              filterType === 'roadworks' ? 'bg-slate-800 text-amber-300 font-medium shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Road Works
          </button>
          <button
            onClick={() => setFilterType('heavy')}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              filterType === 'heavy' ? 'bg-slate-800 text-yellow-300 font-medium shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Heavy Traffic
          </button>
        </div>
      </div>

      {/* Incidents List */}
      {filtered.length === 0 ? (
        <div className="p-6 text-center rounded-xl bg-slate-900/50 border border-slate-800 text-slate-400 text-xs">
          No traffic incidents reported for this category. Roads are currently clear.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {filtered.map((inc, idx) => {
            const lat = typeof inc.Latitude === 'number' ? inc.Latitude : parseFloat(String(inc.Latitude));
            const lng = typeof inc.Longitude === 'number' ? inc.Longitude : parseFloat(String(inc.Longitude));
            const hasCoords = !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;

            return (
              <div
                key={idx}
                className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between gap-2"
              >
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 p-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 shrink-0">
                    {getIncidentIcon(inc.Type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-xs font-semibold text-slate-200 truncate">
                        {inc.Type}
                      </span>
                      {hasCoords && (
                        <span className="text-[10px] font-mono text-slate-500">
                          {lat.toFixed(3)}, {lng.toFixed(3)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 leading-snug line-clamp-2">
                      {inc.Message}
                    </p>
                  </div>
                </div>

                {hasCoords && (
                  <div className="flex items-center justify-end pt-2 border-t border-slate-800/60">
                    <button
                      onClick={() => onFocusIncident([lat, lng])}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
                    >
                      <Compass className="w-3 h-3" />
                      <span>Locate on Map</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
