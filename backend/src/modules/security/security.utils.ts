import { ForbiddenException } from "@nestjs/common";

export function requireWriteRole(roleHeader?: string) {
  const role = (roleHeader ?? "").trim().toLowerCase();
  const allowed = new Set(["admin", "coordinador", "coordinator"]);
  if (!allowed.has(role)) {
    throw new ForbiddenException("Permisos insuficientes para operacion de escritura");
  }
}

export function parseAllowedCircuits(header?: string) {
  if (!header) return [];
  return header
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
}
