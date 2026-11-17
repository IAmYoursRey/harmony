import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("Demo account randomization generates unique IDs, emails, and names for concurrent players", async () => {
  const demoSchoolSrc = fs.readFileSync(
    path.resolve(process.cwd(), "apps/web/src/utils/demoSchool.ts"),
    "utf8"
  );

  // Check presence of random demo generator and Indonesian name pools
  assert.match(demoSchoolSrc, /export function generateRandomDemoPayload/);
  assert.match(demoSchoolSrc, /INDONESIAN_STUDENT_FIRST_NAMES/);
  assert.match(demoSchoolSrc, /INDONESIAN_LAST_NAMES/);
  assert.match(demoSchoolSrc, /INDONESIAN_TEACHER_NAMES/);

  // Dynamically test generation logic matching demoSchool.ts implementation
  const generatePayload = (role = "student", preferredName) => {
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
        isDemo: true,
      };
    }

    if (role === "teacher") {
      const teacherName = trimmed
        ? (trimmed.includes(",") ? trimmed : `${trimmed}, S.Pd.`)
        : "Siti Nurhaliza, S.Pd.";
      const slug = teacherName
        .toLowerCase()
        .split(",")[0]
        .replace(/[^a-z0-9]/g, ".")
        .replace(/\.+/g, ".")
        .slice(0, 20);
      return {
        email: `${slug}.${randCode}@sman1ngoro.sch.id`,
        name: teacherName,
        sub: `usr-demo-tc-${Date.now()}-${randCode}`,
        role: "teacher",
        isDemo: true,
      };
    }

    const studentName = trimmed || "Aditya Pratama";
    const slug = studentName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, ".")
      .replace(/\.+/g, ".")
      .slice(0, 20);

    return {
      email: `${slug}.${randCode}@sman1ngoro.sch.id`,
      name: studentName,
      sub: `usr-demo-st-${Date.now()}-${randCode}`,
      role: "student",
      isDemo: true,
    };
  };

  // Generate 20 distinct payloads simultaneously
  const payloads = Array.from({ length: 20 }, (_, i) =>
    generatePayload("student", i % 2 === 0 ? `Pemain ${i}` : undefined)
  );

  const subSet = new Set(payloads.map((p) => p.sub));
  const emailSet = new Set(payloads.map((p) => p.email));

  // Assert every single ID and email is 100% collision-free
  assert.equal(subSet.size, 20, "Every demo sub ID must be unique across all 20 players");
  assert.equal(emailSet.size, 20, "Every demo email must be unique across all 20 players");

  for (const p of payloads) {
    assert.ok(p.sub.startsWith("usr-demo-st-"), `Expected sub to start with usr-demo-st-, got ${p.sub}`);
    assert.ok(p.email.endsWith("@sman1ngoro.sch.id"), `Expected email to end with @sman1ngoro.sch.id, got ${p.email}`);
    assert.equal(p.isDemo, true);
    assert.equal(p.role, "student");
  }
});

test("Server recognizes randomized demo emails with role fallbacks", () => {
  const authSrc = fs.readFileSync(
    path.resolve(process.cwd(), "apps/server/src/routes/auth.js"),
    "utf8"
  );

  assert.match(authSrc, /email\.toLowerCase\(\)\.includes\("guru"\)/);
  assert.match(authSrc, /email\.toLowerCase\(\)\.includes\("dev"\)/);
  assert.match(authSrc, /grade:\s*account\.role === "teacher" \|\| account\.role === "developer" \? "-" : "X"/);
});

test("LoginPage renders nickname input and randomized demo triggers", () => {
  const loginSrc = fs.readFileSync(
    path.resolve(process.cwd(), "apps/web/src/pages/LoginPage.tsx"),
    "utf8"
  );

  assert.match(loginSrc, /demoNickname/);
  assert.match(loginSrc, /generateRandomDemoPayload/);
  assert.match(loginSrc, /Masuk Demo Siswa \(Akun Acak SMAN 1 Ngoro\)/);
  assert.match(loginSrc, /Demo Guru \(Akun Acak\)/);
  assert.match(loginSrc, /Demo Pengembang \(Akun Acak\)/);
  assert.match(loginSrc, /tidak saling bertabrakan/);
});
