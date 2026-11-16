import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

process.env.DATABASE_URL = "";
process.env.POSTGRES_URL = "";

const {
  MAX_CHAT_MEMORY,
  trimChatMemory,
  trimChatMemoryForGemini,
  detectUserLanguageTone,
  buildUserDatabaseContext,
  buildHarmonyGeoSystemPrompt,
} = await import("../apps/server/src/services/geoAiContextService.js");

test("GeoBot rolling memory strictly caps history at 6 messages and drops oldest top entries", () => {
  assert.equal(MAX_CHAT_MEMORY, 6);

  const eightMessages = [
    { role: "user", parts: [{ text: "msg-1" }] },
    { role: "model", parts: [{ text: "msg-2" }] },
    { role: "user", parts: [{ text: "msg-3" }] },
    { role: "model", parts: [{ text: "msg-4" }] },
    { role: "user", parts: [{ text: "msg-5" }] },
    { role: "model", parts: [{ text: "msg-6" }] },
    { role: "user", parts: [{ text: "msg-7" }] },
    { role: "model", parts: [{ text: "msg-8" }] },
  ];

  const trimmedUi = trimChatMemory(eightMessages);
  assert.equal(trimmedUi.length, 6);
  assert.equal(trimmedUi[0].parts[0].text, "msg-3");
  assert.equal(trimmedUi[5].parts[0].text, "msg-8");

  const sevenMessagesOdd = eightMessages.slice(0, 7);
  const geminiReady = trimChatMemoryForGemini(sevenMessagesOdd);
  assert.ok(geminiReady.length <= 6);
  assert.equal(geminiReady[0].role, "user");
  assert.equal(geminiReady[geminiReady.length - 1].parts[0].text, "msg-7");
});

test("Language and dialect detector recognizes Indonesian, Javanese Ngoko/Arekan, Krama Alus, and English", () => {
  assert.equal(detectUserLanguageTone("Piye carane nylametne awak pas lindu nang kelas rek?"), "jv_ngoko");
  assert.equal(detectUserLanguageTone("Nggih monggo nyuwun sewu, kados pundi rutenipun?"), "jv_krama");
  assert.equal(detectUserLanguageTone("Cek nilai kuis dan simulasi saya sekarang ya"), "id_casual");
  assert.equal(detectUserLanguageTone("Mohon laporan rekapitulasi evaluasi bapak ibu guru"), "id_formal");
  assert.equal(detectUserLanguageTone("Please explain the evacuation route at school"), "en");
});

test("buildUserDatabaseContext scopes database records strictly to logged-in user and strips secrets", async () => {
  const mockDb = {
    accounts: [
      {
        id: "usr-a",
        name: "Budi Santoso",
        email: "budi@sman1ngoro.sch.id",
        role: "student",
        schoolId: "sch-ngoro",
        passwordHash: "$2a$10$SECRET_HASH_SHOULD_NEVER_LEAK",
      },
      {
        id: "usr-b",
        name: "Siti Rahma",
        email: "siti@sman1ngoro.sch.id",
        role: "student",
        schoolId: "sch-ngoro",
        passwordHash: "$2a$10$OTHER_SECRET",
      },
    ],
    profiles: [
      {
        userId: "usr-a",
        schoolId: "sch-ngoro",
        classId: "cls-1",
        level: 3,
        xp: 420,
        totalPoints: 890,
        streak: 5,
        topicScores: { "Gempa Bumi": 88 },
      },
    ],
    schools: [
      {
        id: "sch-ngoro",
        name: "SMAN 1 Ngoro",
        regency: "Kabupaten Mojokerto",
        province: "Jawa Timur",
        lat: -7.537,
        lng: 112.621,
        riskScore: 76,
      },
    ],
    classes: [{ id: "cls-1", schoolId: "sch-ngoro", name: "XI-IPA-1", code: "NGORO1", studentIds: ["usr-a"] }],
    quizHistories: [
      { userId: "usr-a", topicId: "Gempa Bumi", score: 92 },
      { userId: "usr-b", topicId: "Tsunami", score: 15 },
    ],
    dtResults: [
      { userId: "usr-a", schoolId: "sch-ngoro", scenarioName: "Gempa Kelas 12", score: 940, grade: "A", finishTimeMs: 28000 },
      { userId: "usr-b", schoolId: "sch-ngoro", scenarioName: "Rahasia User B", score: 111, grade: "D" },
    ],
    gridMaps: { m1: { id: "m1", schoolId: "sch-ngoro", name: "Denah Lantai 1 SMAN 1 Ngoro", status: "published" } },
    dtRooms: { rm1: { id: "rm1", schoolId: "sch-ngoro", hostId: "usr-a" } },
    surveys: [{ userId: "usr-a", schoolId: "sch-ngoro", postTestScore: 85 }],
    events: [{ id: "ev1", title: "Simulasi SPAB SMAN 1 Ngoro" }],
    schoolDisasterAnalysis: {},
  };

  const ctx = await buildUserDatabaseContext({ id: "usr-a", role: "student" }, mockDb);

  assert.equal(ctx.authenticated, true);
  assert.equal(ctx.school.name, "SMAN 1 Ngoro");
  assert.match(ctx.summaryText, /Budi Santoso/);
  assert.match(ctx.summaryText, /Gempa Bumi: 92\/100/);
  assert.match(ctx.summaryText, /Gempa Kelas 12 skor=940/);
  assert.match(ctx.summaryText, /XI-IPA-1/);
  assert.doesNotMatch(ctx.summaryText, /SECRET_HASH/);
  assert.doesNotMatch(ctx.summaryText, /Rahasia User B/);
  assert.doesNotMatch(ctx.summaryText, /Tsunami: 15\/100/);

  const guestCtx = await buildUserDatabaseContext(null);
  assert.equal(guestCtx.authenticated, false);
  assert.match(guestCtx.summaryText, /SMAN 1 Ngoro/);
});

test("buildHarmonyGeoSystemPrompt embeds Harmony SPAB narrative, Javanese calibration, and clarifying guidance", () => {
  const prompt = buildHarmonyGeoSystemPrompt({
    userContext: { summaryText: "Akun: Raihan | Peran: student | Sekolah: SMAN 1 Ngoro" },
    latestUserText: "Piye carane mlayu nang lapangan upacara pas lindu rek?",
  });

  assert.match(prompt, /SMAN 1 Ngoro/);
  assert.match(prompt, /Lapangan Upacara/);
  assert.match(prompt, /jv_ngoko/);
  assert.match(prompt, /maksimal 6 pesan/);
  assert.match(prompt, /pertanyaan klarifikasi/);
});

test("Frontend GeoBot & Navigation files enforce 6-message limit and beginner-friendly menu labels", () => {
  const geminiCode = fs.readFileSync(
    path.resolve("apps/web/src/services/geminiService.ts"),
    "utf8",
  );
  const aiViewCode = fs.readFileSync(
    path.resolve("apps/web/src/components/dashboard/views/learning/AILearningView.tsx"),
    "utf8",
  );
  const copilotCode = fs.readFileSync(
    path.resolve("apps/web/src/components/dashboard/FloatingAICopilot.tsx"),
    "utf8",
  );
  const navCode = fs.readFileSync(
    path.resolve("apps/web/src/components/dashboard/nav.ts"),
    "utf8",
  );

  assert.match(geminiCode, /MAX_CHAT_MEMORY\s*=\s*6/);
  assert.match(geminiCode, /trimRollingChatMemory/);
  assert.match(aiViewCode, /Clear Memory/);
  assert.match(copilotCode, /trimRollingChatMemory/);
  assert.match(navCode, /filterVisibleNavItems/);
  assert.match(navCode, /Tanya GeoBot/);
  assert.match(navCode, /Latihan Soal/);
  assert.match(navCode, /Peta Utama/);
});

