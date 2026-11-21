import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import express from "express";

const prevVercel = process.env.VERCEL;
const prevNodeEnv = process.env.NODE_ENV;

const {
  isPgQuotaOrUnavailableError,
  isPgDegraded,
  getPgHealthStatus,
  __setPgPoolForTest,
  __resetPgStateForTest,
} = await import("../apps/server/src/repositories/repository.js");

const { default: authRoutes } = await import("../apps/server/src/routes/auth.js");
const { default: profileRoutes } = await import("../apps/server/src/routes/profile.js");

async function startAuthTestServer() {
  const app = express();
  app.use(express.json());
  app.use("/api/auth", authRoutes);
  app.use("/api/profile", profileRoutes);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const addr = server.address();
  return { server, baseUrl: `http://127.0.0.1:${addr.port}` };
}

test("isPgQuotaOrUnavailableError identifies PostgreSQL 53000 quota exhaustion and transient connection errors", () => {
  const quotaErr = Object.assign(
    new Error("Your account or project has exceeded the quota. Upgrade your plan to increase limits."),
    { code: "53000" }
  );
  assert.equal(isPgQuotaOrUnavailableError(quotaErr), true);
  assert.equal(isPgQuotaOrUnavailableError({ code: "53300", message: "too many connections" }), true);
  assert.equal(isPgQuotaOrUnavailableError({ code: "ECONNREFUSED", message: "connect ECONNREFUSED" }), true);
  assert.equal(isPgQuotaOrUnavailableError({ code: "23505", message: "duplicate key value" }), false);
});

test("PG 53000 quota exhaustion triggers circuit breaker, keeps bundled/demo login + /me + /profile working, and returns 503 for permanent registration", async (t) => {
  process.env.VERCEL = "1";
  process.env.NODE_ENV = "production";

  let queryCount = 0;
  const mockQuotaPool = {
    async query() {
      queryCount += 1;
      const err = new Error(
        "Your account or project has exceeded the quota. Upgrade your plan to increase limits."
      );
      err.code = "53000";
      throw err;
    },
  };

  __resetPgStateForTest();
  __setPgPoolForTest(mockQuotaPool);

  const { server, baseUrl } = await startAuthTestServer();
  t.after(async () => {
    __resetPgStateForTest();
    if (prevVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = prevVercel;
    if (prevNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = prevNodeEnv;
    await new Promise((resolve) => server.close(resolve));
  });

  // 1. Seeded developer account in bundled database.json logs in cleanly despite PG 53000
  const devLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token: JSON.stringify({
        email: "raihanansari3345@gmail.com",
        name: "Raihan Ansari",
        sub: "usr-1789435370447",
      }),
    }),
  });
  assert.equal(devLoginRes.status, 200);
  const devLoginJson = await devLoginRes.json();
  assert.equal(devLoginJson.status, "registered");
  assert.equal(devLoginJson.storageMode, "fallback");
  assert.equal(devLoginJson.account.email, "raihanansari3345@gmail.com");
  assert.ok(devLoginJson.token);
  assert.equal(queryCount, 1, "Circuit breaker opens after first PG 53000 failure");
  assert.equal(isPgDegraded(), true);
  assert.equal(getPgHealthStatus().code, "53000");

  // 2. Demo Student login works end-to-end across /login -> /me -> /profile without 403/500 and without further PG calls
  const demoLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token: JSON.stringify({
        email: "siswa.demo@sman1ngoro.sch.id",
        name: "Demo Siswa",
        role: "student",
        isDemo: true,
      }),
    }),
  });
  assert.equal(demoLoginRes.status, 200);
  const demoLoginJson = await demoLoginRes.json();
  assert.equal(demoLoginJson.status, "registered");
  assert.equal(demoLoginJson.storageMode, "fallback");
  assert.ok(demoLoginJson.token);

  const meRes = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Authorization: `Bearer ${demoLoginJson.token}` },
  });
  assert.equal(meRes.status, 200);
  const meJson = await meRes.json();
  assert.equal(meJson.account.email, "siswa.demo@sman1ngoro.sch.id");

  const profileRes = await fetch(`${baseUrl}/api/profile`, {
    headers: { Authorization: `Bearer ${demoLoginJson.token}` },
  });
  assert.equal(profileRes.status, 200);
  const profileJson = await profileRes.json();
  assert.equal(profileJson.profile.schoolName, "SMAN 1 Ngoro");

  // 3. Unknown non-demo Google user gets honest HTTP 503 during PG quota exhaustion instead of false not_registered or 500
  const unknownGoogleRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token: JSON.stringify({
        email: "unknown.non.demo@example.com",
        name: "Unknown User",
        sub: "google-999",
      }),
    }),
  });
  assert.equal(unknownGoogleRes.status, 503);
  const unknownGoogleJson = await unknownGoogleRes.json();
  assert.equal(unknownGoogleJson.code, "DB_QUOTA_EXCEEDED");

  // 4. Unknown credential login returns HTTP 503 during PG quota exhaustion
  const unknownCredRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "missing.cred@example.com",
      password: "secret",
    }),
  });
  assert.equal(unknownCredRes.status, 503);
  const unknownCredJson = await unknownCredRes.json();
  assert.equal(unknownCredJson.code, "DB_QUOTA_EXCEEDED");

  // 5. Permanent /register refuses with HTTP 503 during VERCEL=1 PG quota outage so accounts are never silently lost
  const registerRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "New User",
      email: "new.user.quota@example.com",
      password: "password123",
      role: "student",
    }),
  });
  assert.equal(registerRes.status, 503);
  const registerJson = await registerRes.json();
  assert.equal(registerJson.code, "DB_QUOTA_EXCEEDED");

  assert.equal(queryCount, 1, "Subsequent requests must honor the 5-minute circuit breaker cooldown");
});

