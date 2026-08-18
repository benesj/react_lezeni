// Ověřování admin hesla. Heslo se nikde neukládá v čitelné podobě —
// v auth.json je jen scrypt hash + náhodná sůl, a auth.json není v gitu
// ani v buildu aplikace, takže se do prohlížeče nikdy nedostane.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const AUTH_FILE = path.join(__dirname, "auth.json");
const PLATNOST_TOKENU_MS = 12 * 60 * 60 * 1000; // 12 hodin

const KEYLEN = 64;
const SCRYPT_OPTS = { N: 16384, r: 8, p: 1 };

function hash(heslo, salt) {
  return crypto.scryptSync(heslo, salt, KEYLEN, SCRYPT_OPTS).toString("hex");
}

function ulozHeslo(heslo) {
  const salt = crypto.randomBytes(16).toString("hex");
  fs.writeFileSync(
    AUTH_FILE,
    JSON.stringify({ salt, hash: hash(heslo, salt) }, null, 2),
    "utf8"
  );
}

function overHeslo(heslo) {
  let ulozene;
  try {
    ulozene = JSON.parse(fs.readFileSync(AUTH_FILE, "utf8"));
  } catch {
    return false;
  }
  const a = Buffer.from(hash(String(heslo), ulozene.salt), "hex");
  const b = Buffer.from(ulozene.hash, "hex");
  // timingSafeEqual, aby se heslo nedalo uhádnout měřením času odpovědi
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const jeNastaveno = () => fs.existsSync(AUTH_FILE);

// Tokeny žijí jen v paměti — restart serveru všechny odhlásí.
const tokeny = new Map();

function vytvorToken() {
  const token = crypto.randomBytes(24).toString("hex");
  tokeny.set(token, Date.now() + PLATNOST_TOKENU_MS);
  return token;
}

function jePlatny(token) {
  const expirace = tokeny.get(token);
  if (!expirace) return false;
  if (expirace < Date.now()) {
    tokeny.delete(token);
    return false;
  }
  return true;
}

module.exports = { ulozHeslo, overHeslo, jeNastaveno, vytvorToken, jePlatny, AUTH_FILE };
