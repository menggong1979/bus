# SG BusPulse — Real-Time Singapore Bus Arrivals, Incidents & Delays

Live Singapore bus arrivals with real-time GPS tracking, official LTA traffic incident overlays, route delay impact analysis, and commuter-reported crowdsourcing for smoother journeys.

---

## Features

- **LTA DataMall v3 Live Bus Arrivals**: Real-time arrival countdowns, passenger capacity loads (`SEA`, `SDA`, `LSD`), vehicle deck types (Single Deck, Double Deck, Bendy), and wheelchair accessibility (`WAB`).
- **20-Second Auto-Refresh Loop**: Synchronized with LTA DataMall's 20-second arrival update cycle with manual refresh override.
- **Real-Time GPS Vehicle Tracking**: Live GPS bus markers moving on the map with capacity indicators and quick focus actions.
- **Traffic Incident Corridor Analysis**: Correlates official LTA traffic incidents with approaching bus corridors, estimating arrival delays (+X min) and showing choke point corridors on the map.
- **Commuter-Reported Delay Alerts**: Crowdsourced incident reporting and confirmation voting system for real-time disruption awareness.
- **Interactive Dark Map**: Leaflet map with CartoDB dark tiles, custom animated markers, choke corridors, and granular layer toggles.

---

## API Endpoints Used

All official LTA DataMall requests require the `AccountKey` HTTP header:
- **Bus Arrival v3**: `https://datamall2.mytransport.sg/ltaodataservice/v3/BusArrival?BusStopCode=83139` (optional `&ServiceNo=15`)
- **Traffic Incidents**: `https://datamall2.mytransport.sg/ltaodataservice/TrafficIncidents`

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment (Optional)
Copy `.env.example` to `.env` and provide your LTA DataMall AccountKey:
```env
LTA_ACCOUNT_KEY="your_lta_account_key_here"
```
*Note: If no key is configured, SG BusPulse automatically runs an intelligent, live-synchronized Singapore simulation engine for instant evaluation.*

### 3. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for Production
```bash
npm run build
npm start
```
