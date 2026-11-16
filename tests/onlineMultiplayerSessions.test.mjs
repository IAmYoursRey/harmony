import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import express from "express";
import jwt from "jsonwebtoken";

// Keep unit tests strictly isolated in memory instead of touching live cloud Postgres
process.env.DATABASE_URL = "";
process.env.POSTGRES_URL = "";

const { default: sessionsRouter, sortCompetitiveLeaderboard } = await import(
  "../apps/server/src/routes/sessions.js"
);

const JWT_SECRET =
  process.env.JWT_SECRET || "default_jwt_secret_for_development";

function makeToken(user) {
  return jwt.sign(user, JWT_SECRET, { expiresIn: "1h" });
}

test("Competitive leaderboard ranks finished racers by fastest finishTimeMs, then alive HP", () => {
  const ranked = sortCompetitiveLeaderboard([
    {
      studentId: "p-slow",
      displayName: "Budi",
      finishedAt: "2026-11-16T00:01:00Z",
      finishTimeMs: 49200,
      score: 91,
      liveState: { alive: true, hp: 92 },
    },
    {
      studentId: "p-running",
      displayName: "Citra",
      finishedAt: null,
      finishTimeMs: null,
      score: 0,
      liveState: { alive: true, hp: 85 },
    },
    {
      studentId: "p-fast",
      displayName: "Andi",
      finishedAt: "2026-11-16T00:00:40Z",
      finishTimeMs: 36400,
      score: 94,
      liveState: { alive: true, hp: 96 },
    },
    {
      studentId: "p-fallen",
      displayName: "Deni",
      finishedAt: null,
      finishTimeMs: null,
      score: 18,
      liveState: { alive: false, hp: 0 },
    },
  ]);

  assert.deepEqual(
    ranked.map((r) => r.studentId),
    ["p-fast", "p-slow", "p-running", "p-fallen"],
  );
});

test("Any authenticated student can create, join, start, sync, rank, and restart an online room", async () => {
  const app = express();
  app.use(express.json());
  app.use("/api/sessions", sessionsRouter);

  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}/api/sessions`;

  const hostToken = makeToken({
    id: "st-host-1",
    role: "student",
    name: "Siswa Host",
  });
  const guestToken = makeToken({
    id: "st-guest-2",
    role: "student",
    name: "Siswa Tamu",
  });

  try {
    // 1. Host creates competitive room
    const createRes = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${hostToken}`,
      },
      body: JSON.stringify({
        schoolId: "ffdcdf34-fc99-4209-913e-5a6042e957ad",
        mapId: "map-sman1-denah",
        scenarioId: "scenario-sman1-gempa",
        settings: { mode: "race", difficulty: "sulit", roomName: "Balap Gempa" },
      }),
    });
    assert.equal(createRes.status, 200);
    const created = await createRes.json();
    assert.match(created.code, /^\d{6}$/);
    assert.equal(created.status, "LOBBY");

    // 2. Public room listing shows the newly created room
    const listRes = await fetch(`${baseUrl}/public?mapId=map-sman1-denah`, {
      headers: { Authorization: `Bearer ${guestToken}` },
    });
    assert.equal(listRes.status, 200);
    const listJson = await listRes.json();
    assert.ok(listJson.data.some((r) => r.id === created.id && r.code === created.code));

    // 3. Guest joins via 6-digit code & toggles avatar + ready
    const lookupRes = await fetch(`${baseUrl}/${created.code}`, {
      headers: { Authorization: `Bearer ${guestToken}` },
    });
    assert.equal(lookupRes.status, 200);
    const joinRes = await fetch(`${baseUrl}/${created.id}/join`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${guestToken}`,
      },
      body: JSON.stringify({
        displayName: "Siswa Tamu",
        avatarStyle: "boy",
        avatarColor: "#ec4899",
      }),
    });
    assert.equal(joinRes.status, 200);

    // 4. Host starts room
    const startRes = await fetch(`${baseUrl}/${created.id}/start`, {
      method: "POST",
      headers: { Authorization: `Bearer ${hostToken}` },
    });
    assert.equal(startRes.status, 200);

    // 5. Both players sync positions & guest finishes first
    await fetch(`${baseUrl}/${created.id}/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${hostToken}`,
      },
      body: JSON.stringify({
        x: 320,
        y: 640,
        floorId: "floor-sman1-1",
        direction: "right",
        hp: 88,
        alive: true,
        moving: true,
      }),
    });

    const guestSyncRes = await fetch(`${baseUrl}/${created.id}/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${guestToken}`,
      },
      body: JSON.stringify({
        x: 910,
        y: 120,
        floorId: "floor-sman1-1",
        direction: "up",
        hp: 94,
        alive: true,
        finished: true,
        finishTimeMs: 31800,
        score: 96,
        grade: "S",
      }),
    });
    assert.equal(guestSyncRes.status, 200);
    const syncJson = await guestSyncRes.json();
    assert.equal(syncJson.sessionStatus, "RUNNING");
    assert.equal(syncJson.players.length, 2);
    assert.equal(syncJson.leaderboard[0].studentId, "st-guest-2");
    assert.equal(syncJson.leaderboard[0].grade, "S");

    // 6. Host restarts room for rematch
    const restartRes = await fetch(`${baseUrl}/${created.id}/restart`, {
      method: "POST",
      headers: { Authorization: `Bearer ${hostToken}` },
    });
    assert.equal(restartRes.status, 200);

    // 7. Enforce unique username: another user trying to join with "Siswa Tamu" or "Siswa Host" gets rejected
    const cloneToken = makeToken({
      id: "st-clone-3",
      role: "student",
      name: "Siswa Tamu",
    });
    const dupJoinRes = await fetch(`${baseUrl}/${created.id}/join`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cloneToken}`,
      },
      body: JSON.stringify({ displayName: "Siswa Tamu" }),
    });
    assert.equal(dupJoinRes.status, 409);
    const dupJson = await dupJoinRes.json();
    assert.equal(dupJson.error, "DUPLICATE_NAME");

    // Joining with a unique name succeeds
    const okJoinRes = await fetch(`${baseUrl}/${created.id}/join`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cloneToken}`,
      },
      body: JSON.stringify({ displayName: "Siswa Tamu 2" }),
    });
    assert.equal(okJoinRes.status, 200);

    // Trying to rename to existing player's name via ready update gets 409
    const dupRenameRes = await fetch(`${baseUrl}/${created.id}/ready`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cloneToken}`,
      },
      body: JSON.stringify({ displayName: "Siswa Tamu" }),
    });
    assert.equal(dupRenameRes.status, 409);
  } finally {
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
  }
});

test("Frontend online multiplayer components are wired cleanly", () => {
  const workspaceSrc = fs.readFileSync(
    path.resolve("apps/web/src/components/dashboard/views/spatial/digital-twin/Phase1Workspace.tsx"),
    "utf8",
  );
  const runtimeSrc = fs.readFileSync(
    path.resolve("apps/web/src/components/dashboard/views/spatial/digital-twin/Phase3Runtime.tsx"),
    "utf8",
  );
  const lobbySrc = fs.readFileSync(
    path.resolve("apps/web/src/components/dashboard/views/sessions/StudentSessionLobby.tsx"),
    "utf8",
  );

  assert.ok(workspaceSrc.includes("OnlineRoomModal"));
  assert.ok(runtimeSrc.includes("/api/sessions/${sessionId}/sync"));
  assert.ok(lobbySrc.includes("autoStart={true}"));
});
