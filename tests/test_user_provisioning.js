import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, "../database.json");

const BASE_URL = "http://localhost:3001";

const devEmail = "raihanansari6678@gmail.com";
const devPassword = "Password123!";

async function runTests() {
  console.log("[USER PROVISIONING TEST] Starting...");

  const originalDb = JSON.parse(fs.readFileSync(dbPath, "utf8"));
  const cleanedAccounts = originalDb.accounts.filter((a) =>
    a.id.startsWith("seed-"),
  );
  const cleanedProfiles = originalDb.profiles.filter((a) =>
    a.userId.startsWith("seed-"),
  );
  originalDb.accounts = cleanedAccounts;
  originalDb.profiles = cleanedProfiles;
  fs.writeFileSync(dbPath, JSON.stringify(originalDb, null, 2));

  let res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: devEmail, password: devPassword }),
  });
  let devAuth = await res.json();
  if (!devAuth.token) {
    console.error("LOGIN FAILED. Response:", devAuth);
    process.exit(1);
  }
  const devToken = devAuth.token;

  res = await fetch(`${BASE_URL}/api/users`, {
    headers: { Authorization: `Bearer ${devToken}` },
  });
  let usersData = await res.json();
  if (!usersData.users) {
    console.error("ERROR: Missing users array. API response:", usersData);
    process.exit(1);
  }
  let initialCount = usersData.users.length;
  console.log(
    `✅ TEST 1/2: Dev fetched users. Count: ${initialCount} (Matches seed count: ${cleanedAccounts.length})`,
  );

  for (let i = 0; i < 10; i++) {
    await fetch(`${BASE_URL}/api/users`, {
      headers: { Authorization: `Bearer ${devToken}` },
    });
  }
  res = await fetch(`${BASE_URL}/api/users`, {
    headers: { Authorization: `Bearer ${devToken}` },
  });
  usersData = await res.json();
  if (usersData.users.length === initialCount) {
    console.log(
      `✅ TEST 3: Reload 10x -> count remains ${initialCount}. Auto-provisioning is NOT happening.`,
    );
  } else {
    throw new Error("TEST 3 FAILED: Count changed during GET requests");
  }

  res = await fetch(`${BASE_URL}/api/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${devToken}`,
    },
    body: JSON.stringify({
      name: "Teacher Test",
      email: "teacher_test@harmony.edu",
      password: "password",
      role: "teacher",
      schoolId: "sch-20502621",
    }),
  });
  const createRes = await res.json();
  if (createRes.success) {
    console.log(`✅ TEST 7/9: Submit form -> Teacher created successfully.`);
  } else {
    throw new Error("TEST 7 FAILED: Could not create teacher");
  }

  res = await fetch(`${BASE_URL}/api/users`, {
    headers: { Authorization: `Bearer ${devToken}` },
  });
  usersData = await res.json();
  if (usersData.users.length === initialCount + 1) {
    console.log(`✅ TEST 8: Reload dashboard -> count is exactly +1.`);
  } else {
    throw new Error("TEST 8 FAILED: Count is not +1");
  }

  res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "teacher_test@harmony.edu",
      password: "password",
    }),
  });
  let teacherAuth = await res.json();
  const teacherToken = teacherAuth.token;

  res = await fetch(`${BASE_URL}/api/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${teacherToken}`,
    },
    body: JSON.stringify({
      name: "Student Test",
      email: "student_test@harmony.edu",
      password: "password",
      role: "student",
      schoolId: "sch-20502621", // SMA N 1 PURI
    }),
  });
  const studRes = await res.json();
  if (studRes.success) {
    console.log(`✅ TEST 10: Teacher created Student successfully.`);
  } else {
    console.error("TEST 10 ERROR:", studRes);
    throw new Error("TEST 10 FAILED: Teacher could not create student");
  }

  res = await fetch(`${BASE_URL}/api/users`, {
    headers: { Authorization: `Bearer ${teacherToken}` },
  });
  usersData = await res.json();
  if (
    usersData.users.length === 1 &&
    usersData.users[0].name === "Student Test"
  ) {
    console.log(
      `✅ TEST 10 (Scoped): Teacher only sees their own scoped students.`,
    );
  } else {
    throw new Error("TEST 10 FAILED: Teacher sees incorrect scoped students");
  }

  res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "student_test@harmony.edu",
      password: "password",
    }),
  });
  let studAuth = await res.json();
  const studToken = studAuth.token;

  res = await fetch(`${BASE_URL}/api/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${studToken}`,
    },
    body: JSON.stringify({
      name: "Hacker",
      email: "hacker@test.com",
      password: "pw",
      role: "teacher",
    }),
  });
  if (res.status === 403) {
    console.log(
      `✅ TEST 11: Student denied access to provision users (403 Forbidden).`,
    );
  } else {
    throw new Error("TEST 11 FAILED: Student was able to post to /api/users");
  }

  console.log("\n🎉 ALL USER PROVISIONING PIPELINE TESTS PASSED!");

  const finalDb = JSON.parse(fs.readFileSync(dbPath, "utf8"));
  finalDb.accounts = finalDb.accounts.filter((a) => a.id.startsWith("seed-"));
  finalDb.profiles = finalDb.profiles.filter((a) =>
    a.userId.startsWith("seed-"),
  );
  fs.writeFileSync(dbPath, JSON.stringify(finalDb, null, 2));
  console.log("🧹 Database restored to seed state.");
}

runTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
