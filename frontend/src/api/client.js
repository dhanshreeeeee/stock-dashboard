const BASE = "/api";

export async function fetchStocks(capTier) {
  const url = capTier ? `${BASE}/stocks?cap_tier=${capTier}` : `${BASE}/stocks`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch stocks: ${res.status}`);
  return res.json();
}

export async function fetchStockDetail(ticker) {
  const res = await fetch(`${BASE}/stocks/${ticker}`);
  if (!res.ok) throw new Error(`Failed to fetch ${ticker}: ${res.status}`);
  return res.json();
}

export async function fetchStockNews(ticker) {
  const res = await fetch(`${BASE}/stocks/${ticker}/news`);
  if (!res.ok) throw new Error(`Failed to fetch news for ${ticker}: ${res.status}`);
  return res.json();
}

export async function fetchSectors() {
  const res = await fetch(`${BASE}/sectors`);
  if (!res.ok) throw new Error(`Failed to fetch sectors: ${res.status}`);
  return res.json();
}

export async function fetchSectorStocks(sector) {
  const res = await fetch(`${BASE}/sectors/${encodeURIComponent(sector)}`);
  if (!res.ok) throw new Error(`Failed to fetch sector ${sector}: ${res.status}`);
  return res.json();
}

export async function fetchBriefing() {
  const res = await fetch(`${BASE}/briefing`);
  if (!res.ok) throw new Error(`Failed to fetch briefing: ${res.status}`);
  return res.json();
}
