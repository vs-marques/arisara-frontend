import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const dir = path.join(root, "src/i18n/locales");

function countApproxKeys(content) {
  const keys = new Set();
  const re = /^\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(['"`]|t\()/gm;
  let m;
  while ((m = re.exec(content)) !== null) keys.add(m[1]);
  return keys.size;
}

function lineCount(p) {
  return fs.readFileSync(p, "utf8").split("\n").length;
}

const ptFiles = fs
  .readdirSync(path.join(dir, "pt"))
  .filter((f) => f.endsWith(".ts") && f !== "index.ts");

const rows = [];
for (const f of ptFiles) {
  const ptP = path.join(dir, "pt", f);
  const enP = path.join(dir, "en", f);
  const thP = path.join(dir, "th", f);
  const ptC = fs.readFileSync(ptP, "utf8");
  const enC = fs.existsSync(enP) ? fs.readFileSync(enP, "utf8") : "";
  const thC = fs.existsSync(thP) ? fs.readFileSync(thP, "utf8") : "";
  const pt = countApproxKeys(ptC);
  const en = enC ? countApproxKeys(enC) : 0;
  const th = thC ? countApproxKeys(thC) : 0;
  rows.push({
    file: f,
    ptLines: lineCount(ptP),
    enLines: enC ? lineCount(enP) : 0,
    thLines: thC ? lineCount(thP) : 0,
    ptKeys: pt,
    enKeys: en,
    thKeys: th,
    enGap: pt - en,
    thGap: pt - th,
  });
}

rows.sort((a, b) => b.thGap - a.thGap);
console.log("=== i18n overview (approx string keys; pt = reference) ===\n");
console.log(
  "file".padEnd(18) +
    "ptKeys".padStart(8) +
    "enKeys".padStart(8) +
    "thKeys".padStart(8) +
    " ΔEN".padStart(6) +
    " ΔTH".padStart(6) +
    "  lines pt/en/th"
);
for (const r of rows) {
  console.log(
    r.file.padEnd(18) +
      String(r.ptKeys).padStart(8) +
      String(r.enKeys).padStart(8) +
      String(r.thKeys).padStart(8) +
      String(r.enGap).padStart(6) +
      String(r.thGap).padStart(6) +
      `  ${r.ptLines}/${r.enLines}/${r.thLines}`
  );
}

const enBehind = rows.filter((r) => r.enGap > 3);
const thBehind = rows.filter((r) => r.thGap > 3);
console.log("\n--- EN clearly behind pt (>3 key gap) ---");
enBehind.forEach((r) => console.log(`  ${r.file} (en missing ~${r.enGap} keys vs pt)`));
console.log("\n--- TH clearly behind pt (>3 key gap) ---");
thBehind.forEach((r) => console.log(`  ${r.file} (th missing ~${r.thGap} keys vs pt)`));
