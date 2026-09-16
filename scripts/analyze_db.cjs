const fs = require("fs");
const db = JSON.parse(fs.readFileSync("database.json"));
console.log(
  Object.keys(db).map(
    (k) =>
      `${k}: ${Array.isArray(db[k]) ? db[k].length : Object.keys(db[k]).length}`,
  ),
);
