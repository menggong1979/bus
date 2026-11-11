import { BusArrivalResponse, TrafficIncidentsResponse, UserReportedDelay, BusStop } from '../types.ts';

const STORAGE_KEY_ACCOUNT_KEY = 'sg_buspulse_account_key';
const STORAGE_KEY_FAVORITES = 'sg_buspulse_favorites';
const STORAGE_KEY_RECENT = 'sg_buspulse_recent';

export function getStoredAccountKey(): string {
  try {
    return localStorage.getItem(STORAGE_KEY_ACCOUNT_KEY) || '';
  } catch {
    return '';
  }
}

export function setStoredAccountKey(key: string) {
  try {
    if (key.trim()) {
      localStorage.setItem(STORAGE_KEY_ACCOUNT_KEY, key.trim());
    } else {
      localStorage.removeItem(STORAGE_KEY_ACCOUNT_KEY);
    }
  } catch (e) {
    console.error('Failed to save account key', e);
  }
}

export function getFavoriteStops(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FAVORITES);
    return raw ? JSON.parse(raw) : ['83139', '01012', '03211'];
  } catch {
    return ['83139', '01012', '03211'];
  }
}

export function toggleFavoriteStop(code: string): string[] {
  try {
    const current = getFavoriteStops();
    let updated: string[];
    if (current.includes(code)) {
      updated = current.filter(c => c !== code);
    } else {
      updated = [...current, code];
    }
    localStorage.setItem(STORAGE_KEY_FAVORITES, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export async function fetchBusArrivals(busStopCode: string, serviceNo?: string): Promise<BusArrivalResponse> {
  const accountKey = getStoredAccountKey();
  const headers: Record<string, string> = {};
  if (accountKey) {
    headers['x-account-key'] = accountKey;
  }

  let url = `/api/bus-arrival?busStopCode=${encodeURIComponent(busStopCode)}`;
  if (serviceNo && serviceNo.trim()) {
    url += `&serviceNo=${encodeURIComponent(serviceNo.trim())}`;
  }

  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`Failed to fetch bus arrival (${res.status})`);
  }
  return res.json();
}

export async function fetchTrafficIncidents(): Promise<TrafficIncidentsResponse> {
  const accountKey = getStoredAccountKey();
  const headers: Record<string, string> = {};
  if (accountKey) {
    headers['x-account-key'] = accountKey;
  }

  const res = await fetch('/api/traffic-incidents', { headers });
  if (!res.ok) {
    throw new Error(`Failed to fetch traffic incidents (${res.status})`);
  }
  return res.json();
}

export async function fetchDelayReports(): Promise<UserReportedDelay[]> {
  const res = await fetch('/api/delay-reports');
  if (!res.ok) {
    throw new Error(`Failed to fetch delay reports (${res.status})`);
  }
  return res.json();
}

export async function submitDelayReport(report: Partial<UserReportedDelay>): Promise<UserReportedDelay> {
  const res = await fetch('/api/delay-reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(report)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to submit delay report');
  }
  return res.json();
}

export async function confirmDelayReport(id: string): Promise<UserReportedDelay> {
  const res = await fetch(`/api/delay-reports/${encodeURIComponent(id)}/confirm`, {
    method: 'POST'
  });
  if (!res.ok) {
    throw new Error('Failed to confirm report');
  }
  return res.json();
}

export async function searchBusStops(query: string): Promise<BusStop[]> {
  const res = await fetch(`/api/bus-stops?q=${encodeURIComponent(query)}`);
  if (!res.ok) {
    throw new Error('Failed to search bus stops');
  }
  return res.json();
}

export async function testAccountKey(accountKey: string): Promise<{ success: boolean; message: string; sampleServicesCount?: number }> {
  const res = await fetch('/api/test-key', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accountKey })
  });
  return res.json();
}
