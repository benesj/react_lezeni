// Certifikát pro HTTPS. Vyrobí si ho server sám při prvním spuštění a uloží
// do server/cert/. Je vystavený na vlastní jméno (self-signed), takže prohlížeč
// při prvním otevření varuje — po odkliknutí je spojení normálně šifrované.
const fs = require("fs");
const path = require("path");
const os = require("os");
const selfsigned = require("selfsigned");

const CERT_DIR = path.join(__dirname, "cert");
const KEY_FILE = path.join(CERT_DIR, "key.pem");
const CERT_FILE = path.join(CERT_DIR, "cert.pem");
const META_FILE = path.join(CERT_DIR, "meta.json");

const PLATNOST_DNI = 825;

// Certifikát musí obsahovat všechny adresy, pod kterými se server dá otevřít,
// jinak ho prohlížeč odmítne i po odkliknutí varování.
function adresy() {
  const ip = Object.values(os.networkInterfaces())
    .flat()
    .filter((i) => i.family === "IPv4" && !i.internal)
    .map((i) => i.address);
  return { hostname: os.hostname(), ip: ["127.0.0.1", ...ip] };
}

async function vygeneruj(kam) {
  const { hostname, ip } = kam;
  const altNames = [
    { type: 2, value: "localhost" },
    { type: 2, value: hostname },
    ...ip.map((address) => ({ type: 7, ip: address })),
  ];

  const vysledek = await selfsigned.generate(
    [{ name: "commonName", value: hostname }],
    {
      days: PLATNOST_DNI,
      keySize: 2048,
      algorithm: "sha256",
      extensions: [
        { name: "basicConstraints", cA: false },
        { name: "keyUsage", digitalSignature: true, keyEncipherment: true },
        { name: "extKeyUsage", serverAuth: true },
        { name: "subjectAltName", altNames },
      ],
    },
  );

  fs.mkdirSync(CERT_DIR, { recursive: true });
  fs.writeFileSync(KEY_FILE, vysledek.private, "utf8");
  fs.writeFileSync(CERT_FILE, vysledek.cert, "utf8");
  fs.writeFileSync(META_FILE, JSON.stringify(kam, null, 2), "utf8");
  return vysledek;
}

// Nový certifikát je potřeba, když ještě žádný není, když se změnily IP adresy
// (jiná síť) nebo když se blíží konec platnosti.
function jePotreba(kam) {
  if (!fs.existsSync(KEY_FILE) || !fs.existsSync(CERT_FILE)) return "chybí";
  try {
    const stara = JSON.parse(fs.readFileSync(META_FILE, "utf8"));
    const stejne =
      stara.hostname === kam.hostname &&
      stara.ip.length === kam.ip.length &&
      stara.ip.every((a) => kam.ip.includes(a));
    if (!stejne) return "změnila se IP adresa";
  } catch {
    return "chybí popis";
  }
  const stari = (Date.now() - fs.statSync(CERT_FILE).mtimeMs) / 86400000;
  if (stari > PLATNOST_DNI - 30) return "blíží se konec platnosti";
  return null;
}

async function nacti() {
  const kam = adresy();
  const duvod = jePotreba(kam);
  if (duvod) {
    console.log("Generuji nový certifikát (" + duvod + ")...");
    await vygeneruj(kam);
  }
  return {
    key: fs.readFileSync(KEY_FILE),
    cert: fs.readFileSync(CERT_FILE),
  };
}

module.exports = { nacti, adresy, CERT_DIR, CERT_FILE };
