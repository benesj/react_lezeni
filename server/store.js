// Úložiště dat + veškerá logika práce s lezci.
// Běží jen na serveru, takže se nic z toho nedostane do prohlížeče.
//
// Každá lezecká skupina (kroužek) má vlastní soubor ve složce skupiny/.
// Uvnitř je název, režim zámku a seznam kategorií (např. „Mladší“, „Starší“,
// „Pokročilí“…), každá kategorie má vlastní žebříček lezců. Nová skupina
// vzniká bez kategorií — přidávají se až v aplikaci.
//
// Režim zámku (rezim) má dva stupně a platí pro všechny s odkazem:
//   zamceno – nikdo nic nemění, jde jen prohlížet
//   body    – kdokoli smí lezcům body jen PŘIDÁVAT
// Všechno ostatní (odebírání bodů, členové, kategorie, přepínání režimu)
// smí jen správce přihlášený heslem — a to jen na svém zařízení, protože
// token z přihlášení drží jen ten prohlížeč. Kdo je správce, rozhoduje
// server.js, sem přijde jen příznak `spravce`.
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
const MAX_KATEGORII = 20;

const REZIMY = ["zamceno", "body"];

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
  rezim: "zamceno",
  vytvoreno: new Date().toISOString(),
  kategorie: [],
});

// Odznaky (achievementy), které správce zaškrtává u lezců. Seznam je
// napevno tady i v aplikaci (src/Odznaky.jsx má k nim obrázky) — nový
// odznak se přidá na obě místa.
const ODZNAKY = ["lano", "osma", "expreska", "kyblik", "zinenka"];

const ocistiOdznaky = (pole) =>
  [...new Set((Array.isArray(pole) ? pole : []).filter((o) => ODZNAKY.includes(o)))];

const ocistiLezce = (pole) =>
  (Array.isArray(pole) ? pole : [])
    .filter((e) => e && typeof e.jmeno === "string")
    .map((e) => ({
      jmeno: e.jmeno,
      xp: Number(e.xp) || 0,
      odznaky: ocistiOdznaky(e.odznaky),
    }));

// Kategorie ze souboru — nebo převod ze starého tvaru s pevným
// mladsi/starsi (převádí se jen ty, ve kterých někdo je, prázdné
// „výchozí“ kategorie už nikdo nechce).
function ocistiKategorie(parsed) {
  if (Array.isArray(parsed?.kategorie)) {
    const videna = new Set();
    return parsed.kategorie
      .filter((k) => k && jeIdOk(k.id) && !videna.has(k.id) && videna.add(k.id))
      .slice(0, MAX_KATEGORII)
      .map((k) => ({
        id: k.id,
        nazev: String(k.nazev || k.id).trim().slice(0, 40) || k.id,
        lezci: ocistiLezce(k.lezci),
      }));
  }
  const stare = [
    { id: "mladsi", nazev: "Mladší", lezci: ocistiLezce(parsed?.mladsi) },
    { id: "starsi", nazev: "Starší", lezci: ocistiLezce(parsed?.starsi) },
  ];
  return stare.filter((k) => k.lezci.length > 0);
}

// Režim ze souboru. Starší tvary se převedou: boolean `odemceno` (true =
// body) i zrušený režim „admin“ (ten dovoloval komukoli měnit členy —
// teď je to jen na správci, skupina zůstane otevřená pro body).
function ocistiRezim(parsed) {
  if (REZIMY.includes(parsed?.rezim)) return parsed.rezim;
  if (parsed?.rezim === "admin" || parsed?.odemceno === true) return "body";
  return "zamceno";
}

// Souboru na disku se nevěří — vždy se dosadí známý tvar.
function ocisti(id, parsed) {
  return {
    id,
    nazev: String(parsed?.nazev || id).trim().slice(0, 60) || id,
    rezim: ocistiRezim(parsed),
    vytvoreno: typeof parsed?.vytvoreno === "string" ? parsed.vytvoreno : "",
    kategorie: ocistiKategorie(parsed),
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
      nova.kategorie = ocistiKategorie(stara);
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

// Skupina, se kterou se má pracovat. Když akci nedělá správce, musí být
// skupina v režimu „body“ — zamčenou nezmění nikdo jiný než správce.
function proZapis(id, { spravce = false } = {}) {
  const skupina = ctiSkupinu(id);
  if (!skupina) throw new Error("Skupina neexistuje");
  if (!spravce && skupina.rezim === "zamceno") {
    throw new Error("Skupina je zamčená");
  }
  return skupina;
}

const cisloZeJmena = (jmeno) => {
  const match = String(jmeno).match(/\((\d+)\)$/);
  return match ? parseInt(match[1], 10) : null;
};

// Identifikátor je buď celé jméno ("Petr (3)"), nebo jen pořadové číslo (3 / "3").
// Vrací { kategorie, index } nebo null.
function najdi(skupina, identifier) {
  const text = String(identifier).trim();
  const cislo = /^\d+$/.test(text) ? parseInt(text, 10) : cisloZeJmena(text);

  for (const kategorie of skupina.kategorie) {
    const index = kategorie.lezci.findIndex(
      (e) =>
        e.jmeno === text || (cislo !== null && cisloZeJmena(e.jmeno) === cislo)
    );
    if (index >= 0) return { kategorie, index };
  }
  return null;
}

// První volné pořadové číslo v rámci celé skupiny (přes všechny kategorie).
function dalsiCislo(skupina) {
  const pouzita = new Set(
    skupina.kategorie
      .flatMap((k) => k.lezci)
      .map((e) => cisloZeJmena(e.jmeno))
      .filter((n) => n !== null)
  );
  let n = 1;
  while (pouzita.has(n)) n++;
  return n;
}

// Členy, kategorie a odebírání bodů si pustí jen správce — kdo je správce,
// ověřuje server.js podle tokenu, sem už chodí jen správcovská volání.
function pridej(id, jmeno, kategorieId, xp) {
  const skupina = proZapis(id, { spravce: true });
  const kategorie = skupina.kategorie.find((k) => k.id === kategorieId);
  if (!kategorie) throw new Error("Kategorie neexistuje");
  const cislo = dalsiCislo(skupina);
  kategorie.lezci = [
    ...kategorie.lezci,
    { jmeno: `${String(jmeno).trim()} (${cislo})`, xp: Number(xp) || 0 },
  ];
  zapis(skupina);
  return read();
}

function odeber(id, identifier) {
  const skupina = proZapis(id, { spravce: true });
  const nalezen = najdi(skupina, identifier);
  if (!nalezen) return read();
  nalezen.kategorie.lezci = nalezen.kategorie.lezci.filter(
    (_, i) => i !== nalezen.index
  );
  zapis(skupina);
  return read();
}

// Přidat body smí kdokoli v režimu „body“, odebrat (mínus) jen správce.
function pridejXp(id, identifier, stena, { spravce = false } = {}) {
  const body = Number(stena) || 0;
  if (body < 0 && !spravce) throw new Error("Body může odebrat jen správce");
  const skupina = proZapis(id, { spravce });
  const nalezen = najdi(skupina, identifier);
  if (!nalezen) return read();
  nalezen.kategorie.lezci = nalezen.kategorie.lezci.map((e, i) =>
    i === nalezen.index ? { ...e, xp: e.xp + body } : e
  );
  zapis(skupina);
  return read();
}

// Odznak lezci přidá nebo odebere jen správce.
function nastavOdznak(id, identifier, odznak, ma) {
  if (!ODZNAKY.includes(odznak)) throw new Error("Neznámý odznak");
  const skupina = proZapis(id, { spravce: true });
  const nalezen = najdi(skupina, identifier);
  if (!nalezen) throw new Error("Lezec nenalezen");
  nalezen.kategorie.lezci = nalezen.kategorie.lezci.map((e, i) => {
    if (i !== nalezen.index) return e;
    const bez = e.odznaky.filter((o) => o !== odznak);
    return { ...e, odznaky: ma ? [...bez, odznak] : bez };
  });
  zapis(skupina);
  return read();
}

function pridejKategorii(id, nazev) {
  const skupina = proZapis(id, { spravce: true });
  const cisty = String(nazev || "").trim().slice(0, 40);
  if (!cisty) throw new Error("Chybí název kategorie");
  if (skupina.kategorie.length >= MAX_KATEGORII)
    throw new Error("Víc kategorií už ne");

  const existujici = new Set(skupina.kategorie.map((k) => k.id));
  const zaklad = naId(cisty);
  let kid = zaklad;
  let n = 2;
  while (existujici.has(kid)) kid = zaklad.slice(0, 37) + "-" + n++;

  skupina.kategorie = [...skupina.kategorie, { id: kid, nazev: cisty, lezci: [] }];
  zapis(skupina);
  return read();
}

// Smazat jde jen prázdnou kategorii — lezce i s body nikdo omylem nezahodí.
function smazKategorii(id, kategorieId) {
  const skupina = proZapis(id, { spravce: true });
  const kategorie = skupina.kategorie.find((k) => k.id === kategorieId);
  if (!kategorie) throw new Error("Kategorie neexistuje");
  if (kategorie.lezci.length)
    throw new Error("Kategorie není prázdná, nejdřív odeber lezce");
  skupina.kategorie = skupina.kategorie.filter((k) => k.id !== kategorieId);
  zapis(skupina);
  return read();
}

// Režim přepíná jen správce (server.js si vyžádá heslo), proto se tady
// zámek nekontroluje.
function nastavRezim(id, rezim) {
  if (!REZIMY.includes(rezim)) throw new Error("Neznámý režim");
  const skupina = proZapis(id, { spravce: true });
  skupina.rezim = rezim;
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
// Bere nový tvar { kategorie: [...] } i starý { mladsi, starsi }.
function nahrad(id, nova) {
  const skupina = proZapis(id, { spravce: true });
  skupina.kategorie = ocistiKategorie(nova);
  zapis(skupina);
  return read();
}

module.exports = {
  read,
  ctiSkupinu,
  pridej,
  odeber,
  pridejXp,
  nastavOdznak,
  pridejKategorii,
  smazKategorii,
  nastavRezim,
  vytvorSkupinu,
  smazSkupinu,
  nahrad,
  REZIMY,
  ODZNAKY,
  DATA_DIR,
  SKUPINY_DIR,
};
