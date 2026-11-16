import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import express from "express";
import jwt from "jsonwebtoken";

process.env.DATABASE_URL = "";
process.env.POSTGRES_URL = "";

const { default: sessionsRouter } = await import(
  "../apps/server/src/routes/sessions.js"
);

const JWT_SECRET =
  process.env.JWT_SECRET || "default_jwt_secret_for_development";

function makeToken(user) {
  return jwt.sign(user, JWT_SECRET, { expiresIn: "1h" });
}

test("Multiplayer Server: Rejects duplicate usernames within room & filters empty rooms", async () => {
  const app = express();
  app.use(express.json());
  app.use("/api/sessions", sessionsRouter);

  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}/api/sessions`;

  const hostToken = makeToken({
    id: "user-host-101",
    role: "student",
    name: "Raihan",
  });
  const guest1Token = makeToken({
    id: "user-guest-102",
    role: "student",
    name: "Aji",
  });
  const guest2Token = makeToken({
    id: "user-guest-103",
    role: "student",
    name: "Pemain",
  });

  try {
    // 1. Host creates room
    const createRes = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${hostToken}`,
      },
      body: JSON.stringify({
        schoolId: "test-school",
        mapId: "map-sman1-denah",
        scenarioId: "scenario-sman1-gempa",
        displayName: "Raihan",
        settings: { mode: "race", difficulty: "sedang", roomName: "Room Seru" },
      }),
    });
    assert.equal(createRes.status, 200);
    const room = await createRes.json();

    // 2. Guest 1 joins with "Aji" -> SUCCESS
    const g1Res = await fetch(`${baseUrl}/${room.id}/join`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${guest1Token}`,
      },
      body: JSON.stringify({ displayName: "Aji" }),
    });
    assert.equal(g1Res.status, 200);

    // 3. Guest 2 tries to join with "Aji" (case-insensitive duplicate) -> REJECTED 409
    const dupRes = await fetch(`${baseUrl}/${room.id}/join`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${guest2Token}`,
      },
      body: JSON.stringify({ displayName: "  aji  " }),
    });
    assert.equal(dupRes.status, 409);
    const dupJson = await dupRes.json();
    assert.equal(dupJson.error, "DUPLICATE_NAME");
    assert.ok(dupJson.message.includes("sudah dipakai"));

    // 4. Guest 2 tries to join with "Raihan" (host's name duplicate) -> REJECTED 409
    const dupHostRes = await fetch(`${baseUrl}/${room.id}/join`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${guest2Token}`,
      },
      body: JSON.stringify({ displayName: "RAIHAN" }),
    });
    assert.equal(dupHostRes.status, 409);

    // 5. Guest 2 joins with unique name "Aji (2)" -> SUCCESS
    const okRes = await fetch(`${baseUrl}/${room.id}/join`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${guest2Token}`,
      },
      body: JSON.stringify({ displayName: "Aji (2)" }),
    });
    assert.equal(okRes.status, 200);

    // 6. Guest 2 tries to rename themselves to "Raihan" via /ready -> REJECTED 409
    const renameDupRes = await fetch(`${baseUrl}/${room.id}/ready`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${guest2Token}`,
      },
      body: JSON.stringify({ displayName: "Raihan" }),
    });
    assert.equal(renameDupRes.status, 409);

    // 7. Verify participants list
    const partsRes = await fetch(`${baseUrl}/${room.id}/participants`, {
      headers: { Authorization: `Bearer ${hostToken}` },
    });
    const partsJson = await partsRes.json();
    assert.equal(partsJson.participants.length, 3);
    const names = partsJson.participants.map((p) => p.displayName);
    assert.deepEqual(new Set(names).size, 3, "All player names in room must be unique");

    // 8. When host leaves, room status becomes ENDED and is excluded from active public list
    const leaveRes = await fetch(`${baseUrl}/${room.id}/leave`, {
      method: "POST",
      headers: { Authorization: `Bearer ${hostToken}` },
    });
    assert.equal(leaveRes.status, 200);

    const publicRes = await fetch(`${baseUrl}/public`, {
      headers: { Authorization: `Bearer ${guest1Token}` },
    });
    const publicJson = await publicRes.json();
    assert.ok(
      !publicJson.data.some((r) => r.id === room.id),
      "Ended room must not appear in public listing",
    );
  } finally {
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
  }
});

test("Frontend: Ergonomic controls, off-screen radar, and countdown are cleanly configured", () => {
  const runtimeSrc = fs.readFileSync(
    path.resolve(
      "apps/web/src/components/dashboard/views/spatial/digital-twin/Phase3Runtime.tsx",
    ),
    "utf8",
  );
  const engineSrc = fs.readFileSync(
    path.resolve(
      "apps/web/src/components/dashboard/views/spatial/digital-twin/Phase3Engine.ts",
    ),
    "utf8",
  );
  const lobbySrc = fs.readFileSync(
    path.resolve(
      "apps/web/src/components/dashboard/views/sessions/StudentSessionLobby.tsx",
    ),
    "utf8",
  );
  const joinSrc = fs.readFileSync(
    path.resolve(
      "apps/web/src/components/dashboard/views/sessions/StudentSessionJoin.tsx",
    ),
    "utf8",
  );

  // Ergonomic controls clearance: bottom and side margins are elevated (>2.5rem / >1.75rem safe area)
  assert.ok(
    runtimeSrc.includes("bottom-[max(2.5rem,calc(env(safe-area-inset-bottom)+1.5rem))]"),
    "Joystick & action buttons must have elevated safe bottom clearance",
  );
  assert.ok(
    runtimeSrc.includes("left-[max(1.75rem,calc(env(safe-area-inset-left)+1rem))]"),
    "Joystick must have comfortable safe left clearance",
  );
  assert.ok(
    runtimeSrc.includes("right-[max(1.75rem,calc(env(safe-area-inset-right)+1rem))]"),
    "Action deck must have comfortable safe right clearance",
  );

  // Tactile buttons
  assert.ok(runtimeSrc.includes("navigator.vibrate"), "Buttons must support tactile haptic vibration");
  assert.ok(runtimeSrc.includes("w-36 h-36 sm:w-44 sm:h-44"), "Joystick must have large accessible outer ring");
  assert.ok(runtimeSrc.includes("w-20 h-20 sm:w-24 sm:h-24"), "AKSI button must be large and thumb-friendly");

  // Multiplayer waiting & countdown
  assert.ok(runtimeSrc.includes("Menunggu Host Memulai Simulasi"), "Runtime must gate on waiting for host");
  assert.ok(lobbySrc.includes("Bersiap! Simulasi Dimulai Dalam"), "Lobby must feature 3-2-1 countdown overlay");
  assert.ok(joinSrc.includes("harmony_player_name"), "Join screen must support customized player name");

  // Phase3Engine: exponential lerp smoothing and off-screen radar
  assert.ok(engineSrc.includes("Math.exp(-18 * dt)"), "Engine must use frame-rate independent exponential lerp");
  assert.ok(engineSrc.includes("isWaitingForHost"), "Engine must maintain isWaitingForHost gate");
  assert.ok(engineSrc.includes("Off-screen indicator radar"), "Engine must render offscreen radar indicators for teammates");
});
