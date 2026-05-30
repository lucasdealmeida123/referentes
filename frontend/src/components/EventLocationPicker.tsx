import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface Props {
  lat?: number | null;
  lng?: number | null;
  onPick: (lat: number, lng: number) => void;
  /** Cuando el contenedor pasa de oculto a visible (modal / panel). */
  active?: boolean;
}

function getValidCoords(lat?: number | null, lng?: number | null): { lat: number; lng: number } | null {
  if (lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return { lat, lng };
}

export function EventLocationPicker({ lat, lng, onPick, active = true }: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, { zoomControl: true }).setView([-27.367, -55.896], 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);

    const placeMarker = (pickedLat: number, pickedLng: number, fly = false) => {
      if (!markerRef.current) {
        markerRef.current = L.marker([pickedLat, pickedLng], { draggable: true }).addTo(map);
        markerRef.current.on("dragend", () => {
          const pos = markerRef.current!.getLatLng();
          onPickRef.current(Number(pos.lat.toFixed(6)), Number(pos.lng.toFixed(6)));
        });
      } else {
        markerRef.current.setLatLng([pickedLat, pickedLng]);
      }
      if (fly) map.setView([pickedLat, pickedLng], 16);
    };

    map.on("click", (e: L.LeafletMouseEvent) => {
      const pickedLat = Number(e.latlng.lat.toFixed(6));
      const pickedLng = Number(e.latlng.lng.toFixed(6));
      placeMarker(pickedLat, pickedLng);
      onPickRef.current(pickedLat, pickedLng);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const coords = getValidCoords(lat, lng);
    if (!coords || !mapRef.current) return;
    const { lat: pickedLat, lng: pickedLng } = coords;
    const map = mapRef.current;
    if (!markerRef.current) {
      markerRef.current = L.marker([pickedLat, pickedLng], { draggable: true }).addTo(map);
      markerRef.current.on("dragend", () => {
        const pos = markerRef.current!.getLatLng();
        onPickRef.current(Number(pos.lat.toFixed(6)), Number(pos.lng.toFixed(6)));
      });
    } else {
      markerRef.current.setLatLng([pickedLat, pickedLng]);
    }
    map.setView([pickedLat, pickedLng], map.getZoom() < 14 ? 15 : map.getZoom());
  }, [lat, lng]);

  useEffect(() => {
    if (!active || !mapRef.current || !containerRef.current) return;
    const map = mapRef.current;
    const t1 = setTimeout(() => map.invalidateSize(), 80);
    const t2 = setTimeout(() => map.invalidateSize(), 350);
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(containerRef.current);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      ro.disconnect();
    };
  }, [active]);

  return (
    <div className="event-map-picker">
      <div ref={containerRef} className="event-map-picker-canvas" />
      <p className="event-map-picker-hint">Tocá el mapa o arrastrá el pin para ajustar</p>
    </div>
  );
}
