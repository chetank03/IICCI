import { API_BASE } from "./config";

const FILTER_OPTIONS_CACHE_KEY = "iicci_filter_options_cache_v1";
const FILTER_OPTIONS_TTL_MS = 5 * 60 * 1000;

function qs(params) {
  const entries = Object.entries(params).filter(([, v]) => v);
  return entries.length ? "?" + new URLSearchParams(entries) : "";
}

async function checkOk(res) {
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const d = await res.json();
      detail = d.detail || detail;
    } catch (_) {}
    throw new Error(detail);
  }
  return res;
}

export async function fetchSummary(filters = {}) {
  const res = await fetch(`${API_BASE}/stats/summary/${qs(filters)}`);
  await checkOk(res);
  return res.json();
}

export async function fetchDashboard(filters = {}) {
  const { signal, ...queryFilters } = filters;
  const res = await fetch(`${API_BASE}/stats/dashboard/${qs(queryFilters)}`, { signal });
  await checkOk(res);
  return res.json();
}

export async function fetchYearwise(filters = {}) {
  const res = await fetch(`${API_BASE}/stats/yearwise/${qs(filters)}`);
  await checkOk(res);
  const data = await res.json();
  return data.rows;
}

export async function fetchSectorWise(filters = {}) {
  const res = await fetch(`${API_BASE}/stats/sector-wise/${qs(filters)}`);
  await checkOk(res);
  const data = await res.json();
  return data.rows;
}

export async function fetchTopProducts(filters = {}) {
  const res = await fetch(`${API_BASE}/stats/top-products/${qs(filters)}`);
  await checkOk(res);
  const data = await res.json();
  return data.rows;
}

export async function fetchFilterOptions() {
  try {
    const raw = window.localStorage.getItem(FILTER_OPTIONS_CACHE_KEY);
    if (raw) {
      const cached = JSON.parse(raw);
      if (cached?.expiresAt > Date.now() && cached?.data) {
        return cached.data;
      }
    }
  } catch (_) {}

  const res = await fetch(`${API_BASE}/stats/filters/`);
  await checkOk(res);
  const data = await res.json();

  try {
    window.localStorage.setItem(FILTER_OPTIONS_CACHE_KEY, JSON.stringify({
      data,
      expiresAt: Date.now() + FILTER_OPTIONS_TTL_MS,
    }));
  } catch (_) {}

  return data;
}

export async function fetchTradeTable(filters = {}, page = 1, pageSize = 25) {
  const params = { ...filters, page, page_size: pageSize };
  const entries = Object.entries(params).filter(([, v]) => v !== "" && v !== undefined);
  const queryStr = entries.length ? "?" + new URLSearchParams(entries) : "";
  const res = await fetch(`${API_BASE}/trade/table/${queryStr}`, {
    credentials: "include",
  });
  await checkOk(res);
  return res.json();
}
