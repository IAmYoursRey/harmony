import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { readDB } from "../repositories/repository.js";
dotenv.config();

const SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  console.error(
    "[CRITICAL] JWT_SECRET is not defined in environment variables.",
  );
}
export async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Missing token" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, SECRET);
    
    // Always fetch the freshest role from the database in case of manual upgrades
    const db = await readDB();
    const account = db.accounts.find(a => a.id === decoded.id);
    if (account) {
      decoded.role = account.role;
    }
    
    // Normalize 'developer' to 'dev' for backend compatibility
    if (decoded.role === "developer") {
      decoded.role = "dev";
    }
    
    req.user = decoded; // { id, role }
    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
}

export async function verifyOptionalToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return next();
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
  } catch {
    // Continue without req.user if token is invalid or expired
  }
  next();
}

