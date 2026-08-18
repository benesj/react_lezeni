// Úložiště dat v JSON souboru + veškerá logika práce s lezci.
// Běží jen na serveru, takže se nic z toho nedostane do prohlížeče.
const fs = require("fs");
const path = require("path");
const os = require("os");

// Data schválně NEleží u projektu — ten je na externím disku D:, který nemusí
// být připojený. Ukládají se do profilu uživatele na systémovém disku.
// Jiné umístění: proměnná DATA_DIR.
const DATA_DIR =
  process.env.DATA_DIR ||
  path.join(process.env.APPDATA || os.homedir(), "lezecky-zebricek");

const DATA_FILE = path.join(DATA_DIR, "data.json");
const BACKUP_FILE = path.join(DATA_DIR, "data.bak.json");

// Data z dřívějška ležela v server/data.json — jednorázově se přenesou.
const STARY_SOUBOR = path.join(__dirname, "data.json");

function pripravSlozku() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE) && fs.existsSync(STARY_SOUBOR)) {
    fs.copyFileSync(STARY_SOUBOR, DATA_FILE);
    fs.renameSync(STARY_SOUBOR, STARY_SOUBOR + ".presunuto");
    console.log("Data přenesena z " + STARY_SOUBOR + " do " + DATA_FILE);
  }
}
pripravSlozku();

const prazdnaData = () => ({ mladsi: [], starsi: [] });

function read() {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return {
      mladsi: Array.isArray(parsed?.mladsi) ? parsed.mladsi : [],
      starsi: Array.isArray(parsed?.starsi) ? parsed.starsi : [],
    };
  } catch (e) {
    if (e.code !== "ENOENT") {
      console.error("data.json je poškozený, začínám s prázdnými daty:", e.message);
    }
    return prazdnaData();
  }
}

// Zápis přes dočasný soubor, aby výpadek uprostřed zápisu nesmazal data.
// Předchozí verze se vždy odloží do data.bak.json.
function write(data) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = DATA_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf8");
  if (fs.existsSync(DATA_FILE)) fs.copyFileSync(DATA_FILE, BACKUP_FILE);
  fs.renameSync(tmp, DATA_FILE);
  return data;
}

const cisloZeJmena = (jmeno) => {
  const match = String(jmeno).match(/\((\d+)\)$/);
  return match ? parseInt(match[1], 10) : null;
};

// Identifikátor je buď celé jméno ("Petr (3)"), nebo jen pořadové číslo (3 / "3").
// Vrací { skupina, index } nebo null.
function najdi(data, identifier) {
  const text = String(identifier).trim();
  const cislo = /^\d+$/.test(text)
    ? parseInt(text, 10)
    : cisloZeJmena(text);

  for (const skupina of ["mladsi", "starsi"]) {
    const index = data[skupina].findIndex(
      (e) => e.jmeno === text || (cislo !== null && cisloZeJmena(e.jmeno) === cislo)
    );
    if (index >= 0) return { skupina, index };
  }
  return null;
}

// První volné pořadové číslo napříč oběma skupinami.
function dalsiCislo(data) {
  const pouzita = new Set(
    [...data.mladsi, ...data.starsi]
      .map((e) => cisloZeJmena(e.jmeno))
      .filter((n) => n !== null)
  );
  let n = 1;
  while (pouzita.has(n)) n++;
  return n;
}

function pridej(jmeno, skupina, xp) {
  const data = read();
  const cislo = dalsiCislo(data);
  data[skupina] = [
    ...data[skupina],
    { jmeno: `${String(jmeno).trim()} (${cislo})`, xp: Number(xp) || 0 },
  ];
  return write(data);
}

function odeber(identifier) {
  const data = read();
  const nalezen = najdi(data, identifier);
  if (!nalezen) return data;
  data[nalezen.skupina] = data[nalezen.skupina].filter(
    (_, i) => i !== nalezen.index
  );
  return write(data);
}

function pridejXp(identifier, stena) {
  const data = read();
  const nalezen = najdi(data, identifier);
  if (!nalezen) return data;
  const lezec = data[nalezen.skupina][nalezen.index];
  data[nalezen.skupina] = data[nalezen.skupina].map((e, i) =>
    i === nalezen.index ? { ...lezec, xp: lezec.xp + (Number(stena) || 0) } : e
  );
  return write(data);
}

// Jednorázový import (např. dat vytažených ze starého localStorage).
function nahrad(nova) {
  return write({
    mladsi: Array.isArray(nova?.mladsi) ? nova.mladsi : [],
    starsi: Array.isArray(nova?.starsi) ? nova.starsi : [],
  });
}

module.exports = { read, pridej, odeber, pridejXp, nahrad, DATA_FILE, DATA_DIR };
