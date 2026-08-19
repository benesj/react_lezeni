// Komunikace se serverem žebříčku (server/server.js).
// Data i heslo drží server doma na PC, klient jen posílá požadavky.

// Server doma je z internetu dostupný na trvalé adrese přes Tailscale Funnel
// (na PC zapnuto příkazem `tailscale funnel`). Adresa se nemění, takže ji verze
// běžící na GitHub Pages může mít napevno — dřív se kvůli měnící se adrese
// Cloudflare tunelu musela číst ze souboru v repozitáři.
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
    if (res.status === 401) logout(); // vypršel token -> zpátky na přihlášení
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
