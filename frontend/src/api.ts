import type {
  Campaign, Circuit, School, ElectionTable, Person, Role,
  Assignment, CoverageItem, CoverageDashboard, EventItem, Referent, MapDataset,
} from "./types";

function resolveApiBase(): string {
  const raw = import.meta.env.VITE_API_URL;
  if (typeof raw === "string") {
    if (raw === "") {
      return typeof window !== "undefined" ? window.location.origin : "";
    }
    return raw.replace(/\/$/, "");
  }
  return "http://localhost:3001";
}

const BASE = resolveApiBase();
const API  = `${BASE}/api`;

async function get<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${API}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => { if (v) url.searchParams.set(k, v); });
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`HTTP ${res.status} – ${path}`);
  return res.json() as Promise<T>;
}

async function write<T>(method: "POST" | "PUT", path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-user-role": "admin"
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} – ${path}`);
  return res.json() as Promise<T>;
}

async function remove(path: string): Promise<void> {
  const res = await fetch(`${API}${path}`, {
    method: "DELETE",
    headers: {
      "x-user-role": "admin"
    }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} – ${path}`);
}

async function upload<T>(path: string, formData: FormData): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "x-user-role": "admin" },
    body: formData
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} – ${path}`);
  return res.json() as Promise<T>;
}

export const api = {
  campaigns: {
    list: () => get<Campaign[]>("/campaigns"),
  },

  territory: {
    circuits: (campaignId: string) =>
      get<Circuit[]>("/circuits", { campaignId }),
    schools: (campaignId: string, circuitId?: string) =>
      get<School[]>("/schools", { campaignId, ...(circuitId ? { circuitId } : {}) }),
    tables: (campaignId: string, schoolId?: string) =>
      get<ElectionTable[]>("/tables", { campaignId, ...(schoolId ? { schoolId } : {}) }),
    createCircuit: (payload: Record<string, unknown>) =>
      write<Circuit>("POST", "/circuits", payload),
    updateCircuit: (id: string, payload: Record<string, unknown>) =>
      write<Circuit>("PUT", `/circuits/${id}`, payload),
    createSchool: (payload: Record<string, unknown>) =>
      write<School>("POST", "/schools", payload),
    updateSchool: (id: string, payload: Record<string, unknown>) =>
      write<School>("PUT", `/schools/${id}`, payload),
    previewKmz: (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      return upload<{
        circuits: unknown[];
        schools: unknown[];
        warnings: string[];
      }>("/imports/territory/kmz/preview", fd);
    },
    commitKmz: (campaignId: string, file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("campaignId", campaignId);
      return upload<{
        summary: {
          circuitsCreated: number;
          circuitsUpdated: number;
          schoolsCreated: number;
          schoolsUpdated: number;
          tablesCreated: number;
        };
        warnings: string[];
      }>("/imports/territory/kmz/commit", fd);
    },
  },

  fiscalization: {
    people: (campaignId: string) =>
      get<Person[]>("/fiscalization/people", { campaignId }),
    roles: (campaignId: string) =>
      get<Role[]>("/fiscalization/roles", { campaignId }),
    assignments: (campaignId: string) =>
      get<Assignment[]>("/fiscalization/assignments", { campaignId }),
    coverage: (campaignId: string) =>
      get<CoverageItem[]>("/fiscalization/coverage", { campaignId }),
    coverageDashboard: (campaignId: string) =>
      get<CoverageDashboard>("/fiscalization/coverage/dashboard", { campaignId }),
    createPerson: (payload: Record<string, unknown>) =>
      write<Person>("POST", "/fiscalization/people", payload),
    updatePerson: (id: string, payload: Record<string, unknown>) =>
      write<Person>("PUT", `/fiscalization/people/${id}`, payload),
    deletePerson: (id: string) =>
      remove(`/fiscalization/people/${id}`),
    createRole: (payload: Record<string, unknown>) =>
      write<Role>("POST", "/fiscalization/roles", payload),
    updateRole: (id: string, payload: Record<string, unknown>) =>
      write<Role>("PUT", `/fiscalization/roles/${id}`, payload),
    deleteRole: (id: string) =>
      remove(`/fiscalization/roles/${id}`),
    createAssignment: (payload: Record<string, unknown>) =>
      write<Assignment>("POST", "/fiscalization/assignments", payload),
    updateAssignment: (id: string, payload: Record<string, unknown>) =>
      write<Assignment>("PUT", `/fiscalization/assignments/${id}`, payload),
    deleteAssignment: (id: string) =>
      remove(`/fiscalization/assignments/${id}`),
  },

  operations: {
    events: (campaignId: string) =>
      get<EventItem[]>("/operations/events", { campaignId }),
    referents: (campaignId: string) =>
      get<Referent[]>("/operations/referents", { campaignId }),
    createEvent: (payload: Record<string, unknown>) =>
      write<EventItem>("POST", "/operations/events", payload),
    updateEvent: (id: string, payload: Record<string, unknown>) =>
      write<EventItem>("PUT", `/operations/events/${id}`, payload),
    deleteEvent: (id: string) =>
      remove(`/operations/events/${id}`),
    createReferent: (payload: Record<string, unknown>) =>
      write<Referent>("POST", "/operations/referents", payload),
    updateReferent: (id: string, payload: Record<string, unknown>) =>
      write<Referent>("PUT", `/operations/referents/${id}`, payload),
    deleteReferent: (id: string) =>
      remove(`/operations/referents/${id}`),
    previewReferentes: (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      return upload<{ referentes: { cantidad: number; muestra: unknown[] } }>(
        "/operations/imports/referentes/preview",
        fd
      );
    },
    commitReferentes: (campaignId: string, file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("campaignId", campaignId);
      return upload<{ referentesCreados: number; omitidos?: number }>(
        "/operations/imports/referentes/commit",
        fd
      );
    },
  },

  map: {
    dataset: (params: {
      campaignId: string;
      circuitCode?: string;
      coverageStatus?: string;
      eventType?: string;
      centerLat?: string;
      centerLng?: string;
      radiusKm?: string;
    }) => get<MapDataset>("/map/dataset", params as Record<string, string>),
  },
};
