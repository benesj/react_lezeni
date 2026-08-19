// Komunikace se serverem žebříčku (server/server.js).
// Data i heslo drží server doma na PC, klient jen posílá požadavky.
//
// Dvě úrovně oprávnění:
//  - změny bodů a členů smí kdokoli, ale jen u skupiny, která je odemčená
//    (příznak drží server u dat, takže přežije i restart)
//  - odemykání/zamykání a zakládání skupin je za heslem (token z /api/login)

// Server doma je z internetu dostupný na trvalé adrese přes Tailscale Funnel
// (na PC zapnuto příkazem `tailscale funnel`). Adresa se nemění, takže ji verze
// běžící na GitHub Pages může mít napevno.
const ADRESA_SERVERU = "https://laptop-1m8hk6du.tailb66ab5.ts.net";

const TOKEN_KEY = "adminToken";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const logout = () => localStorage.removeItem(TOKEN_KEY);

const bezLomitka = (url) => String(url).replace(/\/$/, "");

// Kam se ptát:
//  1. REACT_APP_API_URL, když je nastavená (např. v .env.local)
//  2. při vývoji (npm start na portu 3000) HTTPS server na portu 4443
//  3. z GitHub Pages na trvalou adresu domácího serveru
//  4. jinak stejná adresa, ze které se aplikace načetla (běží přímo ze serveru)
function zjistiZaklad() {
  if (process.env.REACT_APP_API_URL) {
    return bezLomitka(process.env.REACT_APP_API_URL);
  }
  const { hostname, port, origin } = window.location;
  if (port === "3000") return `https://${hostname}:4443`;
  if (hostname.endsWith("github.io")) return ADRESA_SERVERU;
  return origin;
}

const zaklad = zjistiZaklad();

async function zavolej(cesta, { method = "GET", body } = {}) {
  const token = getToken();
  const res = await fetch(zaklad + cesta, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const odpoved = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) logout(); // vypršel token -> zpátky na heslo
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

// --- změny dat: jen u odemčené skupiny, heslo netřeba ---

export const pridejLezce = (id, jmeno, kategorie, xp) =>
  zavolej("/api/add", { method: "POST", body: { id, jmeno, kategorie, xp } });

export const odeberLezce = (id, identifier) =>
  zavolej("/api/remove", { method: "POST", body: { id, identifier } });

export const pripisXp = (id, identifier, stena) =>
  zavolej("/api/xp", { method: "POST", body: { id, identifier, stena } });

// --- správcovské akce: potřebují heslo ---

export const nastavZamek = (id, odemceno) =>
  zavolej("/api/zamek", { method: "POST", body: { id, odemceno } });

export const pridejSkupinu = (nazev) =>
  zavolej("/api/skupina", { method: "POST", body: { nazev } });

export const smazSkupinu = (id) =>
  zavolej("/api/skupina/smaz", { method: "POST", body: { id } });

export const importujData = (id, data) =>
  zavolej("/api/import", { method: "POST", body: { id, data } });
