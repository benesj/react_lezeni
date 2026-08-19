// Úložiště dat + veškerá logika práce s lezci.
// Běží jen na serveru, takže se nic z toho nedostane do prohlížeče.
//
// Každá lezecká skupina (kroužek) má vlastní soubor ve složce skupiny/.
// V souboru je dělení na mladší/starší, název skupiny a příznak zámku:
// když je skupina zamčená, data se z aplikace měnit nedají.
const fs = require("fs");
const path = require("path");
const os = require("os");

// Data schválně NEleží u projektu — ten je na externím disku D:, který nemusí
// být připojený. Jiné umístění: proměnná DATA_DIR.
const DATA_DIR =
  process.env.DATA_DIR ||
  path.join(process.env.APPDATA || os.homedir(), "lezecky-zebricek");

const SKUPINY_DIR = path.join(DATA_DIR, "skupiny");

// Dřívější umístění jednoho společného souboru — jednorázově se převede.
const STARY_JEDEN = path.join(DATA_DIR, "data.json");
const STARY_U_PROJEKTU = path.join(__dirname, "data.json");

const VYCHOZI_ID = "hlavni";
const VYCHOZI_NAZEV = "Hlavní";
const MAX_SKUPIN = 50;

// id skupiny je zároveň jméno souboru, takže se povolují jen bezpečné znaky
// (jinak by se dalo přes ../ psát mimo složku s daty).
const jeIdOk = (id) => /^[a-z0-9][a-z0-9_-]{0,39}$/.test(String(id || ""));

const souborSkupiny = (id) => {
  if (!jeIdOk(id)) throw new Error("Neplatné id skupiny");
  return path.join(SKUPINY_DIR, id + ".json");
};

// "Pondělní parta" -> "pondelni-parta"
function naId(nazev) {
  const zaklad = String(nazev || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // pryč s háčky a čárkami
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "");
  return zaklad || "skupina";
}

const prazdnaSkupina = (nazev) => ({
  nazev: String(nazev || VYCHOZI_NAZEV).trim().slice(0, 60) || VYCHOZI_NAZEV,
  odemceno: false,
  vytvoreno: new Date().toISOString(),
  mladsi: [],
  starsi: [],
});

const ocistiLezce = (pole) =>
  (Array.isArray(pole) ? pole : [])
    .filter((e) => e && typeof e.jmeno === "string")
    .map((e) => ({ jmeno: e.jmeno, xp: Number(e.xp) || 0 }));

// Souboru na disku se nevěří — vždy se dosadí známý tvar.
function ocisti(id, parsed) {
  return {
    id,
    nazev: String(parsed?.nazev || id).trim().slice(0, 60) || id,
    odemceno: parsed?.odemceno === true,
    vytvoreno: typeof parsed?.vytvoreno === "string" ? parsed.vytvoreno : "",
    mladsi: ocistiLezce(parsed?.mladsi),
    starsi: ocistiLezce(parsed?.starsi),
  };
}

// Zápis přes dočasný soubor, aby výpadek uprostřed zápisu nesmazal data.
// Předchozí verze se vždy odloží do <id>.bak.json.
function zapis(skupina) {
  const soubor = souborSkupiny(skupina.id);
  fs.mkdirSync(SKUPINY_DIR, { recursive: true });
  const { id, ...naDisk } = skupina; // id nese jméno souboru, do obsahu nepatří
  const tmp = soubor + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(naDisk, null, 2), "utf8");
  if (fs.existsSync(soubor)) {
    fs.copyFileSync(soubor, path.join(SKUPINY_DIR, id + ".bak.json"));
  }
  fs.renameSync(tmp, soubor);
  return skupina;
}

function ctiSkupinu(id) {
  const soubor = souborSkupiny(id);
  try {
    return ocisti(id, JSON.parse(fs.readFileSync(soubor, "utf8")));
  } catch (e) {
    if (e.code === "ENOENT") return null;
    console.error(id + ".json je poškozený:", e.message);
    return ocisti(id, null);
  }
}

function idSkupin() {
  try {
    return fs
      .readdirSync(SKUPINY_DIR)
      .filter((f) => f.endsWith(".json") && !f.endsWith(".bak.json"))
      .map((f) => f.slice(0, -5))
      .filter(jeIdOk);
  } catch {
    return [];
  }
}

// Převod ze starého jednoho souboru na skupinu "hlavni".
// Původní soubor se nemaže, jen přejmenuje, ať je z čeho couvnout.
function pripravSlozku() {
  fs.mkdirSync(SKUPINY_DIR, { recursive: true });
  if (idSkupin().length) return;

  // ještě starší umístění u projektu -> do DATA_DIR
  if (!fs.existsSync(STARY_JEDEN) && fs.existsSync(STARY_U_PROJEKTU)) {
    fs.copyFileSync(STARY_U_PROJEKTU, STARY_JEDEN);
    fs.renameSync(STARY_U_PROJEKTU, STARY_U_PROJEKTU + ".presunuto");
  }

  const nova = prazdnaSkupina(VYCHOZI_NAZEV);
  if (fs.existsSync(STARY_JEDEN)) {
    try {
      const stara = JSON.parse(fs.readFileSync(STARY_JEDEN, "utf8"));
      nova.mladsi = ocistiLezce(stara?.mladsi);
      nova.starsi = ocistiLezce(stara?.starsi);
    } catch (e) {
      console.error("Starý data.json se nepodařilo přečíst:", e.message);
    }
  }
  zapis({ id: VYCHOZI_ID, ...nova });
  if (fs.existsSync(STARY_JEDEN)) {
    fs.renameSync(STARY_JEDEN, STARY_JEDEN + ".prevedeno");
    console.log("Data převedena do " + souborSkupiny(VYCHOZI_ID));
  }
}
pripravSlozku();

// Celý stav pro klienta: všechny skupiny v pořadí, jak vznikly.
function read() {
  const skupiny = idSkupin()
    .map(ctiSkupinu)
    .filter(Boolean)
    .sort(
      (a, b) =>
        a.vytvoreno.localeCompare(b.vytvoreno) || a.id.localeCompare(b.id)
    );
  return { skupiny };
}

// Skupina, se kterou se má pracovat. Hlídá i zámek — zamčenou nikdo nezmění.
function proZapis(id, { musiBytOdemcena = true } = {}) {
  const skupina = ctiSkupinu(id);
  if (!skupina) throw new Error("Skupina neexistuje");
  if (musiBytOdemcena && !skupina.odemceno) {
    throw new Error("Skupina je zamčená");
  }
  return skupina;
}

const cisloZeJmena = (jmeno) => {
  const match = String(jmeno).match(/\((\d+)\)$/);
  return match ? parseInt(match[1], 10) : null;
};

// Identifikátor je buď celé jméno ("Petr (3)"), nebo jen pořadové číslo (3 / "3").
// Vrací { kde, index } nebo null.
function najdi(skupina, identifier) {
  const text = String(identifier).trim();
  const cislo = /^\d+$/.test(text) ? parseInt(text, 10) : cisloZeJmena(text);

  for (const kde of ["mladsi", "starsi"]) {
    const index = skupina[kde].findIndex(
      (e) =>
        e.jmeno === text || (cislo !== null && cisloZeJmena(e.jmeno) === cislo)
    );
    if (index >= 0) return { kde, index };
  }
  return null;
}

// První volné pořadové číslo v rámci téhle skupiny (mladší i starší dohromady).
function dalsiCislo(skupina) {
  const pouzita = new Set(
    [...skupina.mladsi, ...skupina.starsi]
      .map((e) => cisloZeJmena(e.jmeno))
      .filter((n) => n !== null)
  );
  let n = 1;
  while (pouzita.has(n)) n++;
  return n;
}

function pridej(id, jmeno, kde, xp) {
  const skupina = proZapis(id);
  const cislo = dalsiCislo(skupina);
  skupina[kde] = [
    ...skupina[kde],
    { jmeno: `${String(jmeno).trim()} (${cislo})`, xp: Number(xp) || 0 },
  ];
  zapis(skupina);
  return read();
}

function odeber(id, identifier) {
  const skupina = proZapis(id);
  const nalezen = najdi(skupina, identifier);
  if (!nalezen) return read();
  skupina[nalezen.kde] = skupina[nalezen.kde].filter(
    (_, i) => i !== nalezen.index
  );
  zapis(skupina);
  return read();
}

function pridejXp(id, identifier, stena) {
  const skupina = proZapis(id);
  const nalezen = najdi(skupina, identifier);
  if (!nalezen) return read();
  const lezec = skupina[nalezen.kde][nalezen.index];
  skupina[nalezen.kde] = skupina[nalezen.kde].map((e, i) =>
    i === nalezen.index ? { ...lezec, xp: lezec.xp + (Number(stena) || 0) } : e
  );
  zapis(skupina);
  return read();
}

// Zámek přepíná jen správce (server.js si vyžádá heslo), proto se tady
// nekontroluje, jestli je skupina odemčená.
function nastavZamek(id, odemceno) {
  const skupina = proZapis(id, { musiBytOdemcena: false });
  skupina.odemceno = odemceno === true;
  zapis(skupina);
  return read();
}

function vytvorSkupinu(nazev) {
  const cisty = String(nazev || "").trim();
  if (!cisty) throw new Error("Chybí název skupiny");
  const existujici = new Set(idSkupin());
  if (existujici.size >= MAX_SKUPIN) throw new Error("Víc skupin už ne");

  const zaklad = naId(cisty);
  let id = zaklad;
  let n = 2;
  while (existujici.has(id)) id = zaklad.slice(0, 37) + "-" + n++;

  zapis({ id, ...prazdnaSkupina(cisty) });
  return { stav: read(), id };
}

// Smazaná skupina se nezahazuje, soubor se odloží do smazane/ s datem.
function smazSkupinu(id) {
  const soubor = souborSkupiny(id);
  if (!fs.existsSync(soubor)) throw new Error("Skupina neexistuje");
  if (idSkupin().length <= 1) throw new Error("Poslední skupina se smazat nedá");

  const kos = path.join(DATA_DIR, "smazane");
  fs.mkdirSync(kos, { recursive: true });
  const razitko = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 16);
  fs.renameSync(soubor, path.join(kos, id + "-" + razitko + ".json"));

  const bak = path.join(SKUPINY_DIR, id + ".bak.json");
  if (fs.existsSync(bak)) fs.unlinkSync(bak);
  return read();
}

// Jednorázový import (např. dat vytažených ze starého localStorage).
function nahrad(id, nova) {
  const skupina = proZapis(id, { musiBytOdemcena: false });
  skupina.mladsi = ocistiLezce(nova?.mladsi);
  skupina.starsi = ocistiLezce(nova?.starsi);
  zapis(skupina);
  return read();
}

module.exports = {
  read,
  ctiSkupinu,
  pridej,
  odeber,
  pridejXp,
  nastavZamek,
  vytvorSkupinu,
  smazSkupinu,
  nahrad,
  DATA_DIR,
  SKUPINY_DIR,
};
