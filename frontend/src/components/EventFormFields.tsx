import { useMemo, useRef, useState, type ComponentType, type Dispatch, type ReactNode, type SetStateAction } from "react";
import type { Circuit, EventItem, Referent } from "../types";
import { AddressAutocomplete } from "./AddressAutocomplete";
import { EventLocationPicker } from "./EventLocationPicker";

export type EventFormState = {
  tipo: string;
  fechaHora: string;
  lugar: string;
  circuitoCodigo: string;
  barrio: string;
  referente: string;
  anfitrion: string;
  celular: string;
  direccion: string;
  ubicacionUrl: string;
  programa: string;
  contacto: string;
  observacion: string;
  lat: string;
  lng: string;
  estadoSolicitud: string;
  resolucionNota: string;
  referentIds: string[];
  attendeeIds: string[];
};

function Field({
  label,
  required,
  hint,
  full,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  full?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`event-field${full ? " event-field--full" : ""}`}>
      <label className="event-field-label">
        {label}
        {required && <span className="event-field-req">*</span>}
      </label>
      {children}
      {hint && <p className="event-field-hint">{hint}</p>}
    </div>
  );
}

function TypeBadge({ tipo }: { tipo: string }) {
  const lc = tipo.toLowerCase();
  const map: Record<string, { cls: string; label: string }> = {
    prensa: { cls: "event-type--prensa", label: "Prensa" },
    barrial: { cls: "event-type--barrial", label: "Barrial" },
    operativo: { cls: "event-type--operativo", label: "Operativo" },
  };
  const s = map[lc] ?? map.barrial;
  return <span className={`event-type-badge ${s.cls}`}>{s.label}</span>;
}

function ReferentSearchPicker({
  referents,
  value,
  onSelect,
  onClear,
}: {
  referents: Referent[];
  value: string;
  onSelect: (ref: Referent) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = referents.find((r) => r.nombreApellido === value) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return referents.slice(0, 12);
    return referents
      .filter((r) => {
        const hay = [r.nombreApellido, r.barrio, r.circuitoCodigo, r.celular]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 12);
  }, [referents, query]);

  function pick(ref: Referent) {
    onSelect(ref);
    setQuery("");
    setOpen(false);
  }

  if (selected && !open) {
    return (
      <div className="event-ref-picked">
        <div className="event-ref-picked-main">
          <span className="event-ref-picked-name">{selected.nombreApellido}</span>
          <span className="event-ref-picked-meta">
            {[selected.barrio, selected.circuitoCodigo ? `Circ. ${selected.circuitoCodigo}` : null]
              .filter(Boolean)
              .join(" · ") || "Sin ubicación"}
          </span>
        </div>
        <button type="button" className="event-ref-picked-change" onClick={() => { onClear(); setOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}>
          Cambiar
        </button>
      </div>
    );
  }

  return (
    <div className="event-ref-search">
      <input
        ref={inputRef}
        className="event-input"
        value={query}
        placeholder="Buscar por nombre, barrio o circuito…"
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 180)}
      />
      {open && (
        <ul className="event-ref-search-list">
          {filtered.length === 0 ? (
            <li className="event-ref-search-empty">Sin coincidencias</li>
          ) : (
            filtered.map((r) => (
              <li key={r.id}>
                <button type="button" className="event-ref-search-item" onMouseDown={() => pick(r)}>
                  <span className="event-ref-search-name">{r.nombreApellido}</span>
                  <span className="event-ref-search-meta">
                    {[r.barrio, r.circuitoCodigo ? `Circ. ${r.circuitoCodigo}` : null].filter(Boolean).join(" · ")}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

interface Props {
  form: EventFormState;
  setForm: Dispatch<SetStateAction<EventFormState>>;
  editId: string | null;
  isPrensa: boolean;
  isBarrialLike: boolean;
  advancedOpen: boolean;
  onToggleAdvanced: () => void;
  circuits: Circuit[];
  referents: Referent[];
  recentPlaces: string[];
  suggestedCircuit: string;
  onQuickTime: (preset: "now+30" | "today18" | "tomorrow10") => void;
  ReferentMultiSelect: ComponentType<{
    referents: Referent[];
    selectedIds: string[];
    onChange: (ids: string[]) => void;
    onCreateNew: (name: string) => void;
  }>;
  onCreateReferent: (name: string) => void;
  nearbyEvents?: EventItem[];
  radiusKm?: 5 | 10;
  onRadiusChange?: (km: 5 | 10) => void;
  fmtDate: (v: unknown) => string;
  fmtTime: (v: unknown) => string;
}

export function EventFormFields({
  form,
  setForm,
  editId,
  isPrensa,
  isBarrialLike,
  advancedOpen,
  onToggleAdvanced,
  circuits,
  referents,
  recentPlaces,
  suggestedCircuit,
  onQuickTime,
  ReferentMultiSelect,
  onCreateReferent,
  nearbyEvents = [],
  radiusKm = 5,
  onRadiusChange,
  fmtDate,
  fmtTime,
}: Props) {
  const isNew = !editId;

  return (
    <div className="event-form">
      {isNew ? (
        <div className="event-form-intro">
          <TypeBadge tipo={form.tipo} />
          <p className="event-form-intro-text">
            {isPrensa
              ? "Solo lo esencial para agendar. El resto es opcional."
              : "Datos mínimos del encuentro. Podés ampliar después."}
          </p>
        </div>
      ) : (
        <Field label="Tipo de reunión" required full>
          <select
            className="event-input"
            value={form.tipo}
            onChange={(e) => setForm((p) => ({ ...p, tipo: e.target.value }))}
          >
            <option value="Barrial">Barrial</option>
            <option value="Prensa">Prensa</option>
            <option value="Operativo">Operativo</option>
          </select>
        </Field>
      )}

      <Field label="Cuándo" required full>
        <input
          className="event-input"
          type="datetime-local"
          value={form.fechaHora}
          onChange={(e) => setForm((p) => ({ ...p, fechaHora: e.target.value }))}
          required
        />
        <div className="event-quick-times">
          <button type="button" className="event-quick-time" onClick={() => onQuickTime("now+30")}>
            +30 min
          </button>
          <button type="button" className="event-quick-time" onClick={() => onQuickTime("today18")}>
            Hoy 18:00
          </button>
          <button type="button" className="event-quick-time" onClick={() => onQuickTime("tomorrow10")}>
            Mañana 10:00
          </button>
        </div>
      </Field>

      {isPrensa ? (
        <>
          <Field label="Medio" required full hint="Radio, TV, diario o portal">
            <input
              className="event-input"
              placeholder="Ej: LT23, El Territorio, Canal 9…"
              value={form.lugar}
              list="agenda-lugares"
              onChange={(e) => setForm((p) => ({ ...p, lugar: e.target.value }))}
              required
            />
          </Field>
          <Field label="Programa">
            <input
              className="event-input"
              placeholder="Nombre del programa"
              value={form.programa}
              onChange={(e) => setForm((p) => ({ ...p, programa: e.target.value }))}
            />
          </Field>
          <Field label="Contacto">
            <input
              className="event-input"
              placeholder="Productor, editor, teléfono…"
              value={form.contacto}
              onChange={(e) => setForm((p) => ({ ...p, contacto: e.target.value }))}
            />
          </Field>
        </>
      ) : (
        <>
          <Field label="Lugar" required full>
            <input
              className="event-input"
              placeholder="Salón, domicilio, plaza…"
              value={form.lugar}
              list="agenda-lugares"
              onChange={(e) => setForm((p) => ({ ...p, lugar: e.target.value }))}
              required
            />
          </Field>
          <Field label="Referente" hint="Buscar y elegir; completa barrio y circuito">
            <ReferentSearchPicker
              referents={referents}
              value={form.referente}
              onSelect={(ref) => {
                setForm((p) => ({
                  ...p,
                  referente: ref.nombreApellido,
                  circuitoCodigo: p.circuitoCodigo || ref.circuitoCodigo || "",
                  barrio: p.barrio || ref.barrio || "",
                  direccion: p.direccion || ref.direccion || "",
                  celular: p.celular || ref.celular || "",
                }));
              }}
              onClear={() => setForm((p) => ({ ...p, referente: "" }))}
            />
          </Field>
          <Field label="Circuito" required>
            <select
              className="event-input"
              value={form.circuitoCodigo}
              onChange={(e) => setForm((p) => ({ ...p, circuitoCodigo: e.target.value }))}
              required
            >
              <option value="">Seleccionar</option>
              {circuits.map((c) => (
                <option key={c.id} value={c.codigo}>
                  {c.codigo} – {c.nombre}
                </option>
              ))}
            </select>
            {suggestedCircuit && !form.circuitoCodigo && (
              <p className="event-field-hint">
                Sugerido:{" "}
                <button
                  type="button"
                  className="event-inline-link"
                  onClick={() => setForm((p) => ({ ...p, circuitoCodigo: suggestedCircuit }))}
                >
                  {suggestedCircuit}
                </button>
              </p>
            )}
          </Field>
        </>
      )}

      <Field label="Notas" full>
        <textarea
          className="event-input event-input--area"
          rows={2}
          placeholder="Algo importante para el equipo (opcional)"
          value={form.observacion}
          onChange={(e) => setForm((p) => ({ ...p, observacion: e.target.value }))}
        />
      </Field>

      <datalist id="agenda-lugares">
        {recentPlaces.map((place) => (
          <option key={place} value={place} />
        ))}
      </datalist>

      <button type="button" className="event-form-more" onClick={onToggleAdvanced}>
        <span>{advancedOpen ? "Ocultar opciones" : "Ubicación, invitados y más"}</span>
        <span className="event-form-more-icon">{advancedOpen ? "▴" : "▾"}</span>
      </button>

      {advancedOpen && (
        <div className="event-form-advanced">
          {isPrensa && (
            <Field label="Circuito">
              <select
                className="event-input"
                value={form.circuitoCodigo}
                onChange={(e) => setForm((p) => ({ ...p, circuitoCodigo: e.target.value }))}
              >
                <option value="">Sin circuito</option>
                {circuits.map((c) => (
                  <option key={c.id} value={c.codigo}>
                    {c.codigo} – {c.nombre}
                  </option>
                ))}
              </select>
            </Field>
          )}

          {isBarrialLike && (
            <>
              <Field label="Anfitrión">
                <input
                  className="event-input"
                  placeholder="Responsable del lugar"
                  value={form.anfitrion}
                  onChange={(e) => setForm((p) => ({ ...p, anfitrion: e.target.value }))}
                />
              </Field>
              <Field label="Celular">
                <input
                  className="event-input"
                  placeholder="3764…"
                  value={form.celular}
                  onChange={(e) => setForm((p) => ({ ...p, celular: e.target.value }))}
                />
              </Field>
              <Field label="Barrio">
                <input
                  className="event-input"
                  value={form.barrio}
                  onChange={(e) => setForm((p) => ({ ...p, barrio: e.target.value }))}
                />
              </Field>
              <Field label="Dirección">
                <input
                  className="event-input"
                  value={form.direccion}
                  onChange={(e) => setForm((p) => ({ ...p, direccion: e.target.value }))}
                />
              </Field>
              <Field label="Link de mapa" full>
                <input
                  className="event-input"
                  placeholder="https://maps.app.goo.gl/…"
                  value={form.ubicacionUrl}
                  onChange={(e) => setForm((p) => ({ ...p, ubicacionUrl: e.target.value }))}
                />
              </Field>
            </>
          )}

          <Field label="Invitados" full>
            <ReferentMultiSelect
              referents={referents}
              selectedIds={form.referentIds}
              onChange={(ids) => setForm((p) => ({ ...p, referentIds: ids }))}
              onCreateNew={onCreateReferent}
            />
          </Field>

          {editId && form.referentIds.length > 0 && (
            <Field label="Asistencia" full>
              <div className="event-attendance">
                {form.referentIds.map((id) => {
                  const ref = referents.find((r) => r.id === id);
                  if (!ref) return null;
                  const attended = form.attendeeIds.includes(id);
                  return (
                    <label key={id} className={`event-attendance-chip${attended ? " attended" : ""}`}>
                      <input
                        type="checkbox"
                        checked={attended}
                        onChange={(e) => {
                          setForm((p) => ({
                            ...p,
                            attendeeIds: e.target.checked
                              ? [...p.attendeeIds, id]
                              : p.attendeeIds.filter((x) => x !== id),
                          }));
                        }}
                      />
                      {ref.nombreApellido}
                    </label>
                  );
                })}
              </div>
            </Field>
          )}

          {editId && (
            <>
              <Field label="Estado del pedido">
                <select
                  className="event-input"
                  value={form.estadoSolicitud}
                  onChange={(e) => setForm((p) => ({ ...p, estadoSolicitud: e.target.value }))}
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="resuelto">Resuelto</option>
                </select>
              </Field>
              {form.estadoSolicitud === "resuelto" && (
                <Field label="Resolución" full>
                  <textarea
                    className="event-input event-input--area"
                    rows={2}
                    value={form.resolucionNota}
                    onChange={(e) => setForm((p) => ({ ...p, resolucionNota: e.target.value }))}
                  />
                </Field>
              )}
            </>
          )}

          <div className="event-location-block">
            <Field label="Dirección" full hint="Escribí y elegí una sugerencia, o tocá el mapa">
              <AddressAutocomplete
                value={form.direccion}
                barrio={form.barrio}
                onChange={(v) => setForm((p) => ({ ...p, direccion: v }))}
                onSelect={(place) => {
                  setForm((p) => ({
                    ...p,
                    direccion: place.label,
                    lat: String(place.lat),
                    lng: String(place.lng),
                    ubicacionUrl:
                      p.ubicacionUrl ||
                      `https://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lng}#map=16/${place.lat}/${place.lng}`,
                  }));
                }}
              />
            </Field>
            <EventLocationPicker
              active={advancedOpen}
              lat={form.lat ? Number(form.lat) : null}
              lng={form.lng ? Number(form.lng) : null}
              onPick={(lat, lng) =>
                setForm((p) => ({
                  ...p,
                  lat: String(lat),
                  lng: String(lng),
                  ubicacionUrl:
                    p.ubicacionUrl ||
                    `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`,
                }))
              }
            />
          </div>

          {editId && nearbyEvents.length > 0 && onRadiusChange && (
            <div className="event-nearby-warn">
              <strong>{nearbyEvents.length} evento(s) cerca el mismo día</strong>
              <select
                className="event-input event-input--compact"
                value={String(radiusKm)}
                onChange={(e) => onRadiusChange(Number(e.target.value) as 5 | 10)}
              >
                <option value="5">5 km</option>
                <option value="10">10 km</option>
              </select>
              <ul>
                {nearbyEvents.slice(0, 3).map((ev) => (
                  <li key={ev.id}>
                    {fmtDate(ev.fechaHora)} {fmtTime(ev.fechaHora)} · {ev.lugar ?? ev.tipo}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
