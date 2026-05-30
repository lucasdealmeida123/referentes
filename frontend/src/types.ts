export type Campaign = {
  id: string;
  nombre: string;
  anio: number;
  estado: string;
  fechaEleccion?: string | null;
};

export type Circuit = {
  id: string;
  campaignId: string;
  codigo: string;
  nombre: string;
  zona?: string | null;
  electoresNacionales?: number | null;
  electoresExtranjeros?: number | null;
  cantidadEscuelas?: number | null;
  cantidadMesas?: number | null;
  polygonCoordinates?: string | null;
  polygon?: { type: "Polygon"; coordinates: number[][][] } | null;
};

export type School = {
  id: string;
  campaignId: string;
  circuitId?: string | null;
  nombre: string;
  direccion?: string | null;
  lat?: number | null;
  lng?: number | null;
  cantMesasDeclaradas?: number | null;
};

export type ElectionTable = {
  id: string;
  campaignId: string;
  schoolId: string;
  numero: number;
  tipo?: string | null;
  estadoCobertura?: string | null;
};

export type Person = {
  id: string;
  campaignId: string;
  dni: string;
  nombre: string;
  apellido: string;
  telefono?: string | null;
};

export type Role = {
  id: string;
  campaignId: string;
  codigo: string;
  nombre: string;
  nivel: string;
};

export type Assignment = {
  id: string;
  campaignId: string;
  personId: string;
  roleId: string;
  circuitId?: string | null;
  schoolId?: string | null;
  tableId?: string | null;
  estado: string;
  person?: Pick<Person, "nombre" | "apellido" | "dni">;
  role?: Pick<Role, "codigo" | "nombre" | "nivel">;
};

export type CoverageItem = {
  tableId: string;
  tableNumero: number;
  schoolId: string;
  schoolNombre: string;
  circuitCodigo: string;
  estado: "critico" | "parcial" | "optimo";
  titular?: string | null;
  suplente?: string | null;
};

export type CoverageDashboard = {
  campaignId: string;
  resumen: {
    mesasTotales: number;
    criticas: number;
    parciales: number;
    optimas: number;
    mesasConTitular?: number;
    mesasConSuplente?: number;
  };
  porCircuito: Array<{
    circuito: string;
    mesasTotales: number;
    criticas: number;
    parciales: number;
    optimas: number;
  }>;
  porEscuela: Array<{
    schoolId: string;
    schoolNombre: string;
    circuito: string;
    mesasTotales: number;
    criticas: number;
    parciales: number;
    optimas: number;
  }>;
};

export type EventItem = {
  id: string;
  campaignId: string;
  tipo: string;
  fechaHora?: string | null;
  lugar?: string | null;
  direccion?: string | null;
  programa?: string | null;
  contacto?: string | null;
  observacion?: string | null;
  anfitrion?: string | null;
  celular?: string | null;
  barrio?: string | null;
  circuitoCodigo?: string | null;
  referente?: string | null;
  ubicacionUrl?: string | null;
  lat?: number | null;
  lng?: number | null;
  estadoSolicitud?: "pendiente" | "resuelto" | string;
  resolucionNota?: string | null;
  /** IDs de referentes invitados/participantes */
  referentIds?: string[] | null;
  /** IDs de referentes que efectivamente asistieron */
  attendeeIds?: string[] | null;
};

export type Referent = {
  id: string;
  campaignId: string;
  nombreApellido: string;
  celular?: string | null;
  direccion?: string | null;
  barrio?: string | null;
  chacra?: string | null;
  circuitoCodigo?: string | null;
  ubicacionUrl?: string | null;
  referenteDe?: string | null;
  observacion?: string | null;
};

export type MapSchool = {
  id: string;
  nombre: string;
  circuitId?: string | null;
  circuitoCodigo: string | null;
  lat: number | null;
  lng: number | null;
  coverage: {
    criticas: number;
    parciales: number;
    optimas: number;
    estado: "critico" | "parcial" | "optimo";
  };
};

export type MapDataset = {
  circuits: Array<{
    id: string;
    codigo: string;
    nombre: string;
    zona?: string | null;
    electoresNacionales?: number | null;
    cantidadMesas?: number | null;
    polygon: { type: "Polygon"; coordinates: number[][][] } | null;
  }>;
  schools: MapSchool[];
  events: Array<{
    id: string;
    tipo: string;
    lugar: string | null;
    circuitoCodigo: string | null;
    fechaHora?: string | null;
    lat?: number | null;
    lng?: number | null;
    estadoSolicitud?: string | null;
  }>;
  coverageSummary: {
    mesasTotales: number;
    criticas: number;
    parciales: number;
    optimas: number;
  };
};

export type UserRole = "visualizador" | "carga" | "admin";

export type Page =
  | "dashboard"
  | "referentes"
  | "map"
  | "territory"
  | "fiscalization"
  | "operations"
  | "actividades";
