/** Búsqueda de direcciones vía Nominatim (Posadas / Misiones). */

export interface GeoPlace {
  label: string;
  lat: number;
  lng: number;
}

const POSADAS_VIEWBOX = "-56.05,-27.25,-55.75,-27.45";

export async function searchAddresses(
  query: string,
  opts?: { barrio?: string; limit?: number }
): Promise<GeoPlace[]> {
  const term = query.trim();
  if (term.length < 3) return [];

  const parts = [term, opts?.barrio?.trim(), "Posadas", "Misiones", "Argentina"].filter(Boolean);
  const q = encodeURIComponent(parts.join(", "));

  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=${opts?.limit ?? 6}&countrycodes=ar&viewbox=${POSADAS_VIEWBOX}&bounded=0&addressdetails=0`;

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return [];

  const rows = (await res.json()) as { display_name?: string; lat?: string; lon?: string }[];
  if (!Array.isArray(rows)) return [];

  return rows
    .filter((r) => r.lat && r.lon && r.display_name)
    .map((r) => ({
      label: shortenLabel(r.display_name!),
      lat: Number(r.lat),
      lng: Number(r.lon),
    }))
    .filter((p) => !Number.isNaN(p.lat) && !Number.isNaN(p.lng));
}

function shortenLabel(full: string): string {
  const parts = full.split(",").map((s) => s.trim());
  if (parts.length <= 3) return full;
  return parts.slice(0, 3).join(", ");
}
