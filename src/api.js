// Komunikace se serverem žebříčku (server/server.js).
// Data i heslo drží server doma na PC, klient jen posílá požadavky.

// Adresa tunelu se při každém spuštění mění, proto si ji aplikace běžící
// na GitHub Pages přečte ze souboru v repozitáři, který server aktualizuje.
const ADRESA_TUNELU =
  "https://raw.githubusercontent.com/benesj/react_lezeni/main/tunnel-url.json";

const TOKEN_KEY = "adminToken";
const POSLEDNI_ZAKLAD = "posledniAdresaServeru";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const logout = () => localStorage.removeItem(TOKEN_KEY);

const bezLomitka = (url) => String(url).replace(/\/$/, "");

// Kam se ptát:
//  1. REACT_APP_API_URL, když je nastavená (např. v .env.local)
//  2. při vývoji (npm start na portu 3000) HTTPS server na portu 4443
//  3. z GitHub Pages přes tunel, jehož adresu si zjistíme
//  4. jinak stejná adresa, ze které se načetla aplikace (server doma)
async function zjistiZaklad() {
  if (process.env.REACT_APP_API_URL) {
    return bezLomitka(process.env.REACT_APP_API_URL);
  }
  const { hostname, port, origin } = window.location;
  if (port === "3000") return `https://${hostname}:4443`;
  if (!hostname.endsWith("github.io")) return origin;

  try {
    // ?v= obchází cache GitHubu, ať se po restartu tunelu chytne nová adresa
    const res = await fetch(`${ADRESA_TUNELU}?v=${Date.now()}`);
    const { url } = await res.json();
    if (!url) throw new Error("prázdná adresa");
    localStorage.setItem(POSLEDNI_ZAKLAD, bezLomitka(url));
    return bezLomitka(url);
  } catch (e) {
    // když se adresa nepodaří načíst, zkusíme tu, co fungovala naposledy
    const posledni = localStorage.getItem(POSLEDNI_ZAKLAD);
    if (posledni) return posledni;
    throw new Error("Nepodařilo se zjistit adresu serveru.");
  }
}

// Adresa se zjišťuje jednou za načtení stránky.
let zaklad = null;
const dejZaklad = () => (zaklad = zaklad || zjistiZaklad());

async function zavolej(cesta, { method = "GET", body } = {}) {
  const token = getToken();
  const res = await fetch((await dejZaklad()) + cesta, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const odpoved = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) logout(); // vypršel token -> zpátky na přihlášení
    // po restartu serveru může být uložená adresa neplatná, ať se zjistí znovu
    if (res.status === 404 || res.status >= 500) zaklad = null;
    throw new Error(odpoved.error || `Server odpověděl ${res.status}`);
  }
  return odpoved;
}

export const nactiData = () => zavolej("/api/data");

export async function prihlas(password) {
  const { token } = await zavolej("/api/login", {
    method: "POST",
    body: { password },
  });
  localStorage.setItem(TOKEN_KEY, token);
  return token;
}

export const pridejLezce = (jmeno, skupina, xp) =>
  zavolej("/api/add", { method: "POST", body: { jmeno, skupina, xp } });

export const odeberLezce = (identifier) =>
  zavolej("/api/remove", { method: "POST", body: { identifier } });

export const pripisXp = (identifier, stena) =>
  zavolej("/api/xp", { method: "POST", body: { identifier, stena } });

export const importujData = (data) =>
  zavolej("/api/import", { method: "POST", body: { data } });
