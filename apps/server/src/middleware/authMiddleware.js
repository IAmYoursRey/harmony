import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { getAccountById } from "../repositories/repository.js";
dotenv.config({ path: [".env.local", ".env"] });

const SECRET = process.env.JWT_SECRET || "default_jwt_secret_for_development";
if (!process.env.JWT_SECRET) {
  console.warn(
    "[WARNING] JWT_SECRET is not defined in environment variables. Using fallback.",
  );
}
export async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Missing token" });
  }

  const token = authHeader.split(" ")[1];
  let decoded;
  try {
    decoded = jwt.verify(token, SECRET);
  } catch (err) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }

  try {
    const account = await getAccountById(decoded.id);
    if (account) {
      decoded.role = account.role;
      decoded.email = account.email;
    }
  } catch {
    // Keep signed JWT claims if database lookup fails due to quota or transient outage
  }

  // Normalize 'developer' to 'dev' for backend compatibility
  if (decoded.role === "developer") {
    decoded.role = "dev";
  }

  req.user = decoded; // { id, role }
  next();
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

