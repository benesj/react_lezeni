// Vypíše QR kód s adresou serveru — naskenovat fotoaparátem telefonu.
// Samostatně:  npm run qr
const os = require("os");
const qrcode = require("qrcode-terminal");

const HTTPS_PORT = Number(process.env.HTTPS_PORT) || 4443;

// Zajímají nás jen adresy z běžné domácí sítě. Adaptéry typu VPN
// (maska 255.255.255.255) telefonu na wifi stejně k ničemu nejsou.
function adresyVSiti() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter(
      (i) =>
        i.family === "IPv4" && !i.internal && i.netmask !== "255.255.255.255"
    )
    .map((i) => i.address);
}

function vypis(adresa) {
  const url = `https://${adresa}:${HTTPS_PORT}`;
  console.log("");
  console.log("  " + url);
  qrcode.generate(url, { small: true });
}

function vypisVse() {
  const adresy = adresyVSiti();
  if (!adresy.length) {
    console.log("Počítač není v žádné síti — QR kód nemá kam ukazovat.");
    return;
  }
  adresy.forEach(vypis);
  console.log("  Naskenovat fotoaparátem telefonu (musí být na stejné wifi).");
  console.log("  Napoprvé prohlížeč varuje kvůli certifikátu -> Pokročilé -> Pokračovat.");
  console.log("");
}

module.exports = { vypisVse, adresyVSiti };

if (require.main === module) vypisVse();
