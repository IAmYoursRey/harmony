import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  readDB,
  saveAccount,
  saveProfile,
  getAccountById,
  getAccountByEmail,
  getProfileByUserId,
  isPgDegraded,
  isPgQuotaOrUnavailableError,
} from "../repositories/repository.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import dotenv from "dotenv";
import { OAuth2Client } from "google-auth-library";

dotenv.config({ path: [".env.local", ".env"], quiet: true });
const router = express.Router();
const isProductionRuntime = () =>
  process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
const SECRET = process.env.JWT_SECRET || "default_jwt_secret_for_development";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID";
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);
if (!process.env.JWT_SECRET) {
  console.warn(
    "[WARNING] JWT_SECRET is not defined in environment variables. Using fallback.",
  );
}
const SMAN1_NGORO_META = {
  schoolId: "ffdcdf34-fc99-4209-913e-5a6042e957ad",
  schoolName: "SMAN 1 Ngoro",
  province: "Jawa Timur",
  regency: "Kabupaten Mojokerto",
};

function isFixedDemoEmail(email) {
  const lower = String(email || "").toLowerCase();
  return lower === "raihanansari3345@gmail.com" || lower.endsWith("@sman1ngoro.sch.id");
}

const DB_QUOTA_LOGIN_MSG =
  "Database utama (PostgreSQL) sedang melampaui kuota (kode 53000). Akun non-demo belum dapat diverifikasi; gunakan tombol Akun Demo atau perbarui kuota/koneksi database di Vercel.";
const DB_QUOTA_REGISTER_MSG =
  "Kuota database PostgreSQL penuh (kode 53000), pendaftaran akun permanen sementara tidak tersedia. Silakan gunakan Akun Demo atau perbarui koneksi database di Vercel.";
const DB_FALLBACK_NOTICE =
  "Database PostgreSQL sedang melampaui kuota; sesi berjalan dalam mode cadangan sementara.";

function buildFallbackMeta() {
  if (!isPgDegraded()) return {};
  return {
    storageMode: "fallback",
    dbNotice: DB_FALLBACK_NOTICE,
  };
}

router.post("/login", async (req, res) => {
  try {
    const { token, role, email: credEmail, password } = req.body || {};

    if (credEmail && password) {
      const account = await getAccountByEmail(credEmail);
      if (!account) {
        if (isPgDegraded()) {
          return res.status(503).json({
            error: DB_QUOTA_LOGIN_MSG,
            code: "DB_QUOTA_EXCEEDED",
          });
        }
        return res.status(401).json({ error: "Akun tidak ditemukan atau password salah" });
      }

      if (account.passwordHash) {
        const matches = await bcrypt.compare(password, account.passwordHash);
        if (!matches) {
          return res.status(401).json({ error: "Akun tidak ditemukan atau password salah" });
        }
      }

      const jwtToken = jwt.sign(
        {
          id: account.id,
          email: account.email,
          role: account.role,
          name: account.name,
          schoolId: account.schoolId,
          grade: account.grade,
          isDemo: Boolean(account.isDemo),
        },
        SECRET,
        { expiresIn: "24h" }
      );
      const { passwordHash: _, ...safeAccount } = account;
      return res.json({
        status: "registered",
        token: jwtToken,
        account: safeAccount,
        ...buildFallbackMeta(),
      });
    }

    if (!token) {
      return res.status(400).json({ error: "Kredensial email/password atau Google token diperlukan" });
    }

    // Verify Google token
    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: token,
        audience: GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch (err) {
      // Fallback for missing client ID or dev mode, skip verification if token is a JSON string (for testing)
      if (token.startsWith("{")) {
         try {
             payload = JSON.parse(token);
         } catch(e) {}
      }
      if (!payload) return res.status(401).json({ error: "Invalid Google token" });
    }

    const { email, name, sub: googleId, picture } = payload;
    if (!email) return res.status(400).json({ error: "Google token does not contain email" });

    let account = await getAccountByEmail(email);

    const isDemoAccount =
      isFixedDemoEmail(email) || Boolean(payload.isDemo);

    if (!account && isDemoAccount) {
      const demoId = payload.sub || `usr-demo-${Date.now()}`;
      const demoRole =
        payload.role ||
        (email.toLowerCase().includes("siti") ||
        email.toLowerCase().includes("teacher") ||
        email.toLowerCase().includes("guru")
          ? "teacher"
          : email.toLowerCase() === "raihanansari3345@gmail.com" ||
            email.toLowerCase().includes("developer") ||
            email.toLowerCase().includes("dev")
          ? "developer"
          : "student");

      account = {
        id: demoId,
        email: email.toLowerCase(),
        name:
          name ||
          (demoRole === "teacher"
            ? "Siti Nurhaliza, S.Pd."
            : demoRole === "developer"
            ? "My Princessa Z. M."
            : "Aditya Pratama"),
        role: demoRole,
        schoolId: SMAN1_NGORO_META.schoolId,
        isDemo: true,
        googleId,
        picture: picture || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + encodeURIComponent(email),
        createdAt: new Date().toISOString(),
      };
      await saveAccount(account);

      const existingProfile = await getProfileByUserId(account.id);
      if (!existingProfile) {
        const profile = {
          userId: account.id,
          name: account.name,
          role: account.role,
          gender: "other",
          grade: account.role === "teacher" || account.role === "developer" ? "-" : "X",
          section: "1",
          classSection: "1",
          ...SMAN1_NGORO_META,
          xp: 1250,
          level: 2,
          achievements: [],
          joinedAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
        };
        await saveProfile(profile);
      }
    }

    if (!account) {
      if (isPgDegraded()) {
        return res.status(503).json({
          error: DB_QUOTA_LOGIN_MSG,
          code: "DB_QUOTA_EXCEEDED",
        });
      }
      return res.status(200).json({
        status: "not_registered",
        email,
        name,
        picture,
        googleId,
      });
    }

    if (isDemoAccount) {
      const profile = await getProfileByUserId(account.id);
      if (!profile) {
        await saveProfile({
          userId: account.id,
          name: account.name,
          role: account.role,
          gender: "other",
          grade: account.role === "teacher" || account.role === "developer" ? "-" : "X",
          section: "1",
          classSection: "1",
          ...SMAN1_NGORO_META,
          xp: 1250,
          level: 2,
          achievements: [],
          joinedAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
        });
      } else if (profile.schoolId !== SMAN1_NGORO_META.schoolId || profile.schoolName !== SMAN1_NGORO_META.schoolName) {
        Object.assign(profile, SMAN1_NGORO_META, { lastUpdated: new Date().toISOString() });
        await saveProfile(profile);
      }
    }

    const jwtToken = jwt.sign(
      {
        id: account.id,
        email: account.email,
        role: account.role,
        name: account.name,
        schoolId: account.schoolId || (isDemoAccount ? SMAN1_NGORO_META.schoolId : undefined),
        grade: account.grade,
        isDemo: Boolean(isDemoAccount || account.isDemo),
      },
      SECRET,
      { expiresIn: "24h" }
    );
    const { passwordHash: _, ...safeAccount } = account;
    res.json({
      status: "registered",
      token: jwtToken,
      account: safeAccount,
      ...buildFallbackMeta(),
    });
  } catch (err) {
    console.error("[AUTH ERROR]", err);
    if (isPgQuotaOrUnavailableError(err)) {
      return res.status(503).json({
        error: DB_QUOTA_LOGIN_MSG,
        code: "DB_QUOTA_EXCEEDED",
      });
    }
    res.status(500).json({ error: "Server error during login" });
  }
});

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role, schoolId, grade, classSection } = req.body || {};
    if (!email || !password || !name) {
      return res.status(400).json({ error: "Nama, email, dan password wajib diisi" });
    }

    const db = await readDB();
    if (isProductionRuntime() && isPgDegraded()) {
      return res.status(503).json({
        error: DB_QUOTA_REGISTER_MSG,
        code: "DB_QUOTA_EXCEEDED",
      });
    }

    const existing = db.accounts.find((a) => a.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return res.status(400).json({ error: "Email sudah terdaftar" });
    }

    const id = `usr-${Date.now()}`;
    const passwordHash = await bcrypt.hash(password, 10);
    const assignedRole = role || "student";

    const account = {
      id,
      email,
      name,
      role: assignedRole,
      passwordHash,
      createdAt: new Date().toISOString(),
    };

    const profile = {
      userId: id,
      name,
      role: assignedRole,
      gender: "other",
      grade: grade || "X",
      section: classSection || "1",
      dob: null,
      schoolId: schoolId || null,
      xp: 0,
      level: 1,
      achievements: [],
      joinedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    };

    await saveAccount(account);
    if (isProductionRuntime() && isPgDegraded()) {
      db.accounts = (db.accounts || []).filter((a) => a.id !== account.id);
      return res.status(503).json({
        error: DB_QUOTA_REGISTER_MSG,
        code: "DB_QUOTA_EXCEEDED",
      });
    }
    await saveProfile(profile);

    const jwtToken = jwt.sign(
      {
        id: account.id,
        email: account.email,
        role: account.role,
        name: account.name,
        schoolId: account.schoolId,
        grade: account.grade,
        isDemo: Boolean(account.isDemo),
      },
      SECRET,
      { expiresIn: "24h" }
    );
    const { passwordHash: _, ...safeAccount } = account;
    return res.status(201).json({ success: true, token: jwtToken, account: safeAccount });
  } catch (error) {
    console.error("[AUTH ERROR] /register:", error);
    if (isPgQuotaOrUnavailableError(error)) {
      return res.status(503).json({
        error: DB_QUOTA_REGISTER_MSG,
        code: "DB_QUOTA_EXCEEDED",
      });
    }
    res.status(500).json({ error: "Internal server error during registration" });
  }
});

// New endpoint to register Google user after confirmation
router.post("/register-google", async (req, res) => {
  try {
    const { token, role, name: providedName, schoolId, grade, classSection } = req.body;
    if (!token) {
      return res.status(400).json({ error: "Google token is required" });
    }

    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: token,
        audience: GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch (err) {
      // Fallback for dev mode
      if (token.startsWith("{")) {
        try { payload = JSON.parse(token); } catch(e) {}
      }
      if (!payload) return res.status(401).json({ error: "Invalid Google token" });
    }

    const { email, sub: googleId, picture } = payload;
    if (!email) return res.status(400).json({ error: "Google token does not contain email" });

    const db = await readDB();
    if (isProductionRuntime() && isPgDegraded()) {
      return res.status(503).json({
        error: DB_QUOTA_REGISTER_MSG,
        code: "DB_QUOTA_EXCEEDED",
      });
    }

    let account = db.accounts.find((a) => a.email.toLowerCase() === email.toLowerCase());

    if (account) {
      return res.status(400).json({ error: "Account already registered" });
    }

    // Create new account
    const id = `usr-${Date.now()}`;
    account = {
      id,
      email,
      name: providedName || payload.name || "User",
      role: role || "student",
      googleId,
      picture,
      createdAt: new Date().toISOString(),
    };

    const profile = {
      userId: id,
      name: account.name,
      role: account.role,
      gender: "other",
      grade: grade || "X",
      section: classSection || "1",
      dob: null,
      schoolId: schoolId || null,
      xp: 0,
      level: 1,
      achievements: [],
      joinedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    };

    await saveAccount(account);
    if (isProductionRuntime() && isPgDegraded()) {
      db.accounts = (db.accounts || []).filter((a) => a.id !== account.id);
      return res.status(503).json({
        error: DB_QUOTA_REGISTER_MSG,
        code: "DB_QUOTA_EXCEEDED",
      });
    }
    await saveProfile(profile);

    const jwtToken = jwt.sign(
      {
        id: account.id,
        email: account.email,
        role: account.role,
        name: account.name,
        schoolId: account.schoolId,
        grade: account.grade,
        isDemo: Boolean(account.isDemo),
      },
      SECRET,
      { expiresIn: "24h" }
    );
    res.json({ token: jwtToken, account });
  } catch (error) {
    console.error("[AUTH ERROR] /register-google:", error);
    if (isPgQuotaOrUnavailableError(error)) {
      return res.status(503).json({
        error: DB_QUOTA_REGISTER_MSG,
        code: "DB_QUOTA_EXCEEDED",
      });
    }
    res.status(500).json({ error: "Internal server error during registration" });
  }
});

router.get("/me", verifyToken, async (req, res) => {
  try {
    let account = await getAccountById(req.user.id);
    const isDemoSession = Boolean(
      req.user?.isDemo ||
        String(req.user?.id || "").startsWith("usr-demo-") ||
        String(req.user?.id || "").startsWith("demo-"),
    );
    if (!account && (isDemoSession || isPgDegraded())) {
      const normalizedRole = req.user.role === "dev" ? "developer" : (req.user.role || "student");
      account = {
        id: req.user.id,
        email: req.user.email || `${req.user.id}@demo.harmony.sch.id`,
        name: req.user.name || (isDemoSession ? "Demo Account" : "Pengguna"),
        role: normalizedRole,
        schoolId: req.user.schoolId || SMAN1_NGORO_META.schoolId,
        grade:
          normalizedRole === "teacher" || normalizedRole === "developer"
            ? "-"
            : (req.user.grade || "XI"),
        isDemo: isDemoSession,
      };
    }
    if (!account) return res.status(404).json({ error: "User not found" });
    const { passwordHash: _, ...safeAccount } = account;
    res.json({ account: safeAccount, ...buildFallbackMeta() });
  } catch (error) {
    console.error("[AUTH ERROR] /me:", error);
    if (isPgQuotaOrUnavailableError(error)) {
      return res.status(503).json({
        error: DB_QUOTA_LOGIN_MSG,
        code: "DB_QUOTA_EXCEEDED",
      });
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
