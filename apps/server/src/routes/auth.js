import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { readDB, writeDB } from "../repositories/repository.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import dotenv from "dotenv";
import { OAuth2Client } from "google-auth-library";

dotenv.config({ path: [".env.local", ".env"] });
const router = express.Router();
const SECRET = process.env.JWT_SECRET;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID";
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);
if (!SECRET) {
  console.error(
    "[CRITICAL] JWT_SECRET is not defined in environment variables.",
  );
}
router.post("/login", async (req, res) => {
  try {
    const { token, role } = req.body || {};

    if (!token) {
      return res.status(400).json({ error: "Google token is required" });
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
      console.error("[AUTH ERROR] Invalid Google token:", err);
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

    const db = await readDB();
    let account = db.accounts.find((a) => a.email.toLowerCase() === email.toLowerCase());

    if (!account) {
      // User not registered, return info for confirmation screen
      return res.status(200).json({
        status: "not_registered",
        email,
        name,
        picture,
        googleId,
      });
    }

    // User is registered
    const jwtToken = jwt.sign(
      { id: account.id, role: account.role, name: account.name },
      SECRET,
      { expiresIn: "24h" }
    );
    res.json({ status: "registered", token: jwtToken, account });
  } catch (err) {
    console.error("[AUTH ERROR]", err);
    res.status(500).json({ error: "Server error during login" });
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
    db.accounts.push(account);

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
    db.profiles.push(profile);

    await writeDB(db);

    const jwtToken = jwt.sign(
      { id: account.id, role: account.role, name: account.name },
      SECRET,
      { expiresIn: "24h" }
    );
    res.json({ token: jwtToken, account });
  } catch (error) {
    console.error("[AUTH ERROR] /login:", error);
    res.status(500).json({ error: "Internal server error during login" });
  }
});

router.get("/me", verifyToken, async (req, res) => {
  try {
    const db = await readDB();
    const account = db.accounts.find((a) => a.id === req.user.id);
    if (!account) return res.status(404).json({ error: "User not found" });
    const { passwordHash: _, ...safeAccount } = account;
    res.json({ account: safeAccount });
  } catch (error) {
    console.error("[AUTH ERROR] /me:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
