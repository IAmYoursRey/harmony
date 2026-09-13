import fetch from "node-fetch";
import jwt from "jsonwebtoken";
import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const API_BASE = "http://localhost:3001/api";
const SECRET = process.env.JWT_SECRET || "geosense_dev_secret_only";

const devToken = jwt.sign({ id: "usr-dev-123", role: "dev" }, SECRET);
const teacherToken = jwt.sign({ id: "usr-teach-123", role: "teacher" }, SECRET);
const studentToken = jwt.sign({ id: "usr-stud-123", role: "student" }, SECRET);

async function testAnalyticsApi() {
  console.log("--- STARTING ANALYTICS TESTS ---\n");

  const res1 = await fetch(`${API_BASE}/analytics/system`, {
    headers: { Authorization: `Bearer ${devToken}` },
  });
  console.log(
    `[DEV GET SYSTEM ANALYTICS] Expected 200, Got ${res1.status} -> ${res1.status === 200 ? "PASS" : "FAIL"}`,
  );

  const res2 = await fetch(`${API_BASE}/analytics/system`, {
    headers: { Authorization: `Bearer ${teacherToken}` },
  });
  console.log(
    `[TEACHER GET SYSTEM ANALYTICS] Expected 403, Got ${res2.status} -> ${res2.status === 403 ? "PASS" : "FAIL"}`,
  );

  const res3 = await fetch(
    `${API_BASE}/analytics/class?grade=X&classSection=1`,
    {
      headers: { Authorization: `Bearer ${teacherToken}` },
    },
  );
  console.log(
    `[TEACHER GET CLASS ANALYTICS] Expected 200 (or 403 if not in school), Got ${res3.status} -> ${res3.status === 200 || res3.status === 403 ? "PASS" : "FAIL"}`,
  );

  const res4 = await fetch(`${API_BASE}/analytics/class`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  console.log(
    `[STUDENT GET CLASS ANALYTICS] Expected 403, Got ${res4.status} -> ${res4.status === 403 ? "PASS" : "FAIL"}`,
  );

  console.log("\n--- TESTS COMPLETE ---");
}

testAnalyticsApi().catch(console.error);
