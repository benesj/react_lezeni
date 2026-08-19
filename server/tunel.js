// Vystaví domácí server na veřejnou https adresu přes Cloudflare Tunnel,
// aby žebříček fungoval i mimo domácí wifi a bez varování o certifikátu.
//
// Adresa se při každém spuštění mění, proto se zapíše do tunnel-url.json
// a pošle na GitHub — aplikace na GitHub Pages si ji odtamtud přečte.
const { spawn, execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const KOREN = path.join(__dirname, "..");
const SOUBOR_ADRESY = path.join(KOREN, "tunnel-url.json");
const HTTPS_PORT = Number(process.env.HTTPS_PORT) || 4443;

function najdiCloudflared() {
  const kandidati = [
    path.join(process.env["ProgramFiles"] || "", "cloudflared", "cloudflared.exe"),
    path.join(process.env["ProgramFiles(x86)"] || "", "cloudflared", "cloudflared.exe"),
    "cloudflared",
  ];
  return kandidati.find((c) => c === "cloudflared" || fs.existsSync(c));
}

// Adresa se pošle na GitHub, aby ji našla aplikace na GitHub Pages.
function zverejni(url) {
  const obsah = { url, aktualizovano: new Date().toISOString() };

  let stara = null;
  try {
    stara = JSON.parse(fs.readFileSync(SOUBOR_ADRESY, "utf8")).url;
  } catch {
    /* soubor ještě není */
  }
  if (stara === url) {
    console.log("Adresa se nezměnila, není co posílat.");
    return;
  }

  fs.writeFileSync(SOUBOR_ADRESY, JSON.stringify(obsah, null, 2) + "\n", "utf8");

  try {
    const git = (...args) =>
      execFileSync("git", args, { cwd: KOREN, encoding: "utf8" });
    git("add", "tunnel-url.json");
    git("commit", "-m", "Aktuální adresa tunelu");
    git("push", "origin", "HEAD:main");
    console.log("Adresa poslána na GitHub.");
  } catch (e) {
    console.log("Adresu se nepodařilo poslat na GitHub: " + e.message);
    console.log("Aplikace na GitHub Pages tak bude mít starou adresu.");
  }
}

function spust() {
  const cloudflared = najdiCloudflared();
  if (!cloudflared) {
    console.log("cloudflared není nainstalovaný — tunel se nespustí.");
    console.log("Instalace: winget install Cloudflare.cloudflared");
    return null;
  }

  const proces = spawn(
    cloudflared,
    [
      "tunnel",
      "--url",
      "https://localhost:" + HTTPS_PORT,
      // server má vlastní certifikát, cloudflared ho nemá proč ověřovat
      "--no-tls-verify",
    ],
    { windowsHide: true }
  );

  let nalezeno = false;
  const hledejAdresu = (data) => {
    const text = String(data);
    const shoda = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
    if (shoda && !nalezeno) {
      nalezeno = true;
      console.log("");
      console.log("  Veřejná adresa: " + shoda[0]);
      zverejni(shoda[0]);
    }
  };

  proces.stdout.on("data", hledejAdresu);
  proces.stderr.on("data", hledejAdresu); // cloudflared píše adresu do stderr
  proces.on("exit", (kod) => console.log("Tunel skončil (kód " + kod + ")."));

  return proces;
}

module.exports = { spust };

if (require.main === module) spust();
