import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: [path.join(__dirname, "../.env.local"), path.join(__dirname, "../.env")] });

import authRoutes from "./routes/auth.js";
import profileRoutes from "./routes/profile.js";
import aiRoutes from "./routes/ai.js";
import digitalTwinRoutes from "./routes/digitalTwin.js";
import schoolRoutes from "./routes/schools.js";
import surveyRoutes from "./routes/surveys.js";
import usersRoutes from "./routes/users.js";
import analyticsRoutes from "./routes/analytics.js";
import classesRoutes from "./routes/classes.js";
import sessionsRoutes from "./routes/sessions.js";
import mountainsRoutes from "./routes/mountains.js";
import quizHistoryRoutes from "./routes/quizHistory.js";
import spatialRoutes from "./routes/spatialRoutes.js";
import eventsRoutes from "./routes/events.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      const allowed = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://geo-sense-iota.vercel.app",
        "https://harmony-nine-tau.vercel.app",
      ];
      if (
        allowed.includes(origin) ||
        origin.match(
          /^http:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/,
        )
      ) {
        return callback(null, true);
      }
      callback(null, false);
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "10mb" }));

import "express-async-errors";

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/digital-twin", digitalTwinRoutes);
app.use("/api/schools", schoolRoutes);
app.use("/api/surveys", surveyRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/classes", classesRoutes);
app.use("/api/sessions", sessionsRoutes);
app.use("/api/mountains", mountainsRoutes);
app.use("/api/quiz-history", quizHistoryRoutes);
app.use("/api/spatial", spatialRoutes);
app.use("/api/events", eventsRoutes);

app.get("/api/debug", async (req, res) => {
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  const hasDb = !!dbUrl;
  let dbResult = "skipped";
  if (hasDb) {
    try {
      const { Pool } = await import("pg");
      const pool = new Pool({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 3000,
        queryTimeout: 3000,
      });
      const start = Date.now();
      const result = await Promise.race([
        pool.query("SELECT 1 as val"),
        new Promise((_, r) => setTimeout(() => r(new Error("timeout")), 4000)),
      ]);
      dbResult = `success in ${Date.now() - start}ms`;
    } catch (e) {
      dbResult = `error: ${e.message}`;
    }
  }
  res.json({
    ok: true,
    vercel: process.env.VERCEL,
    node_env: process.env.NODE_ENV,
    hasDb,
    dbResult,
    hasPostgresUrl: !!process.env.POSTGRES_URL,
  });
});

app.use((err, req, res, next) => {
  console.error("[SERVER ERROR]", err.message);
  res.status(503).json({
    error:
      "Service temporarily unavailable. Please verify backend configurations.",
  });
});

export default app;

import http from "http";
import { initSocket } from "./sockets/socket.js";

if (process.env.NODE_ENV !== "production") {
  const server = http.createServer(app);

  initSocket(server);

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Harmony Backend listening at http://0.0.0.0:${PORT}`);
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`\n[ERROR] Port ${PORT} is already in use.`);
      console.error(`Please kill the process holding the port manually.\n`);
      process.exit(1);
    } else {
      throw err;
    }
  });

  const shutdown = (signal) => {
    console.log(`\n[${signal}] Received, shutting down gracefully...`);
    server.close(() => {
      console.log("HTTP server closed.");
      process.exit(0);
    });
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  process.once("SIGUSR2", () => {
    server.close(() => {
      process.kill(process.pid, "SIGUSR2");
    });
  });
}
