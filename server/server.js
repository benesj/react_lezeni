// Server pro sdílená data žebříčku. Běží na tomhle PC, drží data v server/data.json
// a zároveň servíruje hotový build aplikace, takže ostatní v síti otevřou
// http://<ip-tohohle-pc>:4000 a vidí i mění stejná data.
// Nemá žádné npm závislosti — jen standardní Node.
const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");

const store = require("./store");
const auth = require("./auth");

const PORT = Number(process.env.PORT) || 4000;
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
  });
  res.end(data);
};

function nactiTelo(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1e6) reject(new Error("Požadavek je moc velký"));
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

// Jednoduchá brzda na hádání hesla: max 10 pokusů za minutu z jedné adresy.
const pokusy = new Map();
function prilisMnohoPokusu(ip) {
  const ted = Date.now();
  const seznam = (pokusy.get(ip) || []).filter((t) => ted - t < 60_000);
  seznam.push(ted);
  pokusy.set(ip, seznam);
  return seznam.length > 10;
}

async function api(req, res, cesta) {
  if (req.method === "OPTIONS") return posli(res, 204, {});

  if (cesta === "/api/data" && req.method === "GET") {
    return posli(res, 200, store.read());
  }

  if (cesta === "/api/login" && req.method === "POST") {
    if (prilisMnohoPokusu(req.socket.remoteAddress)) {
      return posli(res, 429, { error: "Moc pokusů, zkus to za chvíli." });
    }
    if (!auth.jeNastaveno()) {
      return posli(res, 503, { error: "Heslo není nastavené (npm run set-password)." });
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
    if (req.method !== "POST") return posli(res, 405, { error: "Špatná metoda" });
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
      if (relativni !== "/index.html") return statickySoubor(res, "/index.html");
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("Build chybí — spusť nejdřív: npm run build");
    }
    res.writeHead(200, {
      "Content-Type": MIME[path.extname(soubor)] || "application/octet-stream",
      "Cache-Control": soubor.includes("static") ? "max-age=604800" : "no-cache",
    });
    res.end(obsah);
  });
}

const server = http.createServer((req, res) => {
  const cesta = decodeURIComponent(new URL(req.url, "http://localhost").pathname);

  if (cesta.startsWith("/api/")) {
    api(req, res, cesta).catch((e) => posli(res, 400, { error: e.message }));
    return;
  }
  statickySoubor(res, cesta);
});

server.listen(PORT, () => {
  const adresy = Object.values(os.networkInterfaces())
    .flat()
    .filter((i) => i.family === "IPv4" && !i.internal)
    .map((i) => i.address);

  console.log("Server žebříčku běží.");
  console.log("  data:    " + store.DATA_FILE);
  console.log("  místně:  http://localhost:" + PORT);
  adresy.forEach((a) => console.log("  v síti:  http://" + a + ":" + PORT));
  if (!auth.jeNastaveno()) {
    console.log("\n  POZOR: admin heslo není nastavené -> npm run set-password");
  }
});
