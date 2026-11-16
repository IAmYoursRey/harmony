import { SMAN_1_NGORO_FALLBACK } from "@/services/schoolService";

export const SMAN1_NGORO_SCHOOL_ID = SMAN_1_NGORO_FALLBACK.id;

export interface DemoUserLike {
  id?: string | null;
  email?: string | null;
  role?: string | null;
}

/**
 * Returns true for preconfigured Harmony demonstration accounts bound
 * strictly to SMAN 1 Ngoro.
 */
export function isDemoNgoroUser(user?: DemoUserLike | null): boolean {
  if (!user) return false;
  const email = String(user.email || "").toLowerCase();
  const id = String(user.id || "").toLowerCase();
  return (
    email === "raihanansari3345@gmail.com" ||
    email.endsWith("@sman1ngoro.sch.id") ||
    id.startsWith("usr-demo-") ||
    id.includes("sman1ngoro") ||
    id === "usr-1789435370447" ||
    id === "seed-siti.nurhaliza"
  );
}

