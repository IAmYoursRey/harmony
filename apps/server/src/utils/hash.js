import fs from "fs";
import bcrypt from "bcryptjs";

const db = JSON.parse(fs.readFileSync("database.json"));
const newHash = bcrypt.hashSync("password123", 10);
db.accounts.find((a) => a.email === "raihanansari6678@gmail.com").passwordHash =
  newHash;
fs.writeFileSync("database.json", JSON.stringify(db, null, 2));
console.log("Password updated successfully");
