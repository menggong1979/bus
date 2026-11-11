import React, { useState, useEffect, useCallback, useTransition } from 'react';
import { BusStop, BusServiceArrival, TrafficIncident, UserReportedDelay } from './types.ts';
import { SINGAPORE_BUS_STOPS, findBusStop } from './data/singaporeBusStops.ts';
import {
  fetchBusArrivals,
  fetchTrafficIncidents,
  fetchDelayReports,
  submitDelayReport,
  confirmDelayReport,
  getStoredAccountKey,
  getFavoriteStops,
  toggleFavoriteStop
} from './services/api.ts';
import { Navbar } from './components/Navbar.tsx';
import { BusMap } from './components/BusMap.tsx';
import { BusArrivalCard } from './components/BusArrivalCard.tsx';
import { TrafficIncidentsList } from './components/TrafficIncidentsList.tsx';
import { UserDelayReports } from './components/UserDelayReports.tsx';
import { ReportDelayModal } from './components/ReportDelayModal.tsx';
import { ApiKeyModal } from './components/ApiKeyModal.tsx';
import { StopImpactBanner } from './components/StopImpactBanner.tsx';
import { analyzeTrafficImpactOnStop } from './utils/trafficImpact.ts';
import { LiveConnectionBanner } from './components/LiveConnectionBanner.tsx';
import {
  Search,
  RefreshCw,
  Star,
  MapPin,
  Clock,
  Filter,
  AlertTriangle,
  Radio,
  SlidersHorizontal,
  ChevronRight,
  ShieldCheck,
  Check
} from 'lucide-react';

export default function App() {
  // Current active bus stop (defaults to 83139 - Opp Parkway Parade)
  const [currentStopCode, setCurrentStopCode] = useState<string>('83139');
  const [selectedService, setSelectedService] = useState<string>('all');
  const [activeView, setActiveView] = useState<'dashboard' | 'map' | 'incidents' | 'delays'>('dashboard');

  // Search input state
  const [searchInput, setSearchInput] = useState<string>('');
  const [searchResults, setSearchResults] = useState<BusStop[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Data states
  const [services, setServices] = useState<BusServiceArrival[]>([]);
  const [incidents, setIncidents] = useState<TrafficIncident[]>([]);
  const [delays, setDelays] = useState<UserReportedDelay[]>([]);
  const [dataSource, setDataSource] = useState<'lta_live' | 'simulated'>('simulated');
  const [favorites, setFavorites] = useState<string[]>(getFavoriteStops());

  // UI state
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [refreshCountdown, setRefreshCountdown] = useState<number>(20);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState<boolean>(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [hasActiveKey, setHasActiveKey] = useState<boolean>(!!getStoredAccountKey());
  const [focusedCoordinates, setFocusedCoordinates] = useState<[number, number] | null>(null);

  // Map layer controls
  const [layerVisibility, setLayerVisibility] = useState({
    buses: true,
    incidents: true,
    delays: true,
    stops: true,
    corridors: true
  });

  const currentStop = findBusStop(currentStopCode) || {
    code: currentStopCode,
    roadName: 'Singapore Road',
    description: `Bus Stop ${currentStopCode}`,
    latitude: 1.30155,
    longitude: 103.90538,
    services: ['15', '31', '36', '43', '48', '135', '196', '197']
  };

  // Analyze how traffic incidents affect bus arrivals at the current stop
  const stopImpactSummary = React.useMemo(() => {
    return analyzeTrafficImpactOnStop(currentStop, services, incidents);
  }, [currentStop, services, incidents]);

  // Toggle map layer
  const handleToggleLayer = (layer: 'buses' | 'incidents' | 'delays' | 'stops' | 'corridors') => {
    setLayerVisibility(prev => ({
      ...prev,
      [layer]: !prev[layer]
    }));
  };

  // Load Bus Arrivals and Incidents
  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    setIsRefreshing(true);

    try {
      const [arrivalsRes, incidentsRes, delaysRes] = await Promise.all([
        fetchBusArrivals(currentStopCode, selectedService === 'all' ? undefined : selectedService),
        fetchTrafficIncidents(),
        fetchDelayReports()
      ]);

      setServices(arrivalsRes.Services || []);
      setDataSource(arrivalsRes.dataSource || 'simulated');
      setIncidents(incidentsRes.value || []);
      setDelays(delaysRes || []);
      setHasActiveKey(!!getStoredAccountKey());
    } catch (err) {
      console.error('Error refreshing commute data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setRefreshCountdown(20);
    }
  }, [currentStopCode, selectedService]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // 20-second automatic refresh timer matching LTA DataMall v3 specification
  useEffect(() => {
    const timer = setInterval(() => {
      setRefreshCountdown(prev => {
        if (prev <= 1) {
          loadData(true);
          return 20;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loadData]);

  // Search filter
  useEffect(() => {
    if (!searchInput.trim()) {
      setSearchResults([]);
      setIsSearchOpen(false);
      return;
    }
    const q = searchInput.toLowerCase().trim();
    const matches = SINGAPORE_BUS_STOPS.filter(s =>
      s.code.includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.roadName.toLowerCase().includes(q) ||
      (s.services && s.services.some(svc => svc.toLowerCase() === q))
    );
    setSearchResults(matches);
    setIsSearchOpen(true);
  }, [searchInput]);

  const handleSelectStop = (code: string) => {
    setCurrentStopCode(code);
    setSelectedService('all');
    setSearchInput('');
    setIsSearchOpen(false);
    setFocusedCoordinates(null);
  };

  const handleToggleFavorite = (code: string) => {
    const updated = toggleFavoriteStop(code);
    setFavorites(updated);
  };

  const handleFocusCoordinates = (coords: [number, number]) => {
    if (!coords || !Array.isArray(coords) || isNaN(coords[0]) || isNaN(coords[1]) || coords[0] === 0) return;
    setFocusedCoordinates(coords);
    if (activeView === 'incidents' || activeView === 'delays') {
      setActiveView('dashboard');
    }
  };

  const handleConfirmDelay = async (id: string) => {
    try {
      const updated = await confirmDelayReport(id);
      setDelays(prev => prev.map(d => (d.id === id ? updated : d)));
    } catch (err) {
      console.error('Failed to confirm delay:', err);
    }
  };

  const handleNewDelayReport = async (reportData: Partial<UserReportedDelay>) => {
    const newReport = await submitDelayReport(reportData);
    setDelays(prev => [newReport, ...prev]);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* 3-Zone Top Bar Contract */}
      <Navbar
        activeView={activeView}
        onSelectView={setActiveView}
        onOpenKeyModal={() => setIsKeyModalOpen(true)}
        hasActiveKey={hasActiveKey}
      />

      {/* Main Workspace Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-5">
        {/* Live LTA DataMall Direct Connection Banner */}
        <LiveConnectionBanner
          dataSource={dataSource}
          hasActiveKey={hasActiveKey}
          onRefreshLive={() => loadData(false)}
          onOpenSettingsModal={() => setIsKeyModalOpen(true)}
        />

        {/* Commute Control Bar: Stop Search, Key Presets, 20s Refresh Ring */}
        <section className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 shadow-xl space-y-3.5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Search Input with dropdown */}
            <div className="relative flex-1 max-w-xl">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search bus stop by 5-digit code (e.g. 83139), road, or service..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onFocus={() => { if (searchInput.trim()) setIsSearchOpen(true); }}
                  className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl bg-slate-950 border border-slate-700 focus:border-emerald-500 focus:outline-none text-slate-100 placeholder-slate-500"
                />
              </div>

              {/* Autocomplete Dropdown */}
              {isSearchOpen && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1.5 z-50 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden max-h-72 overflow-y-auto">
                  <div className="p-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-400 bg-slate-950/60 border-b border-slate-800 px-3">
                    Matching Singapore Bus Stops ({searchResults.length})
                  </div>
                  {searchResults.map((stop) => (
                    <button
                      key={stop.code}
                      onClick={() => handleSelectStop(stop.code)}
                      className="w-full px-3 py-2 text-left hover:bg-slate-800 transition-colors flex items-center justify-between border-b border-slate-800/60 last:border-0"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-200">{stop.description}</div>
                        <div className="text-[11px] text-slate-400">{stop.roadName}</div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-xs font-semibold text-emerald-400">#{stop.code}</span>
                        <div className="text-[10px] text-slate-500">{stop.services?.slice(0, 4).join(', ')}...</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Stop Information & 20-second LTA sync countdown */}
            <div className="flex items-center justify-between lg:justify-end gap-3 shrink-0">
              {/* Bookmark Toggle */}
              <button
                onClick={() => handleToggleFavorite(currentStop.code)}
                title={favorites.includes(currentStop.code) ? 'Remove bookmark' : 'Bookmark stop'}
                className={`p-2 rounded-xl border transition-colors ${
                  favorites.includes(currentStop.code)
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                    : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
                }`}
              >
                <Star className={`w-4 h-4 ${favorites.includes(currentStop.code) ? 'fill-current' : ''}`} />
              </button>

              {/* Data Source Badge */}
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px]">
                <Radio className={`w-3.5 h-3.5 ${dataSource === 'lta_live' ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
                <span className="text-slate-400">Source:</span>
                <span className={`font-semibold ${dataSource === 'lta_live' ? 'text-emerald-400' : 'text-slate-300'}`}>
                  {dataSource === 'lta_live' ? 'LTA DataMall v3' : 'Simulated GPS'}
                </span>
              </div>

              {/* 20-Second Sync Counter & Manual Refresh */}
              <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl">
                <div className="flex items-center gap-1.5 text-xs font-mono tabular-nums text-slate-300">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{refreshCountdown}s</span>
                </div>
                <button
                  onClick={() => loadData(false)}
                  disabled={isRefreshing}
                  title="Refresh now"
                  className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Preset Commuter Stops Row */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
            <span className="text-slate-400 text-[11px] whitespace-nowrap shrink-0 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-emerald-400" />
              <span>Presets:</span>
            </span>

            {SINGAPORE_BUS_STOPS.slice(0, 6).map((stop) => (
              <button
                key={stop.code}
                onClick={() => handleSelectStop(stop.code)}
                className={`px-2.5 py-1 rounded-lg border text-xs whitespace-nowrap shrink-0 transition-colors ${
                  currentStopCode === stop.code
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <span>{stop.description}</span>
                <span className="ml-1 text-[10px] font-mono text-slate-400">#{stop.code}</span>
              </button>
            ))}
          </div>
        </section>

        {/* View Switcher: Arrivals Dashboard vs Dedicated Tabs */}
        {activeView === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 7 Columns: Interactive Map with GPS Buses & Hazards */}
            <div className="lg:col-span-7 h-[580px] flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-200">Real-Time Transit Map</h2>
                  <span className="text-xs text-slate-400">· Live GPS overlay</span>
                </div>
                <div className="text-xs text-slate-400 font-mono">
                  {currentStop.description} ({currentStop.roadName})
                </div>
              </div>

              <div className="flex-1 min-h-[480px]">
                <BusMap
                  currentStop={currentStop}
                  services={services}
                  incidents={incidents}
                  delays={delays}
                  allStops={SINGAPORE_BUS_STOPS}
                  routeImpacts={stopImpactSummary.impacts}
                  onSelectStop={handleSelectStop}
                  selectedBusService={selectedService}
                  focusedCoordinates={focusedCoordinates}
                  layerVisibility={layerVisibility}
                  onToggleLayer={handleToggleLayer}
                />
              </div>
            </div>

            {/* Right 5 Columns: Next Buses Arrival Board */}
            <div className="lg:col-span-5 space-y-3.5">
              {/* Traffic Incident Route Impact Banner */}
              <StopImpactBanner
                summary={stopImpactSummary}
                onFocusIncident={handleFocusCoordinates}
                onFilterService={setSelectedService}
              />

              {/* Bus Stop Kicker & Service Filter */}
              <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 shadow-lg space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[11px] font-mono text-emerald-400 font-semibold uppercase tracking-wider">
                      Bus Stop #{currentStop.code}
                    </div>
                    <h1 className="text-lg font-bold text-slate-100 tracking-tight">
                      {currentStop.description}
                    </h1>
                    <p className="text-xs text-slate-400">{currentStop.roadName}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-slate-300">
                      {services.length} Services
                    </span>
                  </div>
                </div>

                {/* Service Filter Tabs */}
                {services.length > 0 && (
                  <div className="pt-2 border-t border-slate-800/80">
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
                      <button
                        onClick={() => setSelectedService('all')}
                        className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap shrink-0 ${
                          selectedService === 'all'
                            ? 'bg-emerald-600 text-white font-bold shadow-sm'
                            : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        All Lines
                      </button>
                      {services.map((s) => (
                        <button
                          key={s.ServiceNo}
                          onClick={() => setSelectedService(s.ServiceNo)}
                          className={`px-2.5 py-1 rounded-md font-mono transition-colors whitespace-nowrap shrink-0 ${
                            selectedService === s.ServiceNo
                              ? 'bg-emerald-600 text-white font-bold shadow-sm'
                              : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {s.ServiceNo}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Arrivals Card Stream */}
              <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
                {isLoading ? (
                  <div className="space-y-2.5">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-28 rounded-xl bg-slate-900/60 border border-slate-800/60 animate-pulse" />
                    ))}
                  </div>
                ) : services.length === 0 ? (
                  <div className="p-8 text-center rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs">
                    No active services currently detected at stop #{currentStop.code}.
                  </div>
                ) : (
                  services
                    .filter(s => selectedService === 'all' || s.ServiceNo === selectedService)
                    .map((svc) => (
                      <BusArrivalCard
                        key={svc.ServiceNo}
                        service={svc}
                        delaysForService={delays.filter(d => d.busStopCode === currentStopCode && (!d.serviceNo || d.serviceNo === svc.ServiceNo))}
                        routeImpactsForService={stopImpactSummary.impacts.filter(imp => imp.affectedServices.includes(svc.ServiceNo))}
                        isSelected={selectedService === svc.ServiceNo}
                        onSelect={() => setSelectedService(prev => prev === svc.ServiceNo ? 'all' : svc.ServiceNo)}
                        onFocusCoordinates={handleFocusCoordinates}
                      />
                    ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Live Map Full View */}
        {activeView === 'map' && (
          <div className="h-[700px] flex flex-col space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-100">Live Singapore Transit &amp; Hazard Map</h2>
                <p className="text-xs text-slate-400">Tracking GPS vehicles, LTA traffic disruptions, and commuter crowds</p>
              </div>
            </div>
            <div className="flex-1">
              <BusMap
                currentStop={currentStop}
                services={services}
                incidents={incidents}
                delays={delays}
                allStops={SINGAPORE_BUS_STOPS}
                routeImpacts={stopImpactSummary.impacts}
                onSelectStop={handleSelectStop}
                selectedBusService={selectedService}
                focusedCoordinates={focusedCoordinates}
                layerVisibility={layerVisibility}
                onToggleLayer={handleToggleLayer}
              />
            </div>
          </div>
        )}

        {/* Traffic Incidents View */}
        {activeView === 'incidents' && (
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-xl">
            <TrafficIncidentsList
              incidents={incidents}
              onFocusIncident={handleFocusCoordinates}
              dataSource={dataSource}
            />
          </div>
        )}

        {/* Commuter Delay Reports View */}
        {activeView === 'delays' && (
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-xl">
            <UserDelayReports
              delays={delays}
              onOpenReportModal={() => setIsReportModalOpen(true)}
              onConfirmDelay={handleConfirmDelay}
              onFocusDelay={handleFocusCoordinates}
              currentStopCode={currentStopCode}
            />
          </div>
        )}

        {/* Bottom Section on Dashboard: Summary of Incidents & Delays */}
        {activeView === 'dashboard' && (
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 shadow-xl">
              <TrafficIncidentsList
                incidents={incidents.slice(0, 4)}
                onFocusIncident={handleFocusCoordinates}
                dataSource={dataSource}
              />
            </div>

            <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 shadow-xl">
              <UserDelayReports
                delays={delays.slice(0, 4)}
                onOpenReportModal={() => setIsReportModalOpen(true)}
                onConfirmDelay={handleConfirmDelay}
                onFocusDelay={handleFocusCoordinates}
                currentStopCode={currentStopCode}
              />
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 px-6 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 max-w-7xl mx-auto w-full">
        <div>
          <span>Data sources: LTA DataMall Singapore v3 Bus Arrival &amp; TrafficIncidents API</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsKeyModalOpen(true)}
            className="hover:text-slate-300 transition-colors"
          >
            LTA API Settings
          </button>
          <span>·</span>
          <button
            onClick={() => setIsReportModalOpen(true)}
            className="text-amber-400 hover:text-amber-300 transition-colors"
          >
            Report Delay
          </button>
        </div>
      </footer>

      {/* Report Delay Modal */}
      <ReportDelayModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        currentStop={currentStop}
        onSubmit={handleNewDelayReport}
      />

      {/* API Key Modal */}
      <ApiKeyModal
        isOpen={isKeyModalOpen}
        onClose={() => setIsKeyModalOpen(false)}
        onKeySaved={() => loadData(false)}
      />
    </div>
  );
}
