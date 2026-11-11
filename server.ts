import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { SINGAPORE_BUS_STOPS, findBusStop } from './src/data/singaporeBusStops.ts';
import { BusArrivalResponse, TrafficIncidentsResponse, UserReportedDelay, BusServiceArrival, NextBusInfo, TrafficIncident } from './src/types.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// In-memory store for commuter reported delays
let userDelays: UserReportedDelay[] = [
  {
    id: 'delay-1',
    busStopCode: '83139',
    busStopDescription: 'Opp Parkway Parade (Marine Parade Rd)',
    serviceNo: '15',
    type: 'traffic_congestion',
    estimatedDelayMinutes: 12,
    description: 'Heavy congestion near Still Road South turn due to road construction works.',
    reportedAt: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
    confirmations: 6,
    latitude: 1.3021,
    longitude: 103.9065
  },
  {
    id: 'delay-2',
    busStopCode: '83139',
    busStopDescription: 'Opp Parkway Parade (Marine Parade Rd)',
    serviceNo: '196',
    type: 'heavy_crowd',
    estimatedDelayMinutes: 8,
    description: 'Long queue at bus bay, next bus might be standing room only.',
    reportedAt: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
    confirmations: 4,
    latitude: 1.30155,
    longitude: 103.90538
  },
  {
    id: 'delay-3',
    busStopCode: '03211',
    busStopDescription: 'Opp Somerset Stn (Orchard Rd)',
    serviceNo: '106',
    type: 'traffic_congestion',
    estimatedDelayMinutes: 15,
    description: 'Severe peak hour slowdown along Orchard stretch.',
    reportedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    confirmations: 9,
    latitude: 1.30058,
    longitude: 103.83852
  }
];

// Helper to determine active LTA Account Key
function getAccountKey(req: Request): string | undefined {
  const headerKey = req.headers['x-account-key'] as string;
  if (headerKey && headerKey.trim().length > 0) return headerKey.trim();
  const envKey = process.env.LTA_ACCOUNT_KEY || process.env.DATAMALL_ACCOUNT_KEY;
  if (envKey && envKey.trim().length > 0) return envKey.trim();
  return undefined;
}

// Generate high-fidelity simulated arrival data if no key or API fails
function generateSimulatedArrivals(busStopCode: string, filterServiceNo?: string): BusArrivalResponse {
  const stop = findBusStop(busStopCode) || {
    code: busStopCode,
    roadName: 'Singapore Road',
    description: `Bus Stop ${busStopCode}`,
    latitude: 1.30155,
    longitude: 103.90538,
    services: ['15', '31', '36', '43', '48', '135', '196', '197']
  };

  const servicesToGenerate = filterServiceNo 
    ? [filterServiceNo]
    : (stop.services && stop.services.length > 0 ? stop.services : ['15', '31', '36', '48', '196']);

  const now = Date.now();
  // Dynamic offset cycle based on current minute and service number
  const services: BusServiceArrival[] = servicesToGenerate.map((svc) => {
    // Deterministic pseudo-random seed based on service and time
    const seed = svc.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const timeCycle = Math.floor(now / 20000); // changes every 20 seconds
    
    // Arrival offsets in seconds
    const m1Sec = ((seed * 7 + timeCycle * 13) % 400) + 45; // 45s to 7m
    const m2Sec = m1Sec + ((seed * 11 + 250) % 500) + 360; // next bus ~6-14m later
    const m3Sec = m2Sec + ((seed * 13 + 400) % 600) + 480; // third bus ~8-18m later

    // Generate real-time GPS locations along approach vector to bus stop
    // Approach vector slightly offset from bus stop latitude/longitude
    const angle = (seed % 8) * (Math.PI / 4);
    // Approximate bus distance proportional to arrival time (e.g. 500m/min)
    const dist1 = (m1Sec / 60) * 0.0035;
    const dist2 = (m2Sec / 60) * 0.0035;
    const dist3 = (m3Sec / 60) * 0.0035;

    const lat1 = stop.latitude - Math.sin(angle) * dist1;
    const lng1 = stop.longitude - Math.cos(angle) * dist1;

    const lat2 = stop.latitude - Math.sin(angle) * dist2;
    const lng2 = stop.longitude - Math.cos(angle) * dist2;

    const lat3 = stop.latitude - Math.sin(angle) * dist3;
    const lng3 = stop.longitude - Math.cos(angle) * dist3;

    const loads: ('SEA' | 'SDA' | 'LSD')[] = ['SEA', 'SEA', 'SDA', 'SEA', 'LSD', 'SDA'];
    const types: ('SD' | 'DD' | 'BD')[] = ['SD', 'DD', 'DD', 'SD', 'BD'];
    const operators: ('SBST' | 'SMRT' | 'GAS' | 'TTS')[] = ['SBST', 'GAS', 'SMRT', 'TTS'];

    const nextBus: NextBusInfo = {
      OriginCode: '83009',
      DestinationCode: '77009',
      EstimatedArrival: new Date(now + m1Sec * 1000).toISOString(),
      Latitude: lat1.toFixed(6),
      Longitude: lng1.toFixed(6),
      VisitNumber: '1',
      Load: loads[(seed + timeCycle) % loads.length],
      Feature: 'WAB',
      Type: types[(seed + 1) % types.length]
    };

    const nextBus2: NextBusInfo = {
      OriginCode: '83009',
      DestinationCode: '77009',
      EstimatedArrival: new Date(now + m2Sec * 1000).toISOString(),
      Latitude: lat2.toFixed(6),
      Longitude: lng2.toFixed(6),
      VisitNumber: '1',
      Load: loads[(seed + timeCycle + 1) % loads.length],
      Feature: 'WAB',
      Type: types[(seed + 2) % types.length]
    };

    const nextBus3: NextBusInfo = {
      OriginCode: '83009',
      DestinationCode: '77009',
      EstimatedArrival: new Date(now + m3Sec * 1000).toISOString(),
      Latitude: lat3.toFixed(6),
      Longitude: lng3.toFixed(6),
      VisitNumber: '1',
      Load: loads[(seed + timeCycle + 2) % loads.length],
      Feature: 'WAB',
      Type: types[(seed + 3) % types.length]
    };

    return {
      ServiceNo: svc,
      Operator: operators[seed % operators.length],
      NextBus: nextBus,
      NextBus2: nextBus2,
      NextBus3: nextBus3
    };
  });

  // Sort services by service number natural order
  services.sort((a, b) => a.ServiceNo.localeCompare(b.ServiceNo, undefined, { numeric: true }));

  return {
    'odata.metadata': 'https://datamall2.mytransport.sg/ltaodataservice/$metadata#BusArrivalv3/@Element',
    BusStopCode: busStopCode,
    Services: services,
    dataSource: 'simulated'
  };
}

// Generate realistic simulated traffic incidents around Singapore
function generateSimulatedIncidents(): TrafficIncident[] {
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `(${day}/${month})${timeStr}`;

  return [
    {
      Type: 'Accident',
      Latitude: 1.3068,
      Longitude: 103.9082,
      Message: `${prefix} Accident on ECP (towards Changi) after Still Rd Exit. Avoid lane 1.`
    },
    {
      Type: 'Road Works',
      Latitude: 1.3022,
      Longitude: 103.9031,
      Message: `${prefix} Road works on Marine Parade Rd near Parkway Parade. Right lane closed.`
    },
    {
      Type: 'Heavy Traffic',
      Latitude: 1.3285,
      Longitude: 103.8821,
      Message: `${prefix} Heavy Traffic on PIE (towards Changi) between Kallang Way and Eunos Flyover.`
    },
    {
      Type: 'Vehicle breakdown',
      Latitude: 1.3045,
      Longitude: 103.8340,
      Message: `${prefix} Vehicle breakdown on Orchard Road before Paterson Rd junction. Center lane affected.`
    },
    {
      Type: 'Heavy Traffic',
      Latitude: 1.2842,
      Longitude: 103.8580,
      Message: `${prefix} Heavy Traffic on MCE (towards AYE) after Marina Blvd Exit.`
    },
    {
      Type: 'Obstacle',
      Latitude: 1.3412,
      Longitude: 103.9315,
      Message: `${prefix} Obstacle on Tampines Ave 5 towards Ave 4. Caution advised.`
    }
  ];
}

// --- API Endpoints ---

// 1. Bus Arrival v3 Proxy
app.get('/api/bus-arrival', async (req: Request, res: Response) => {
  const busStopCode = (req.query.busStopCode as string) || '83139';
  const serviceNo = req.query.serviceNo as string | undefined;
  const accountKey = getAccountKey(req);

  if (accountKey) {
    try {
      let ltaUrl = `https://datamall2.mytransport.sg/ltaodataservice/v3/BusArrival?BusStopCode=${encodeURIComponent(busStopCode)}`;
      if (serviceNo && serviceNo.trim()) {
        ltaUrl += `&ServiceNo=${encodeURIComponent(serviceNo.trim())}`;
      }

      const ltaRes = await fetch(ltaUrl, {
        headers: {
          'AccountKey': accountKey,
          'accept': 'application/json'
        }
      });

      if (ltaRes.ok) {
        const data = await ltaRes.json();
        return res.json({
          ...data,
          dataSource: 'lta_live',
          liveConnected: true,
          timestamp: new Date().toISOString()
        });
      } else {
        const errText = await ltaRes.text().catch(() => '');
        console.warn(`LTA DataMall rejected request (HTTP ${ltaRes.status}): ${errText}`);
        const fallback = generateSimulatedArrivals(busStopCode, serviceNo);
        return res.json({
          ...fallback,
          dataSource: 'simulated',
          liveConnected: false,
          ltaStatusCode: ltaRes.status,
          ltaErrorMessage: `LTA DataMall returned HTTP ${ltaRes.status} (${errText || 'Invalid AccountKey'}). Check your key at datamall.lta.gov.sg.`
        });
      }
    } catch (err: any) {
      console.error('Error fetching from LTA DataMall:', err);
    }
  }

  // Fallback to simulated real-time data
  const fallbackData = generateSimulatedArrivals(busStopCode, serviceNo);
  res.json({
    ...fallbackData,
    dataSource: 'simulated',
    liveConnected: false,
    ltaErrorMessage: 'Direct live connection requires an LTA DataMall AccountKey.'
  });
});

// 2. Traffic Incidents Proxy
app.get('/api/traffic-incidents', async (req: Request, res: Response) => {
  const accountKey = getAccountKey(req);

  if (accountKey) {
    try {
      const ltaUrl = 'https://datamall2.mytransport.sg/ltaodataservice/TrafficIncidents';
      const ltaRes = await fetch(ltaUrl, {
        headers: {
          'AccountKey': accountKey,
          'accept': 'application/json'
        }
      });

      if (ltaRes.ok) {
        const data = await ltaRes.json();
        return res.json({
          ...data,
          dataSource: 'lta_live',
          liveConnected: true
        });
      } else {
        console.warn(`LTA TrafficIncidents returned status ${ltaRes.status}`);
      }
    } catch (err) {
      console.error('Error fetching traffic incidents:', err);
    }
  }

  const simulated = generateSimulatedIncidents();
  res.json({
    'odata.metadata': 'https://datamall2.mytransport.sg/ltaodataservice/$metadata#TrafficIncidents',
    value: simulated,
    dataSource: 'simulated',
    liveConnected: false
  });
});

// 3. User Reported Delays
app.get('/api/delay-reports', (_req: Request, res: Response) => {
  res.json(userDelays);
});

app.post('/api/delay-reports', (req: Request, res: Response) => {
  const { busStopCode, busStopDescription, serviceNo, type, estimatedDelayMinutes, description, latitude, longitude } = req.body;

  if (!busStopCode || !type || !description) {
    return res.status(400).json({ error: 'Missing required fields (busStopCode, type, description)' });
  }

  const stop = findBusStop(busStopCode);
  const newReport: UserReportedDelay = {
    id: `delay-${Date.now()}`,
    busStopCode,
    busStopDescription: busStopDescription || (stop ? `${stop.description} (${stop.roadName})` : `Stop ${busStopCode}`),
    serviceNo: serviceNo || undefined,
    type,
    estimatedDelayMinutes: Number(estimatedDelayMinutes) || 10,
    description,
    reportedAt: new Date().toISOString(),
    confirmations: 1,
    latitude: latitude || (stop ? stop.latitude : 1.30155),
    longitude: longitude || (stop ? stop.longitude : 103.90538)
  };

  userDelays.unshift(newReport);
  // Keep up to 50 recent reports
  if (userDelays.length > 50) {
    userDelays = userDelays.slice(0, 50);
  }

  res.status(201).json(newReport);
});

// 4. Upvote / Confirm Delay Report
app.post('/api/delay-reports/:id/confirm', (req: Request, res: Response) => {
  const { id } = req.params;
  const report = userDelays.find(d => d.id === id);
  if (!report) {
    return res.status(404).json({ error: 'Report not found' });
  }

  report.confirmations += 1;
  res.json(report);
});

// 5. Bus Stops Directory / Search
app.get('/api/bus-stops', (req: Request, res: Response) => {
  const query = (req.query.q as string) || '';
  if (!query) {
    return res.json(SINGAPORE_BUS_STOPS);
  }

  const q = query.toLowerCase().trim();
  const filtered = SINGAPORE_BUS_STOPS.filter(s => 
    s.code.includes(q) ||
    s.description.toLowerCase().includes(q) ||
    s.roadName.toLowerCase().includes(q) ||
    (s.services && s.services.some(svc => svc.toLowerCase() === q))
  );

  res.json(filtered);
});

// 6. Config Status Check
app.get('/api/config-status', (req: Request, res: Response) => {
  const accountKey = getAccountKey(req);
  res.json({
    hasEnvKey: !!(process.env.LTA_ACCOUNT_KEY || process.env.DATAMALL_ACCOUNT_KEY),
    activeKeyConfigured: !!accountKey,
    keyMasked: accountKey ? `${accountKey.slice(0, 4)}...${accountKey.slice(-4)}` : null
  });
});

// Test connection to LTA DataMall with a specified key
app.post('/api/test-key', async (req: Request, res: Response) => {
  const { accountKey } = req.body;
  if (!accountKey) {
    return res.status(400).json({ success: false, message: 'AccountKey is required' });
  }

  try {
    const testUrl = 'https://datamall2.mytransport.sg/ltaodataservice/v3/BusArrival?BusStopCode=83139';
    const response = await fetch(testUrl, {
      headers: {
        'AccountKey': accountKey.trim(),
        'accept': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      return res.json({
        success: true,
        message: 'Successfully connected to LTA DataMall API!',
        sampleServicesCount: data.Services ? data.Services.length : 0
      });
    } else {
      return res.status(response.status).json({
        success: false,
        message: `LTA DataMall rejected the key (HTTP ${response.status}). Check if the key is valid.`
      });
    }
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: `Failed to reach LTA DataMall server: ${err?.message || 'Network error'}`
    });
  }
});

// Mounting Vite in development or static files in production
async function startServer() {
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`SG BusPulse server listening on port ${port} (mode: ${isProd ? 'production' : 'development'})`);
  });
}

startServer();
