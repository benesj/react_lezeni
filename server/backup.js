// Ruční záloha žebříčku:  npm run backup
// Uloží kopii dat s datem do podsložky zalohy/ a starší postupně maže,
// ať to nebobtná. Nechává posledních 20.
const fs = require("fs");
const path = require("path");
const { DATA_FILE, DATA_DIR } = require("./store");

const KOLIK_NECHAT = 20;
const SLOZKA = path.join(DATA_DIR, "zalohy");

function razitko() {
  const d = new Date();
  const dvojmistne = (n) => String(n).padStart(2, "0");
  return (
    d.getFullYear() +
    "-" + dvojmistne(d.getMonth() + 1) +
    "-" + dvojmistne(d.getDate()) +
    "_" + dvojmistne(d.getHours()) +
    "-" + dvojmistne(d.getMinutes())
  );
}

if (!fs.existsSync(DATA_FILE)) {
  console.log("Zatím není co zálohovat — " + DATA_FILE + " neexistuje.");
  process.exit(0);
}

fs.mkdirSync(SLOZKA, { recursive: true });
const cil = path.join(SLOZKA, "data-" + razitko() + ".json");
fs.copyFileSync(DATA_FILE, cil);
console.log("Záloha: " + cil);

const stare = fs
  .readdirSync(SLOZKA)
  .filter((f) => f.startsWith("data-") && f.endsWith(".json"))
  .sort()
  .slice(0, -KOLIK_NECHAT);

stare.forEach((f) => fs.unlinkSync(path.join(SLOZKA, f)));
if (stare.length) console.log("Smazáno starých záloh: " + stare.length);
