const fs = require("fs");
const path = require("path");

const routesDir = path.join(__dirname, "routes");
const files = fs.readdirSync(routesDir).filter((f) => f.endsWith(".js"));

files.forEach((file) => {
  const filePath = path.join(routesDir, file);
  let content = fs.readFileSync(filePath, "utf8");
  let changed = false;

  if (content.match(/\breadDB\(\)/)) {
    content = content.replace(/\breadDB\(\)/g, "await readDB()");
    changed = true;
  }

  if (content.match(/\bwriteDB\([^)]+\)/)) {
    content = content.replace(/\bwriteDB\(([^)]+)\)/g, "await writeDB($1)");
    changed = true;
  }

  if (changed) {
    content = content.replace(
      /(router\.(?:get|post|put|delete|patch)\([^,]+,\s*(?:[A-Za-z0-9_]+,\s*)*)(?!\basync\b)(\(req)/g,
      "$1async $2",
    );

    content = content.replace(
      /(router\.(?:get|post|put|delete|patch)\([^,]+,\s*[A-Za-z0-9_]+\([^)]*\),\s*)(?!\basync\b)(\(req)/g,
      "$1async $2",
    );

    content = content.replace(
      /(router\.(?:get|post|put|delete|patch)\([^,]+,\s*[A-Za-z0-9_]+,\s*[A-Za-z0-9_]+\([^)]*\),\s*)(?!\basync\b)(\(req)/g,
      "$1async $2",
    );

    fs.writeFileSync(filePath, content, "utf8");
    console.log(`Updated ${file}`);
  }
});
