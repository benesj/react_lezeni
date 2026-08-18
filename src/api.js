// Komunikace se serverem žebříčku (server/server.js).
// Data i heslo drží server, klient jen posílá požadavky.

// Kam se ptát:
//  1. REACT_APP_API_URL, když je nastavená (např. v .env.local)
//  2. při vývoji (npm start na portu 3000) HTTPS server na portu 4443
//  3. jinak stejná adresa, ze které se načetla aplikace
function zjistiZaklad() {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL.replace(/\/$/, "");
  }
  const { hostname, port, origin } = window.location;
  if (port === "3000") return `https://${hostname}:4443`;
  return origin;
}

const ZAKLAD = zjistiZaklad();
const TOKEN_KEY = "adminToken";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const logout = () => localStorage.removeItem(TOKEN_KEY);

async function zavolej(cesta, { method = "GET", body } = {}) {
  const token = getToken();
  const res = await fetch(ZAKLAD + cesta, {
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
