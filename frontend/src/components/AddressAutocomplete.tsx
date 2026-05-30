import { useEffect, useRef, useState } from "react";
import { searchAddresses, type GeoPlace } from "../utils/geocoding";

interface Props {
  value: string;
  barrio?: string;
  placeholder?: string;
  onChange: (value: string) => void;
  onSelect: (place: GeoPlace) => void;
}

export function AddressAutocomplete({
  value,
  barrio,
  placeholder = "Calle y altura, barrio…",
  onChange,
  onSelect,
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GeoPlace[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const q = value.trim();
    if (q.length < 3) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const rows = await searchAddresses(q, { barrio, limit: 6 });
        setResults(rows);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 420);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, barrio]);

  function pick(place: GeoPlace) {
    onSelect(place);
    setOpen(false);
    setResults([]);
  }

  return (
    <div className="event-address-search">
      <input
        ref={inputRef}
        className="event-input"
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => value.trim().length >= 3 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        autoComplete="off"
      />
      {loading && <span className="event-address-loading">Buscando…</span>}
      {open && results.length > 0 && (
        <ul className="event-address-list">
          {results.map((place, i) => (
            <li key={`${place.lat}-${place.lng}-${i}`}>
              <button type="button" className="event-address-item" onMouseDown={() => pick(place)}>
                {place.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && !loading && value.trim().length >= 3 && results.length === 0 && (
        <p className="event-address-empty">Sin sugerencias. Probá con calle y número.</p>
      )}
    </div>
  );
}
