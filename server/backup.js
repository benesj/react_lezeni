// Ruční záloha žebříčku:  npm run backup
// Uloží kopii všech skupin s datem do podsložky zalohy/ a starší postupně maže,
// ať to nebobtná. Nechává posledních 20.
const fs = require("fs");
const path = require("path");
const { SKUPINY_DIR, DATA_DIR } = require("./store");

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

const soubory = fs.existsSync(SKUPINY_DIR)
  ? fs.readdirSync(SKUPINY_DIR).filter((f) => f.endsWith(".json") && !f.endsWith(".bak.json"))
  : [];

if (!soubory.length) {
  console.log("Zatím není co zálohovat — ve " + SKUPINY_DIR + " nejsou skupiny.");
  process.exit(0);
}

// Každá záloha je vlastní podsložka skupiny-<datum>/, uvnitř soubory skupin.
const cil = path.join(SLOZKA, "skupiny-" + razitko());
fs.mkdirSync(cil, { recursive: true });
soubory.forEach((f) =>
  fs.copyFileSync(path.join(SKUPINY_DIR, f), path.join(cil, f))
);
console.log("Záloha: " + cil + " (" + soubory.length + " skupin)");

const stare = fs
  .readdirSync(SLOZKA)
  .filter((f) => f.startsWith("skupiny-"))
  .sort()
  .slice(0, -KOLIK_NECHAT);

stare.forEach((f) => fs.rmSync(path.join(SLOZKA, f), { recursive: true, force: true }));
if (stare.length) console.log("Smazáno starých záloh: " + stare.length);
