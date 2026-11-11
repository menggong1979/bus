export interface NextBusInfo {
  OriginCode: string;
  DestinationCode: string;
  EstimatedArrival: string; // ISO 8601 string
  Latitude: string;
  Longitude: string;
  VisitNumber: string;
  Load: 'SEA' | 'SDA' | 'LSD' | string; // Seats Available, Standing Available, Limited Standing
  Feature: 'WAB' | string; // Wheelchair accessible
  Type: 'SD' | 'DD' | 'BD' | string; // Single Deck, Double Deck, Bendy
}

export interface BusServiceArrival {
  ServiceNo: string;
  Operator: 'SBST' | 'SMRT' | 'GAS' | 'TTS' | string;
  NextBus?: NextBusInfo;
  NextBus2?: NextBusInfo;
  NextBus3?: NextBusInfo;
}

export interface BusArrivalResponse {
  'odata.metadata'?: string;
  BusStopCode: string;
  Services: BusServiceArrival[];
  dataSource?: 'lta_live' | 'simulated';
  liveConnected?: boolean;
  ltaStatusCode?: number;
  ltaErrorMessage?: string;
  timestamp?: string;
}

export interface TrafficIncident {
  Type: 'Accident' | 'Road Works' | 'Vehicle breakdown' | 'Heavy Traffic' | 'Obstacle' | 'Diversion' | string;
  Latitude: number;
  Longitude: number;
  Message: string;
}

export interface TrafficIncidentsResponse {
  'odata.metadata'?: string;
  value: TrafficIncident[];
  dataSource?: 'lta_live' | 'simulated';
}

export interface UserReportedDelay {
  id: string;
  busStopCode: string;
  busStopDescription: string;
  serviceNo?: string;
  type: 'heavy_crowd' | 'breakdown' | 'traffic_congestion' | 'bad_weather' | 'route_detour' | 'long_wait';
  estimatedDelayMinutes: number;
  description: string;
  reportedAt: string; // ISO string
  confirmations: number;
  userVotes?: string[]; // IDs or sessions that confirmed
  latitude?: number;
  longitude?: number;
}

export interface BusStop {
  code: string;
  roadName: string;
  description: string;
  latitude: number;
  longitude: number;
  services?: string[];
}
