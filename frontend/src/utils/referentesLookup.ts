import type { Referent } from "../types";

export type ReferentGroup = {
  key: string;
  label: string;
  referents: Referent[];
};

function norm(s?: string | null) {
  return (s ?? "").trim().toLowerCase();
}

export function formatPhone(celular?: string | null) {
  if (!celular) return null;
  const d = celular.replace(/\D/g, "");
  if (d.length < 8) return celular;
  if (d.length === 10) return `${d.slice(0, 4)}-${d.slice(4, 7)}-${d.slice(7)}`;
  return d;
}

export function whatsappUrl(celular?: string | null) {
  const d = (celular ?? "").replace(/\D/g, "");
  if (!d) return null;
  const withCountry = d.startsWith("54") ? d : `549${d.replace(/^0+/, "")}`;
  return `https://wa.me/${withCountry}`;
}

export function isValidCircuit(circuito?: string | null) {
  if (!circuito) return false;
  return /^\d{1,2}[AB]?$/i.test(circuito.trim());
}

/** Dependencia / rol / institución (planilla columna DEPENDENCIA + observación) */
export function referentCaracteristica(r: Referent) {
  return [r.referenteDe, r.observacion].filter(Boolean).join(" · ").trim();
}

export function filterReferents(referents: Referent[], query: string, filters: {
  barrio?: string;
  circuito?: string;
  dependencia?: string;
  caracteristica?: string;
}) {
  const q = norm(query);
  return referents.filter((r) => {
    if (filters.barrio && norm(r.barrio) !== norm(filters.barrio)) return false;
    if (filters.circuito && norm(r.circuitoCodigo) !== norm(filters.circuito)) return false;
    if (filters.dependencia && norm(r.referenteDe) !== norm(filters.dependencia)) return false;
    if (filters.caracteristica) {
      const car = norm(referentCaracteristica(r));
      const needle = norm(filters.caracteristica);
      if (!car.includes(needle) && norm(r.referenteDe) !== needle) return false;
    }
    if (!q) return true;
    const haystack = [
      r.nombreApellido,
      r.celular,
      r.direccion,
      r.barrio,
      r.chacra,
      r.circuitoCodigo,
      r.referenteDe,
      r.observacion,
    ]
      .map(norm)
      .join(" ");
    return haystack.includes(q) || norm(referentCaracteristica(r)).includes(q);
  });
}

export function topCaracteristicas(referents: Referent[], limit = 12) {
  const counts = new Map<string, number>();
  for (const r of referents) {
    const dep = (r.referenteDe ?? "").trim();
    if (!dep || dep.length < 3) continue;
    const key = dep.replace(/\s+/g, " ");
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es"))
    .slice(0, limit)
    .map(([value, count]) => ({ value, count }));
}

export function topValues(referents: Referent[], pick: (r: Referent) => string | null | undefined, limit = 20) {
  const counts = new Map<string, number>();
  for (const r of referents) {
    const v = (pick(r) ?? "").trim();
    if (!v) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es"))
    .slice(0, limit)
    .map(([value, count]) => ({ value, count }));
}

export function matchBarrioFromQuery(
  query: string,
  barrios: { value: string; count: number }[]
): { value: string; count: number } | null {
  const q = query.trim().toLowerCase();
  if (q.length < 3) return null;
  const exact = barrios.find((b) => b.value.toLowerCase() === q);
  if (exact) return exact;
  const partial = barrios.filter((b) => b.value.toLowerCase().includes(q));
  if (partial.length === 1) return partial[0];
  if (partial.length > 1) {
    const best = partial.sort((a, b) => {
      const aStarts = a.value.toLowerCase().startsWith(q) ? 0 : 1;
      const bStarts = b.value.toLowerCase().startsWith(q) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      return b.count - a.count;
    })[0];
    if (best.value.toLowerCase().includes(q)) return best;
  }
  return null;
}

export function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function polygonCentroid(polygon?: { coordinates?: number[][][] } | null): { lat: number; lng: number } | null {
  const ring = polygon?.coordinates?.[0];
  if (!ring?.length) return null;
  let lat = 0;
  let lng = 0;
  for (const [lng0, lat0] of ring) {
    lat += lat0;
    lng += lng0;
  }
  return { lat: lat / ring.length, lng: lng / ring.length };
}

/** Circuito electoral más cercano a un punto (usa polígonos del mapa). */
export function nearestCircuitFromPoint(
  point: { lat: number; lng: number },
  circuits: { codigo: string; polygon?: { coordinates?: number[][][] } | null }[]
): { codigo: string; km: number } | null {
  let best: { codigo: string; km: number } | null = null;
  for (const c of circuits) {
    const cen = polygonCentroid(c.polygon ?? null);
    if (!cen) continue;
    const km = distanceKm(point, cen);
    if (!best || km < best.km) best = { codigo: c.codigo, km };
  }
  return best;
}

export function groupByBarrio(referents: Referent[]): ReferentGroup[] {
  const map = new Map<string, Referent[]>();
  for (const r of referents) {
    const label = r.barrio?.trim() || "Sin barrio";
    const list = map.get(label) ?? [];
    list.push(r);
    map.set(label, list);
  }
  return [...map.entries()]
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0], "es"))
    .map(([label, refs]) => ({
      key: label,
      label,
      referents: refs.sort((a, b) => a.nombreApellido.localeCompare(b.nombreApellido, "es")),
    }));
}
