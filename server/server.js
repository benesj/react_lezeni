// Server pro sdílená data žebříčku. Běží na tomhle PC, drží data v server/data.json
// a zároveň servíruje hotový build aplikace, takže ostatní v síti otevřou
// adresu tohohle PC a vidí i mění stejná data.
//
// Komunikace jede přes HTTPS (vlastní certifikát z server/cert.js), takže heslo
// ani data nejdou po síti čitelně. Na HTTP portu sedí jen přesměrování na HTTPS.
const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const os = require("os");

const store = require("./store");
const auth = require("./auth");
const cert = require("./cert");

// HTTP port jen přesměrovává, skutečná aplikace běží na HTTPS portu.
const HTTP_PORT = Number(process.env.PORT) || 4000;
const HTTPS_PORT = Number(process.env.HTTPS_PORT) || 4443;
const BUILD_DIR = path.join(__dirname, "..", "build");
// build je stavěný pro GitHub Pages, takže odkazuje na /react_lezeni/...
const PUBLIC_PREFIX = "/react_lezeni";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".map": "application/json; charset=utf-8",
};

const posli = (res, status, telo) => {
  const data = JSON.stringify(telo);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(data);
};

function nactiTelo(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1e6) {
        req.destroy(); // jinak by se data hrnula dál do paměti
        reject(new Error("Požadavek je moc velký"));
      }
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error("Nevalidní JSON"));
      }
    });
    req.on("error", reject);
  });
}

const jePrihlasen = (req) => {
  const hlavicka = req.headers.authorization || "";
  return auth.jePlatny(hlavicka.replace(/^Bearer\s+/i, ""));
};

// Přes tunel chodí všechno z localhostu, skutečnou adresu posílá Cloudflare
// v hlavičce — bez toho by brzda platila společně pro všechny.
// Věřit se jí ale smí jen u spojení z loopbacku (tj. od tunelu). Kdo se
// připojí přímo v síti, by si jinak hlavičku vymyslel a brzdu obešel.
const LOOPBACK = ["127.0.0.1", "::1", "::ffff:127.0.0.1"];
const adresaZadatele = (req) => {
  const socket = req.socket.remoteAddress || "";
  const cf = req.headers["cf-connecting-ip"];
  if (cf && LOOPBACK.includes(socket)) return String(cf).split(",")[0].trim();
  return socket;
};

// Jednoduchá brzda na hádání hesla: max 10 pokusů za minutu z jedné adresy.
const pokusy = new Map();
function prilisMnohoPokusu(ip) {
  const ted = Date.now();
  const seznam = (pokusy.get(ip) || []).filter((t) => ted - t < 60_000);
  seznam.push(ted);
  pokusy.set(ip, seznam);
  if (pokusy.size > 1000) {
    for (const [klic, casy] of pokusy) {
      if (!casy.some((t) => ted - t < 60_000)) pokusy.delete(klic);
    }
  }
  return seznam.length > 10;
}

// Druhá brzda přes všechny adresy dohromady: jednu IP jde střídat, tohle
// zpomalí i hádání z víc míst najednou.
let vsechnyPokusy = [];
function prilisMnohoCelkem() {
  const ted = Date.now();
  vsechnyPokusy = vsechnyPokusy.filter((t) => ted - t < 60_000);
  vsechnyPokusy.push(ted);
  return vsechnyPokusy.length > 60;
}

async function api(req, res, cesta) {
  if (req.method === "OPTIONS") return posli(res, 204, {});

  if (cesta === "/api/data" && req.method === "GET") {
    return posli(res, 200, store.read());
  }

  if (cesta === "/api/login" && req.method === "POST") {
    if (prilisMnohoPokusu(adresaZadatele(req)) || prilisMnohoCelkem()) {
      return posli(res, 429, { error: "Moc pokusů, zkus to za chvíli." });
    }
    if (!auth.jeNastaveno()) {
      return posli(res, 503, {
        error: "Heslo není nastavené (npm run set-password).",
      });
    }
    const telo = await nactiTelo(req);
    if (!auth.overHeslo(telo.password || "")) {
      return posli(res, 401, { error: "Špatné heslo." });
    }
    return posli(res, 200, { token: auth.vytvorToken() });
  }

  // Od tohohle místa dál se musí být přihlášen.
  const zapisove = ["/api/add", "/api/remove", "/api/xp", "/api/import"];
  if (zapisove.includes(cesta)) {
    if (req.method !== "POST")
      return posli(res, 405, { error: "Špatná metoda" });
    if (!jePrihlasen(req)) return posli(res, 401, { error: "Nepřihlášen" });

    const telo = await nactiTelo(req);

    if (cesta === "/api/add") {
      const { jmeno, skupina, xp } = telo;
      if (!jmeno || !["mladsi", "starsi"].includes(skupina)) {
        return posli(res, 400, { error: "Chybí jméno nebo skupina" });
      }
      return posli(res, 200, store.pridej(jmeno, skupina, xp));
    }
    if (cesta === "/api/remove") {
      return posli(res, 200, store.odeber(telo.identifier));
    }
    if (cesta === "/api/xp") {
      return posli(res, 200, store.pridejXp(telo.identifier, telo.stena));
    }
    if (cesta === "/api/import") {
      return posli(res, 200, store.nahrad(telo.data));
    }
  }

  return posli(res, 404, { error: "Neznámý endpoint" });
}

function statickySoubor(res, cesta) {
  let relativni = cesta.startsWith(PUBLIC_PREFIX)
    ? cesta.slice(PUBLIC_PREFIX.length)
    : cesta;
  if (relativni === "" || relativni === "/") relativni = "/index.html";

  // ochrana proti ../ únikům mimo build
  const soubor = path.join(BUILD_DIR, path.normalize(relativni));
  if (!soubor.startsWith(BUILD_DIR)) {
    res.writeHead(403).end("Zakázáno");
    return;
  }

  fs.readFile(soubor, (err, obsah) => {
    if (err) {
      // neexistující cesta -> index.html (aplikace si to přebere sama)
      if (relativni !== "/index.html")
        return statickySoubor(res, "/index.html");
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("Build chybí — spusť nejdřív: npm run build");
    }
    res.writeHead(200, {
      "Content-Type": MIME[path.extname(soubor)] || "application/octet-stream",
      "Cache-Control": soubor.includes("static")
        ? "max-age=604800"
        : "no-cache",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "same-origin",
    });
    res.end(obsah);
  });
}

function obsluha(req, res) {
  const cesta = decodeURIComponent(
    new URL(req.url, "https://localhost").pathname,
  );

  if (cesta.startsWith("/api/")) {
    api(req, res, cesta).catch((e) => posli(res, 400, { error: e.message }));
    return;
  }
  statickySoubor(res, cesta);
}

// Kdo napíše adresu bez https://, přistane na HTTP portu a pošle se dál.
// Záměrně se neposílá HSTS — s vlastním certifikátem by pak nešlo odkliknout
// varování prohlížeče.
const presmerovani = http.createServer((req, res) => {
  const host = String(req.headers.host || "").split(":")[0];
  res.writeHead(301, { Location: `https://${host}:${HTTPS_PORT}${req.url}` });
  res.end();
});

// Certifikát se při prvním spuštění vyrobí sám (a znovu, když se změní IP).
async function start() {
  const server = https.createServer(await cert.nacti(), obsluha);

  server.listen(HTTPS_PORT, () => {
    const { ip } = cert.adresy();
    const vSiti = ip.filter((a) => a !== "127.0.0.1");

    console.log("Server žebříčku běží (HTTPS).");
    console.log("  data:    " + store.DATA_FILE);
    console.log("  cert:    " + cert.CERT_FILE);
    console.log("  místně:  https://localhost:" + HTTPS_PORT);
    vSiti.forEach((a) =>
      console.log("  v síti:  https://" + a + ":" + HTTPS_PORT),
    );
    console.log("");
    console.log(
      "  (adresa bez https:// na portu " + HTTP_PORT + " se přesměruje sem)",
    );
    console.log(
      "  Při prvním otevření prohlížeč varuje kvůli vlastnímu certifikátu",
    );
    console.log("  -> Pokročilé / Advanced -> Pokračovat.");

    // QR kód s adresou pro telefon; když balíček chybí, server běží dál
    try {
      require("./qr").vypisVse();
    } catch (e) {
      console.log("  (QR kód se nepodařilo vypsat: " + e.message + ")");
    }
    if (!auth.jeNastaveno()) {
      console.log("");
      console.log(
        "  POZOR: admin heslo není nastavené -> npm run set-password",
      );
    }
  });

  presmerovani.listen(HTTP_PORT);
}

start().catch((e) => {
  console.error("Server se nepodařilo spustit:", e.message);
  process.exit(1);
});
