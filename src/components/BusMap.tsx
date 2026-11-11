import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { BusStop, BusServiceArrival, TrafficIncident, UserReportedDelay } from '../types.ts';
import { Bus, AlertTriangle, AlertCircle, Compass, Layers, ShieldAlert, Users } from 'lucide-react';

import { RouteImpact } from '../utils/trafficImpact.ts';

interface BusMapProps {
  currentStop: BusStop;
  services: BusServiceArrival[];
  incidents: TrafficIncident[];
  delays: UserReportedDelay[];
  allStops: BusStop[];
  routeImpacts?: RouteImpact[];
  onSelectStop: (stopCode: string) => void;
  selectedBusService?: string | null;
  focusedCoordinates?: [number, number] | null;
  layerVisibility: {
    buses: boolean;
    incidents: boolean;
    delays: boolean;
    stops: boolean;
    corridors: boolean;
  };
  onToggleLayer: (layer: 'buses' | 'incidents' | 'delays' | 'stops' | 'corridors') => void;
}

function isValidCoord(coords?: [number, number] | null): coords is [number, number] {
  if (!coords || !Array.isArray(coords) || coords.length < 2) return false;
  const [lat, lng] = coords;
  return typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng) && isFinite(lat) && isFinite(lng) && lat !== 0 && lng !== 0;
}

export const BusMap: React.FC<BusMapProps> = ({
  currentStop,
  services,
  incidents,
  delays,
  allStops,
  routeImpacts = [],
  onSelectStop,
  selectedBusService,
  focusedCoordinates,
  layerVisibility,
  onToggleLayer
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const prevStopCodeRef = useRef<string>(currentStop.code);
  const prevFocusedRef = useRef<string | null>(null);

  const validCenterLat = (typeof currentStop.latitude === 'number' && !isNaN(currentStop.latitude)) ? currentStop.latitude : 1.30155;
  const validCenterLng = (typeof currentStop.longitude === 'number' && !isNaN(currentStop.longitude)) ? currentStop.longitude : 103.90538;

  // Safe flyTo helper that ensures container has size
  const safeFlyTo = (coords: [number, number], zoom = 16) => {
    if (!mapRef.current || !isValidCoord(coords)) return;
    const map = mapRef.current;
    try {
      map.invalidateSize();
      const size = map.getSize();
      if (size.x > 0 && size.y > 0) {
        map.flyTo(coords, zoom, { duration: 1.0 });
      } else {
        map.setView(coords, zoom);
      }
    } catch (e) {
      console.warn('Leaflet flyTo fallback:', e);
      try {
        map.setView(coords, zoom);
      } catch {}
    }
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [validCenterLat, validCenterLng],
      zoom: 16,
      zoomControl: false
    });

    // CartoDB Dark Matter tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    markersLayerRef.current = layerGroup;
    mapRef.current = map;

    // Invalidate size once container renders
    requestAnimationFrame(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Invalidate size on resize
  useEffect(() => {
    if (!mapContainerRef.current) return;
    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    });
    resizeObserver.observe(mapContainerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Update map center only when stop changes or valid focusedCoordinates change (skip initial mount flyTo)
  useEffect(() => {
    if (!mapRef.current) return;

    if (focusedCoordinates && isValidCoord(focusedCoordinates)) {
      const coordKey = `${focusedCoordinates[0]},${focusedCoordinates[1]}`;
      if (prevFocusedRef.current !== coordKey) {
        prevFocusedRef.current = coordKey;
        safeFlyTo(focusedCoordinates, 17);
      }
      return;
    }

    if (currentStop.code !== prevStopCodeRef.current) {
      prevStopCodeRef.current = currentStop.code;
      if (isValidCoord([validCenterLat, validCenterLng])) {
        safeFlyTo([validCenterLat, validCenterLng], 16);
      }
    }
  }, [currentStop.code, focusedCoordinates, validCenterLat, validCenterLng]);

  // Re-render markers whenever data or visibility changes
  useEffect(() => {
    if (!mapRef.current || !markersLayerRef.current) return;
    const layer = markersLayerRef.current;
    layer.clearLayers();

    // 1. Current Bus Stop Marker
    const currentStopHtml = `
      <div class="relative flex items-center justify-center">
        <div class="absolute w-8 h-8 rounded-full bg-emerald-500/20 animate-ping"></div>
        <div class="relative w-9 h-9 rounded-xl bg-emerald-600 border-2 border-white flex items-center justify-center shadow-lg text-white font-bold text-xs">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
        </div>
        <div class="absolute -bottom-6 bg-slate-900 text-emerald-400 text-[10px] font-mono font-bold px-2 py-0.5 rounded shadow border border-slate-700 whitespace-nowrap">
          ${currentStop.code}
        </div>
      </div>
    `;

    const stopMarker = L.marker([currentStop.latitude, currentStop.longitude], {
      icon: L.divIcon({
        html: currentStopHtml,
        className: 'custom-stop-marker',
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      }),
      zIndexOffset: 1000
    });

    stopMarker.bindPopup(`
      <div class="p-1">
        <div class="text-[11px] font-mono text-emerald-400 font-semibold uppercase tracking-wider">Active Bus Stop</div>
        <div class="text-sm font-bold text-slate-100">${currentStop.description}</div>
        <div class="text-xs text-slate-400 mb-2">${currentStop.roadName} · #${currentStop.code}</div>
        <div class="text-xs text-slate-300">
          Serving: <span class="font-mono text-emerald-400">${(currentStop.services || []).join(', ')}</span>
        </div>
      </div>
    `);
    layer.addLayer(stopMarker);

    // 2. Other Nearby Bus Stops (if layer enabled)
    if (layerVisibility.stops) {
      allStops.forEach(stop => {
        if (stop.code === currentStop.code) return;
        const otherStopHtml = `
          <div class="cursor-pointer group flex flex-col items-center">
            <div class="w-6 h-6 rounded-lg bg-slate-800 border border-slate-600 group-hover:border-emerald-400 flex items-center justify-center text-slate-300 text-[10px] font-mono">
              ${stop.code.slice(0, 3)}
            </div>
          </div>
        `;

        const otherMarker = L.marker([stop.latitude, stop.longitude], {
          icon: L.divIcon({
            html: otherStopHtml,
            className: 'nearby-stop-icon',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          })
        });

        otherMarker.bindPopup(`
          <div class="p-1">
            <div class="text-[10px] font-mono text-slate-400">BUS STOP #${stop.code}</div>
            <div class="text-sm font-bold text-slate-100">${stop.description}</div>
            <div class="text-xs text-slate-400 mb-2">${stop.roadName}</div>
            <button id="select-stop-${stop.code}" class="w-full text-center px-2 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded transition-colors">
              Switch to this Stop
            </button>
          </div>
        `);

        otherMarker.on('popupopen', () => {
          const btn = document.getElementById(`select-stop-${stop.code}`);
          if (btn) {
            btn.onclick = () => {
              onSelectStop(stop.code);
            };
          }
        });

        layer.addLayer(otherMarker);
      });
    }

    // 3. Live GPS Buses (approaching this stop)
    if (layerVisibility.buses) {
      services.forEach(svc => {
        // If user is filtering by a specific service, only show that service
        if (selectedBusService && selectedBusService !== 'all' && svc.ServiceNo !== selectedBusService) {
          return;
        }

        const nextBuses = [
          { bus: svc.NextBus, seq: 1 },
          { bus: svc.NextBus2, seq: 2 },
          { bus: svc.NextBus3, seq: 3 }
        ];

        nextBuses.forEach(({ bus, seq }) => {
          if (!bus || !bus.Latitude || !bus.Longitude) return;
          const lat = parseFloat(bus.Latitude);
          const lng = parseFloat(bus.Longitude);
          if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) return;

          // Arrival calculation
          const estDate = new Date(bus.EstimatedArrival);
          const diffMins = Math.max(0, Math.round((estDate.getTime() - Date.now()) / (1000 * 60)));
          const arrivalLabel = diffMins === 0 ? 'ARR' : `${diffMins}m`;

          // Load color
          let loadBorder = 'border-emerald-500';
          let loadText = 'Seats Avail';
          let loadBg = 'bg-emerald-500/10 text-emerald-400';
          if (bus.Load === 'SDA') {
            loadBorder = 'border-amber-400';
            loadText = 'Standing Avail';
            loadBg = 'bg-amber-400/10 text-amber-400';
          } else if (bus.Load === 'LSD') {
            loadBorder = 'border-rose-500';
            loadText = 'Limited Standing';
            loadBg = 'bg-rose-500/10 text-rose-400';
          }

          const busTypeLabel = bus.Type === 'DD' ? 'Double Deck' : bus.Type === 'BD' ? 'Bendy' : 'Single Deck';

          const busHtml = `
            <div class="relative group cursor-pointer flex flex-col items-center">
              <div class="w-8 h-8 rounded-full bg-slate-900 border-2 ${loadBorder} shadow-lg flex items-center justify-center text-white font-bold text-xs tracking-tight ${seq === 1 ? 'pulse-bus' : ''}">
                ${svc.ServiceNo}
              </div>
              <div class="mt-0.5 bg-slate-950/90 text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border border-slate-700 text-slate-200">
                ${arrivalLabel}
              </div>
            </div>
          `;

          const busMarker = L.marker([lat, lng], {
            icon: L.divIcon({
              html: busHtml,
              className: 'bus-marker-icon',
              iconSize: [34, 38],
              iconAnchor: [17, 19]
            }),
            zIndexOffset: 500 - seq * 50
          });

          busMarker.bindPopup(`
            <div class="p-1 min-w-[200px]">
              <div class="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5 mb-2">
                <div class="flex items-center gap-1.5">
                  <span class="w-6 h-6 rounded bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">${svc.ServiceNo}</span>
                  <span class="text-xs text-slate-300 font-medium">${svc.Operator || 'SBS Transit'}</span>
                </div>
                <span class="text-xs font-mono font-bold text-emerald-400">${arrivalLabel === 'ARR' ? 'Arriving now' : `in ${diffMins} min`}</span>
              </div>
              <div class="space-y-1 text-xs">
                <div class="flex items-center justify-between text-slate-400">
                  <span>Capacity:</span>
                  <span class="px-1.5 py-0.5 rounded text-[11px] font-medium ${loadBg}">${loadText}</span>
                </div>
                <div class="flex items-center justify-between text-slate-400">
                  <span>Vehicle:</span>
                  <span class="text-slate-200">${busTypeLabel}</span>
                </div>
                <div class="flex items-center justify-between text-slate-400">
                  <span>GPS Position:</span>
                  <span class="font-mono text-[11px] text-slate-300">${lat.toFixed(4)}, ${lng.toFixed(4)}</span>
                </div>
              </div>
            </div>
          `);

          layer.addLayer(busMarker);
        });
      });
    }

    // 4. Traffic Incidents
    if (layerVisibility.incidents) {
      incidents.forEach(inc => {
        const lat = typeof inc.Latitude === 'number' ? inc.Latitude : parseFloat(String(inc.Latitude));
        const lng = typeof inc.Longitude === 'number' ? inc.Longitude : parseFloat(String(inc.Longitude));
        if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) return;

        const isAccident = inc.Type === 'Accident';
        const isRoadWorks = inc.Type === 'Road Works';
        const colorClass = isAccident ? 'bg-rose-600 text-white border-rose-300' : isRoadWorks ? 'bg-amber-600 text-white border-amber-300' : 'bg-orange-600 text-white border-orange-300';

        const incidentHtml = `
          <div class="relative cursor-pointer flex items-center justify-center pulse-incident">
            <div class="w-7 h-7 rounded-lg ${colorClass} border-2 shadow-lg flex items-center justify-center">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            </div>
          </div>
        `;

        const incMarker = L.marker([lat, lng], {
          icon: L.divIcon({
            html: incidentHtml,
            className: 'traffic-incident-icon',
            iconSize: [28, 28],
            iconAnchor: [14, 14]
          }),
          zIndexOffset: 700
        });

        incMarker.bindPopup(`
          <div class="p-1 max-w-[260px]">
            <div class="flex items-center gap-1.5 text-rose-400 font-bold text-xs uppercase mb-1">
              <span class="w-2 h-2 rounded-full bg-rose-500"></span>
              Traffic Incident · ${inc.Type}
            </div>
            <p class="text-xs text-slate-200 leading-snug">${inc.Message}</p>
            <div class="mt-2 text-[10px] text-slate-400 font-mono">
              Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}
            </div>
          </div>
        `);

        layer.addLayer(incMarker);
      });
    }

    // 5. User Reported Delays
    if (layerVisibility.delays) {
      delays.forEach(delay => {
        const lat = typeof delay.latitude === 'number' ? delay.latitude : parseFloat(String(delay.latitude));
        const lng = typeof delay.longitude === 'number' ? delay.longitude : parseFloat(String(delay.longitude));
        if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) return;

        const delayHtml = `
          <div class="relative cursor-pointer flex flex-col items-center pulse-delay">
            <div class="w-7 h-7 rounded-full bg-amber-500 border-2 border-white shadow-lg flex items-center justify-center text-slate-950 font-bold text-xs">
              !
            </div>
            <div class="mt-0.5 bg-amber-500 text-slate-950 font-bold text-[9px] px-1 rounded shadow">
              +${delay.estimatedDelayMinutes}m
            </div>
          </div>
        `;

        const delayMarker = L.marker([lat, lng], {
          icon: L.divIcon({
            html: delayHtml,
            className: 'user-delay-icon',
            iconSize: [30, 36],
            iconAnchor: [15, 18]
          }),
          zIndexOffset: 800
        });

        delayMarker.bindPopup(`
          <div class="p-1 max-w-[240px]">
            <div class="flex items-center justify-between text-xs mb-1">
              <span class="font-bold text-amber-400">Commuter Delay Alert</span>
              <span class="font-mono text-[10px] text-slate-400">+${delay.estimatedDelayMinutes} min delay</span>
            </div>
            <div class="text-xs font-semibold text-slate-100">${delay.busStopDescription}</div>
            ${delay.serviceNo ? `<div class="text-[11px] text-emerald-400 font-mono">Bus Service ${delay.serviceNo}</div>` : ''}
            <p class="text-xs text-slate-300 mt-1 leading-snug">"${delay.description}"</p>
            <div class="mt-2 pt-1 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <span>Confirmed by ${delay.confirmations} commuters</span>
            </div>
          </div>
        `);

        layer.addLayer(delayMarker);
      });
    }

    // 6. Incident Approach Corridors (showing how hazards bottleneck arrivals to this stop)
    if (layerVisibility.corridors && routeImpacts.length > 0) {
      routeImpacts.forEach(imp => {
        const incLat = typeof imp.incident.Latitude === 'number' ? imp.incident.Latitude : parseFloat(String(imp.incident.Latitude));
        const incLng = typeof imp.incident.Longitude === 'number' ? imp.incident.Longitude : parseFloat(String(imp.incident.Longitude));
        if (isNaN(incLat) || isNaN(incLng) || (incLat === 0 && incLng === 0)) return;

        const isHigh = imp.severity === 'high';
        const color = isHigh ? '#ef4444' : '#f59e0b';

        // Animated dashed corridor line connecting incident to active bus stop
        const polyline = L.polyline(
          [[incLat, incLng], [validCenterLat, validCenterLng]],
          {
            color: color,
            dashArray: '6, 10',
            weight: 2.5,
            opacity: 0.8
          }
        );

        polyline.bindPopup(`
          <div class="p-1 max-w-[240px]">
            <div class="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider mb-0.5">
              Approach Corridor Delay
            </div>
            <div class="text-xs font-bold text-slate-100">${imp.incident.Type} Choke Point</div>
            <p class="text-[11px] text-slate-300 mt-1 leading-snug">
              Incident located ${imp.distanceKm}km away. Squeezes approach corridor to this stop, adding approx <span class="font-bold text-amber-400">+${imp.estimatedAddedDelayMins}m</span> delay for lines: <span class="font-mono text-emerald-400">${imp.affectedServices.join(', ')}</span>.
            </p>
          </div>
        `);

        layer.addLayer(polyline);

        // Incident Congestion Radius Buffer
        const circle = L.circle([incLat, incLng], {
          radius: isHigh ? 500 : 350,
          color: color,
          weight: 1,
          dashArray: '3, 6',
          fillColor: color,
          fillOpacity: 0.12
        });
        layer.addLayer(circle);
      });
    }

  }, [currentStop, services, incidents, delays, allStops, routeImpacts, layerVisibility, selectedBusService, validCenterLat, validCenterLng]);

  const handleCenterOnStop = () => {
    safeFlyTo([validCenterLat, validCenterLng], 16);
  };

  const handleSingaporeOverview = () => {
    safeFlyTo([1.3521, 103.8198], 12);
  };

  return (
    <div className="relative w-full h-full min-h-[420px] rounded-xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950">
      {/* Map Viewport */}
      <div ref={mapContainerRef} className="w-full h-full min-h-[420px] z-0" />

      {/* Floating Layer Controls */}
      <div className="absolute top-3 right-3 z-[400] flex flex-col gap-2">
        <div className="bg-slate-900/90 backdrop-blur-md p-2 rounded-lg border border-slate-700/80 shadow-xl space-y-1 text-xs">
          <div className="flex items-center gap-1.5 px-2 py-1 text-slate-400 font-semibold text-[11px] uppercase tracking-wider border-b border-slate-800">
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span>Map Layers</span>
          </div>

          <button
            onClick={() => onToggleLayer('buses')}
            className={`w-full flex items-center justify-between gap-3 px-2 py-1 rounded text-left transition-colors ${
              layerVisibility.buses ? 'bg-emerald-500/15 text-emerald-300 font-medium' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Live Buses</span>
            </div>
            <span className="font-mono text-[10px] text-slate-500">
              {services.reduce((acc, s) => acc + (s.NextBus?.Latitude ? 1 : 0) + (s.NextBus2?.Latitude ? 1 : 0), 0)}
            </span>
          </button>

          <button
            onClick={() => onToggleLayer('incidents')}
            className={`w-full flex items-center justify-between gap-3 px-2 py-1 rounded text-left transition-colors ${
              layerVisibility.incidents ? 'bg-rose-500/15 text-rose-300 font-medium' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-400"></span>
              <span>Traffic Incidents</span>
            </div>
            <span className="font-mono text-[10px] text-slate-500">{incidents.length}</span>
          </button>

          <button
            onClick={() => onToggleLayer('corridors')}
            className={`w-full flex items-center justify-between gap-3 px-2 py-1 rounded text-left transition-colors ${
              layerVisibility.corridors ? 'bg-amber-500/15 text-amber-300 font-medium' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span>Impact Corridors</span>
            </div>
            <span className="font-mono text-[10px] text-slate-500">{routeImpacts.length}</span>
          </button>

          <button
            onClick={() => onToggleLayer('delays')}
            className={`w-full flex items-center justify-between gap-3 px-2 py-1 rounded text-left transition-colors ${
              layerVisibility.delays ? 'bg-amber-500/15 text-amber-300 font-medium' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span>User Delays</span>
            </div>
            <span className="font-mono text-[10px] text-slate-500">{delays.length}</span>
          </button>

          <button
            onClick={() => onToggleLayer('stops')}
            className={`w-full flex items-center justify-between gap-3 px-2 py-1 rounded text-left transition-colors ${
              layerVisibility.stops ? 'bg-sky-500/15 text-sky-300 font-medium' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-400"></span>
              <span>Nearby Stops</span>
            </div>
            <span className="font-mono text-[10px] text-slate-500">{allStops.length}</span>
          </button>
        </div>

        {/* Quick Position Buttons */}
        <div className="bg-slate-900/90 backdrop-blur-md p-1.5 rounded-lg border border-slate-700/80 shadow-xl flex gap-1">
          <button
            onClick={handleCenterOnStop}
            title="Center on selected stop"
            className="flex-1 px-2 py-1 text-[11px] font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors flex items-center justify-center gap-1"
          >
            <Compass className="w-3.5 h-3.5 text-emerald-400" />
            <span>Focus Stop</span>
          </button>
          <button
            onClick={handleSingaporeOverview}
            title="Singapore Overview"
            className="px-2 py-1 text-[11px] font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
          >
            SG View
          </button>
        </div>
      </div>

      {/* Floating Active Stop Breadcrumb */}
      <div className="absolute bottom-3 left-3 z-[400] bg-slate-900/90 backdrop-blur-md px-3 py-2 rounded-lg border border-slate-700/80 shadow-xl flex items-center gap-3">
        <div className="w-7 h-7 rounded-md bg-emerald-600 flex items-center justify-center text-white font-bold text-xs">
          {currentStop.code.slice(0, 3)}
        </div>
        <div>
          <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
            <span>{currentStop.description}</span>
            <span className="text-emerald-400 font-mono text-[11px]">#{currentStop.code}</span>
          </div>
          <div className="text-[11px] text-slate-400">{currentStop.roadName}</div>
        </div>
      </div>
    </div>
  );
};
