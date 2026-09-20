// Komunikace se serverem žebříčku (server/server.js).
// Data i heslo drží server doma na PC, klient jen posílá požadavky.
//
// Oprávnění řídí režim skupiny (nastavuje ho správce heslem):
//  - zamceno: jen prohlížení
//  - body:    kdokoli smí lezcům body přidávat (ne odebírat)
//  - správce (heslo, token jen v tomhle prohlížeči): body i odebírat, členové,
//    kategorie, režim, skupiny, import — bez ohledu na režim skupiny
//  - přepínání režimu a zakládání/mazání skupin je za heslem (token z /api/login)

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

// --- změny žebříčku: podle režimu skupiny, heslo netřeba ---

export const pridejLezce = (id, jmeno, kategorie, xp) =>
  zavolej("/api/add", { method: "POST", body: { id, jmeno, kategorie, xp } });

export const odeberLezce = (id, identifier) =>
  zavolej("/api/remove", { method: "POST", body: { id, identifier } });

export const pripisXp = (id, identifier, stena) =>
  zavolej("/api/xp", { method: "POST", body: { id, identifier, stena } });

export const pridejKategorii = (id, nazev) =>
  zavolej("/api/kategorie", { method: "POST", body: { id, nazev } });

export const smazKategorii = (id, kategorie) =>
  zavolej("/api/kategorie/smaz", { method: "POST", body: { id, kategorie } });

// --- správcovské akce: potřebují heslo ---

export const nastavOdznak = (id, identifier, odznak, ma) =>
  zavolej("/api/odznak", {
    method: "POST",
    body: { id, identifier, odznak, ma },
  });

export const nastavRezim = (id, rezim) =>
  zavolej("/api/zamek", { method: "POST", body: { id, rezim } });

export const pridejSkupinu = (nazev) =>
  zavolej("/api/skupina", { method: "POST", body: { nazev } });

export const smazSkupinu = (id) =>
  zavolej("/api/skupina/smaz", { method: "POST", body: { id } });

export const importujData = (id, data) =>
  zavolej("/api/import", { method: "POST", body: { id, data } });
