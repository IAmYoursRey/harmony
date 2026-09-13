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

async function testUsersApi() {
  console.log("--- STARTING USERS / RBAC PROVISIONING TESTS ---\n");

  const res1 = await fetch(`${API_BASE}/users`, {
    headers: { Authorization: `Bearer ${devToken}` },
  });
  console.log(
    `[DEV GET USERS] Expected 200, Got ${res1.status} -> ${res1.status === 200 ? "PASS" : "FAIL"}`,
  );

  const res2 = await fetch(`${API_BASE}/users`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  console.log(
    `[STUDENT GET USERS] Expected 403, Got ${res2.status} -> ${res2.status === 403 ? "PASS" : "FAIL"}`,
  );

  const res3 = await fetch(`${API_BASE}/users`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${devToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "New Teacher",
      email: `teach_${Date.now()}@test.com`,
      password: "password",
      role: "teacher",
    }),
  });
  console.log(
    `[DEV CREATE TEACHER] Expected 201, Got ${res3.status} -> ${res3.status === 201 ? "PASS" : "FAIL"}`,
  );

  const res4 = await fetch(`${API_BASE}/users`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${studentToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "Hacker Student",
      email: `hack_${Date.now()}@test.com`,
      password: "password",
      role: "teacher",
    }),
  });
  console.log(
    `[STUDENT CREATE USER] Expected 403, Got ${res4.status} -> ${res4.status === 403 ? "PASS" : "FAIL"}`,
  );

  const res5 = await fetch(`${API_BASE}/users`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${teacherToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "New Student",
      email: `stud_${Date.now()}@test.com`,
      password: "password",
      role: "student",
    }),
  });
  console.log(
    `[TEACHER CREATE STUDENT] Expected 201, Got ${res5.status} -> ${res5.status === 201 ? "PASS" : "FAIL"}`,
  );

  const res6 = await fetch(`${API_BASE}/users`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${teacherToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "Rogue Teacher",
      email: `rogue_${Date.now()}@test.com`,
      password: "password",
      role: "teacher",
    }),
  });
  console.log(
    `[TEACHER CREATE TEACHER] Expected 403, Got ${res6.status} -> ${res6.status === 403 ? "PASS" : "FAIL"}`,
  );

  console.log("\n--- TESTS COMPLETE ---");
}

testUsersApi().catch(console.error);
