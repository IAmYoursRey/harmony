import fetch from "node-fetch";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), "../.env") });

const API_BASE = "http://localhost:3001/api";
let devToken, teacherToken, studentToken;
let teacherId, studentId, schoolId, roomId, simulationId;

const log = (msg) => console.log(`[E2E] ${msg}`);
const assert = (condition, msg) => {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ ${msg}`);
};

async function post(endpoint, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function get(endpoint, token) {
  const headers = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${endpoint}`, { headers });
  const data = await res.json();
  return { status: res.status, data };
}

async function runE2E() {
  log("Starting End-to-End Verification...");

  log("1. Register/Login Dev...");
  const devRes = await post("/auth/register", {
    name: "Dev QA",
    email: `dev_${Date.now()}@qa.com`,
    password: "password123",
    role: "dev",
  });
  assert(
    devRes.status === 201 || devRes.status === 200,
    "Dev Login/Register successful",
  );
  devToken = devRes.data.token;
  schoolId = "qa-school-" + Date.now();

  log("2. Dev Creates Teacher...");
  const tRes = await post(
    "/users",
    {
      name: "Teacher QA",
      email: `teacher_${Date.now()}@qa.com`,
      password: "password123",
      role: "teacher",
      schoolId,
    },
    devToken,
  );
  assert(
    tRes.status === 201,
    "Dev created Teacher successfully without losing session",
  );
  teacherId = tRes.data.account.id;

  log("3. Teacher Login...");
  const tLogin = await post("/auth/login", {
    email: tRes.data.account.email,
    password: "password123",
  });
  assert(tLogin.status === 200, "Teacher Login successful");
  teacherToken = tLogin.data.token;

  log("4. Teacher Creates Student & Class...");
  const sRes = await post(
    "/users",
    {
      name: "Student QA",
      email: `student_${Date.now()}@qa.com`,
      password: "password123",
      role: "student",
      grade: "X",
      classSection: "IPA QA",
    },
    teacherToken,
  );
  assert(
    sRes.status === 201,
    "Teacher created Student successfully in their class",
  );
  studentId = sRes.data.account.id;

  log("5. Student Login...");
  const sLogin = await post("/auth/login", {
    email: sRes.data.account.email,
    password: "password123",
  });
  assert(sLogin.status === 200, "Student Login successful");
  studentToken = sLogin.data.token;

  log("6. Teacher Creates Base Map...");
  const mapRes = await post(
    "/digital-twin/maps",
    {
      schoolId,
      name: "QA Map",
      gridLayout: { width: 10, height: 10, cells: [] },
    },
    teacherToken,
  );
  if (mapRes.status !== 201) console.error("Map Creation Failed:", mapRes);
  assert(mapRes.status === 201, "Teacher created Base Map");
  const mapId = mapRes.data.data ? mapRes.data.data.id : mapRes.data.id;
  if (!mapId) console.log("MAP RES:", mapRes.data);

  log("7. Teacher Creates Simulation Scenario...");
  const simRes = await post(
    "/digital-twin/simulations",
    {
      schoolId,
      mapId,
      name: "Fire Drill QA",
      disasterType: "fire",
      hazards: [{ type: "fire", x: 2, y: 2 }],
      obstacles: [{ type: "debris", x: 3, y: 3 }],
      safeRoutes: [{ x: 5, y: 5 }],
    },
    teacherToken,
  );
  if (simRes.status !== 201)
    console.error("Simulation Creation Failed:", simRes);
  assert(
    simRes.status === 201,
    "Teacher created Scenario successfully attached to Base Map",
  );
  simulationId = simRes.data.simulation
    ? simRes.data.simulation.id
    : simRes.data.data.id;

  log("8. Teacher Creates Room (Session)...");
  const roomRes = await post(
    "/digital-twin/rooms",
    {
      schoolId,
      name: "QA Room",
      mapId,
      simulationId,
      targetClass: "IPA QA",
    },
    teacherToken,
  );
  if (roomRes.status !== 201) console.error("Room Creation Failed:", roomRes);
  assert(roomRes.status === 201, "Teacher created Room");
  roomId = roomRes.data.room ? roomRes.data.room.id : roomRes.data.data.id;

  log("9. Teacher Starts Room...");
  const startRes = await post(
    `/digital-twin/rooms/${roomId}/start`,
    {},
    teacherToken,
  );
  if (startRes.status !== 200) console.error("Room Start Failed:", startRes);
  assert(startRes.status === 200, "Teacher started the room successfully");

  log("10. Student Plays & Submits Result...");
  const resultRes = await post(
    `/digital-twin/rooms/${roomId}/result`,
    {
      simulationId,
      hpRemaining: 85,
      outcome: "COMPLETED",
      hazardsEncountered: ["fire"],
      completionTimeSeconds: 45,
    },
    studentToken,
  );
  if (resultRes.status !== 201)
    console.error("Result Submission Failed:", resultRes);
  assert(
    resultRes.status === 201,
    "Student submitted simulation result successfully",
  );

  log("11. Verify Teacher Analytics...");
  const tAnalytics = await get(
    "/analytics/class?grade=X&classSection=IPA QA",
    teacherToken,
  );
  assert(tAnalytics.status === 200, "Teacher fetched class analytics");
  if (!tAnalytics.data.data?.students)
    console.log("T_ANALYTICS:", tAnalytics.data);
  const studentStat = (tAnalytics.data.data?.students || []).find(
    (s) => s.id === studentId,
  );
  assert(
    studentStat &&
      studentStat.averageScore === 85 &&
      studentStat.attempts === 1,
    "Teacher analytics accurately reflects Student result",
  );

  log("12. Verify Dev Analytics...");
  const dAnalytics = await get("/analytics/system", devToken);
  assert(dAnalytics.status === 200, "Dev fetched system analytics");
  if (dAnalytics.data.data?.totalAttempts === undefined)
    console.log("D_ANALYTICS:", dAnalytics.data);
  assert(
    dAnalytics.data.data?.totalAttempts > 0,
    "Dev analytics reflects aggregate change",
  );

  log("13. Run Security Boundary Tests...");
  const sAnalytics = await get("/analytics/class", studentToken);
  assert(sAnalytics.status === 403, "Student DENIED access to Class Analytics");
  const stDevAnalytics = await get("/analytics/system", teacherToken);
  assert(
    stDevAnalytics.status === 403,
    "Teacher DENIED access to System Analytics",
  );

  log("\n🎉 ALL END-TO-END INTEGRATION TESTS PASSED SUCCESSFULLY! 🎉");
}

runE2E().catch((err) => {
  console.error("E2E TEST FAILED:", err);
  process.exit(1);
});
