import { BusStop, TrafficIncident, BusServiceArrival, UserReportedDelay } from '../types.ts';

export interface RouteImpact {
  incident: TrafficIncident;
  distanceKm: number;
  directionFromStop: string;
  affectedServices: string[];
  severity: 'low' | 'moderate' | 'high';
  estimatedAddedDelayMins: number;
  reason: string;
}

export interface StopImpactSummary {
  overallLevel: 'clear' | 'low' | 'moderate' | 'severe';
  title: string;
  description: string;
  impacts: RouteImpact[];
  affectedServiceNos: string[];
  maxEstimatedDelay: number;
}

// Calculate distance in kilometers between two lat/lng coordinates (Haversine formula)
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round((R * c) * 10) / 10;
}

// Get cardinal direction from bus stop to incident
export function getDirection(stopLat: number, stopLng: number, incLat: number, incLng: number): string {
  const dLat = incLat - stopLat;
  const dLng = incLng - stopLng;
  const angle = Math.atan2(dLng, dLat) * (180 / Math.PI);
  
  if (angle >= -22.5 && angle < 22.5) return 'North';
  if (angle >= 22.5 && angle < 67.5) return 'Northeast';
  if (angle >= 67.5 && angle < 112.5) return 'East';
  if (angle >= 112.5 && angle < 157.5) return 'Southeast';
  if (angle >= 157.5 || angle < -157.5) return 'South';
  if (angle >= -157.5 && angle < -112.5) return 'Southwest';
  if (angle >= -112.5 && angle < -67.5) return 'West';
  return 'Northwest';
}

// Known major arterial and expressway corridors associated with Singapore bus stops and routes
const STOP_CORRIDORS: Record<string, { roadKeywords: string[]; approachKeywords: string[]; expressways: string[] }> = {
  // Marine Parade Rd (Opp Parkway Parade - 83139 / 83131)
  '83139': {
    roadKeywords: ['marine parade', 'still rd', 'east coast', 'amber', 'joo chiat', 'tanjong katong'],
    approachKeywords: ['still rd south', 'marine parade rd', 'mountbatten', 'bedok south'],
    expressways: ['ecp', 'east coast parkway', 'pie', 'pan island']
  },
  '83131': {
    roadKeywords: ['marine parade', 'still rd', 'east coast', 'amber'],
    approachKeywords: ['still rd south', 'marine parade rd'],
    expressways: ['ecp', 'east coast parkway']
  },
  // Bras Basah / Hotel Rendezvous - 01012
  '01012': {
    roadKeywords: ['bras basah', 'bencoolen', 'orchard', 'stamford', 'victoria', 'middle rd', 'rochor'],
    approachKeywords: ['bras basah rd', 'dhoby ghaut', 'selegie', 'somerset'],
    expressways: ['cte', 'central expressway', 'nicoll highway']
  },
  // Somerset / Orchard Rd - 03211
  '03211': {
    roadKeywords: ['orchard', 'somerset', 'scotts', 'paterson', 'grange', 'killiney'],
    approachKeywords: ['orchard rd', 'cairnhill', 'river valley'],
    expressways: ['cte', 'central expressway']
  },
  // Orchard Blvd / Orchard Stn Exit 13 - 09048
  '09048': {
    roadKeywords: ['orchard blvd', 'paterson', 'scotts', 'tanglin', 'grange'],
    approachKeywords: ['orchard blvd', 'scotts rd'],
    expressways: ['cte']
  },
  // Telok Blangah / Opp VivoCity - 10169
  '10169': {
    roadKeywords: ['telok blangah', 'harbourfront', 'keppel', 'henderson', 'alexandra', 'kampong bahru'],
    approachKeywords: ['telok blangah rd', 'harbourfront walk', 'maritime square'],
    expressways: ['mrg', 'aye', 'ayer rajah', 'mce', 'marina coastal expressway']
  },
  // Kallang Stn - 80059
  '80059': {
    roadKeywords: ['sims ave', 'geylang', 'kallang', 'lorong', 'guillemard'],
    approachKeywords: ['sims ave', 'kallang bahru'],
    expressways: ['kpe', 'kallang-paya lebar', 'pie']
  },
  // Tampines Int - 64009
  '64009': {
    roadKeywords: ['tampines', 'simei', 'pasir ris', 'changi'],
    approachKeywords: ['tampines ave 4', 'tampines ave 5', 'tampines ave 7'],
    expressways: ['tpe', 'tampines expressway', 'pie']
  },
  // Jurong East Int - 28009
  '28009': {
    roadKeywords: ['jurong gateway', 'boon lay', 'jurong town hall', 'toh guan', 'bukit batok'],
    approachKeywords: ['jurong gateway rd', 'jurong east central'],
    expressways: ['pie', 'aye']
  },
  // Woodlands Temp Int - 46009
  '46009': {
    roadKeywords: ['woodlands', 'marsiling', 'admiralty', 'causeway'],
    approachKeywords: ['woodlands ave', 'woodlands square'],
    expressways: ['sle', 'seletar expressway', 'bke']
  },
  // Clementi Stn - 17181
  '17181': {
    roadKeywords: ['clementi', 'west coast', 'commonwealth', 'sunset'],
    approachKeywords: ['clementi ave 3', 'clementi ave 2'],
    expressways: ['aye', 'pie']
  },
  // Bedok Stn - 84029
  '84029': {
    roadKeywords: ['bedok', 'chai chee', 'simpang bedok', 'new upper changi'],
    approachKeywords: ['bedok north ave 1', 'bedok central'],
    expressways: ['pie', 'ecp']
  }
};

/**
 * Evaluates all traffic incidents against a bus stop and its serving bus lines.
 * Returns detailed impact reports explaining how each incident causes arrival delays.
 */
export function analyzeTrafficImpactOnStop(
  currentStop: BusStop,
  services: BusServiceArrival[],
  incidents: TrafficIncident[]
): StopImpactSummary {
  const servingServices = services.map(s => s.ServiceNo);
  const stopKeywords = STOP_CORRIDORS[currentStop.code] || {
    roadKeywords: [currentStop.roadName.toLowerCase()],
    approachKeywords: [currentStop.roadName.toLowerCase()],
    expressways: ['ecp', 'pie', 'cte', 'aye']
  };

  const impacts: RouteImpact[] = [];
  const affectedServicesSet = new Set<string>();

  incidents.forEach(inc => {
    const lat = typeof inc.Latitude === 'number' ? inc.Latitude : parseFloat(String(inc.Latitude));
    const lng = typeof inc.Longitude === 'number' ? inc.Longitude : parseFloat(String(inc.Longitude));
    
    // Distance calculation
    let distKm = 999;
    let direction = 'Vicinity';
    if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
      distKm = calculateDistanceKm(currentStop.latitude, currentStop.longitude, lat, lng);
      direction = getDirection(currentStop.latitude, currentStop.longitude, lat, lng);
    }

    const msgLower = (inc.Message || '').toLowerCase();
    const typeLower = (inc.Type || '').toLowerCase();

    // Check if incident matches stop's road keywords, approach corridors, or expressways
    const onDirectRoad = stopKeywords.roadKeywords.some(kw => msgLower.includes(kw));
    const onApproach = stopKeywords.approachKeywords.some(kw => msgLower.includes(kw));
    const onExpressway = stopKeywords.expressways.some(kw => msgLower.includes(kw));
    const inCloseProximity = distKm <= 3.5;

    // Filter relevant incidents (within 7km corridor or road match)
    if (onDirectRoad || onApproach || (onExpressway && distKm <= 6.5) || inCloseProximity) {
      let severity: 'low' | 'moderate' | 'high' = 'low';
      let delayMins = 5;
      let reason = '';

      if (onDirectRoad && distKm <= 1.5) {
        severity = 'high';
        delayMins = typeLower.includes('accident') ? 14 : 9;
        reason = `Direct choke point: ${inc.Type} on ${currentStop.roadName} within ${distKm}km of this stop. Buses in queue cannot pass.`;
      } else if (onExpressway && distKm <= 4.0) {
        severity = 'moderate';
        delayMins = typeLower.includes('accident') ? 11 : 7;
        reason = `Approach corridor slowed: Incident along expressway approach (${distKm}km ${direction}). Express & trunk services face crawling traffic.`;
      } else if (onApproach || distKm <= 3.0) {
        severity = 'moderate';
        delayMins = 6;
        reason = `Arterial slow-down: Incident on nearby feeder road (${distKm}km ${direction}) causing traffic back-up.`;
      } else {
        severity = 'low';
        delayMins = 4;
        reason = `Minor advisory: Incident located ${distKm}km ${direction}. May cause slight schedule variance.`;
      }

      // Determine which services at this stop are most impacted
      // Express/long distance lines are especially impacted by expressway incidents (e.g., 36, 15, 48, 966)
      const affectedAtThisStop: string[] = [];
      servingServices.forEach(svc => {
        if (onDirectRoad) {
          // Everyone passing this road is affected
          affectedAtThisStop.push(svc);
        } else if (onExpressway) {
          // Lines with expressway runs or long hauls (like 15, 36, 48, 966, 196, 106, 190)
          if (['15', '36', '48', '966', '196', '197', '106', '190', '502', '518', '7', '14', '65'].includes(svc) || servingServices.length <= 4) {
            affectedAtThisStop.push(svc);
          }
        } else if (distKm <= 2.5) {
          affectedAtThisStop.push(svc);
        }
      });

      // Default to top services if none specifically isolated
      const finalAffected = affectedAtThisStop.length > 0 ? affectedAtThisStop : servingServices.slice(0, 3);
      finalAffected.forEach(s => affectedServicesSet.add(s));

      impacts.push({
        incident: inc,
        distanceKm: distKm,
        directionFromStop: direction,
        affectedServices: finalAffected,
        severity,
        estimatedAddedDelayMins: delayMins,
        reason
      });
    }
  });

  // Sort impacts by severity (high > moderate > low) then distance
  const severityOrder = { high: 3, moderate: 2, low: 1 };
  impacts.sort((a, b) => severityOrder[b.severity] - severityOrder[a.severity] || a.distanceKm - b.distanceKm);

  if (impacts.length === 0) {
    return {
      overallLevel: 'clear',
      title: 'Routes Running Nominally',
      description: `No active traffic incidents are currently impeding approach corridors for bus stop #${currentStop.code}. Bus arrivals should adhere to scheduled GPS intervals.`,
      impacts: [],
      affectedServiceNos: [],
      maxEstimatedDelay: 0
    };
  }

  const highestSeverity = impacts[0].severity;
  const maxDelay = Math.max(...impacts.map(i => i.estimatedAddedDelayMins));
  const affectedList = Array.from(affectedServicesSet);

  let overallLevel: 'low' | 'moderate' | 'severe' = 'low';
  let title = 'Minor Commute Advisory';
  let description = `${impacts.length} nearby incident may introduce minor headway variance (+${maxDelay}m) for routes serving this stop.`;

  if (highestSeverity === 'high') {
    overallLevel = 'severe';
    title = 'Significant Route Delays Detected';
    description = `Severe choke point detected on ${currentStop.roadName} vicinity. Bus lines (${affectedList.slice(0, 5).join(', ')}) face an estimated +${maxDelay}m slowdown.`;
  } else if (highestSeverity === 'moderate') {
    overallLevel = 'moderate';
    title = 'Corridor Congestion Affecting Arrivals';
    description = `Incidents along approach arteries are slowing incoming buses (${affectedList.slice(0, 5).join(', ')}). Expect +${maxDelay}m arrival padding.`;
  }

  return {
    overallLevel,
    title,
    description,
    impacts,
    affectedServiceNos: affectedList,
    maxEstimatedDelay: maxDelay
  };
}
