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

export interface DemoAccountPayload {
  email: string;
  name: string;
  sub: string;
  role: "developer" | "student" | "teacher";
  picture: string;
  isDemo: true;
}

const INDONESIAN_STUDENT_FIRST_NAMES = [
  "Aditya", "Budi", "Dimas", "Farhan", "Gilang", "Ilham", "Maulana", "Raditya",
  "Rizky", "Yoga", "Fajar", "Bagas", "Bayu", "Hendra", "Arya", "Anisa", "Citra",
  "Dewi", "Fitri", "Indah", "Lestari", "Putri", "Rina", "Sari", "Zahra", "Nabila",
  "Tiara", "Maya", "Anggun", "Salsabila"
];

const INDONESIAN_LAST_NAMES = [
  "Pratama", "Saputra", "Wijaya", "Kusuma", "Santoso", "Hidayat", "Setiawan",
  "Nugroho", "Utomo", "Wibowo", "Ramadhan", "Firmansyah", "Permana", "Wardhana", "Siregar"
];

const INDONESIAN_TEACHER_NAMES = [
  { prefix: "Ibu", name: "Siti Nurhaliza", title: "S.Pd." },
  { prefix: "Bpk.", name: "Bambang Hidayat", title: "M.Pd." },
  { prefix: "Bpk.", name: "Agus Santoso", title: "S.Pd." },
  { prefix: "Ibu", name: "Sri Wahyuni", title: "S.Si." },
  { prefix: "Bpk.", name: "Eko Prasetyo", title: "S.T." },
  { prefix: "Ibu", name: "Dewi Sartika", title: "S.Pd." },
  { prefix: "Bpk.", name: "Budi Utomo", title: "M.Pd." },
  { prefix: "Ibu", name: "Tri Wulandari", title: "S.Pd." }
];

/**
 * Generates an isolated, collision-free demonstration account payload
 * so multiple concurrent players do not overwrite or collide with each other in multiplayer.
 */
export function generateRandomDemoPayload(
  role: "developer" | "student" | "teacher" = "student",
  preferredName?: string
): DemoAccountPayload {
  const randCode = `${Date.now().toString(36).slice(-4)}${Math.random().toString(36).substring(2, 6)}`;
  const trimmed = preferredName?.trim();

  if (role === "developer") {
    const devName = trimmed ? `${trimmed} (Dev)` : `Raihan Dev #${randCode.toUpperCase()}`;
    const slug = trimmed
      ? trimmed.toLowerCase().replace(/[^a-z0-9]/g, ".").replace(/\.+/g, ".").slice(0, 16)
      : "dev";
    return {
      email: `${slug}.${randCode}@sman1ngoro.sch.id`,
      name: devName,
      sub: `usr-demo-dev-${Date.now()}-${randCode}`,
      role: "developer",
      picture: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(randCode)}`,
      isDemo: true,
    };
  }

  if (role === "teacher") {
    let teacherName: string;
    if (trimmed) {
      teacherName = trimmed.includes(",") ? trimmed : `${trimmed}, S.Pd.`;
    } else {
      const template = INDONESIAN_TEACHER_NAMES[Math.floor(Math.random() * INDONESIAN_TEACHER_NAMES.length)];
      teacherName = `${template.name}, ${template.title}`;
    }
    const slug = teacherName
      .toLowerCase()
      .split(",")[0]
      .replace(/[^a-z0-9]/g, ".")
      .replace(/\.+/g, ".")
      .replace(/^\.|\.$/g, "")
      .slice(0, 20);

    return {
      email: `${slug}.${randCode}@sman1ngoro.sch.id`,
      name: teacherName,
      sub: `usr-demo-tc-${Date.now()}-${randCode}`,
      role: "teacher",
      picture: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(teacherName + randCode)}`,
      isDemo: true,
    };
  }

  // Student role
  let studentName: string;
  if (trimmed) {
    studentName = trimmed;
  } else {
    const fn = INDONESIAN_STUDENT_FIRST_NAMES[Math.floor(Math.random() * INDONESIAN_STUDENT_FIRST_NAMES.length)];
    const ln = INDONESIAN_LAST_NAMES[Math.floor(Math.random() * INDONESIAN_LAST_NAMES.length)];
    studentName = `${fn} ${ln}`;
  }

  const slug = studentName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ".")
    .replace(/\.+/g, ".")
    .replace(/^\.|\.$/g, "")
    .slice(0, 20);

  return {
    email: `${slug}.${randCode}@sman1ngoro.sch.id`,
    name: studentName,
    sub: `usr-demo-st-${Date.now()}-${randCode}`,
    role: "student",
    picture: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(studentName + randCode)}`,
    isDemo: true,
  };
}

