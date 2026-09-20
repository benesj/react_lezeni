// Zvuky a fáborky k zápisu bodů. Zvuky se skládají přímo ve Web Audio API,
// takže není potřeba žádný soubor a hrají i z GitHub Pages bez stahování.
// Prohlížeč pustí zvuk až po klepnutí uživatele — všechny efekty se volají
// z obsluhy tlačítka, takže to sedí.
import confetti from "canvas-confetti";

let ctx = null;
function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

// Jeden tón: typ vlny, frekvence, začátek a délka (v sekundách od teď).
function ton(ac, { typ = "square", f, od = 0, delka = 0.12, hlasitost = 0.15, doF }) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = typ;
  const t = ac.currentTime + od;
  osc.frequency.setValueAtTime(f, t);
  if (doF) osc.frequency.exponentialRampToValueAtTime(doF, t + delka);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(hlasitost, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + delka);
  osc.connect(gain).connect(ac.destination);
  osc.start(t);
  osc.stop(t + delka + 0.02);
}

// Krátký šum (na „zásah“ a na jiskření).
function sum(ac, { od = 0, delka = 0.15, hlasitost = 0.2, filtr = 800 }) {
  const buffer = ac.createBuffer(1, ac.sampleRate * delka, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const lp = ac.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = filtr;
  const gain = ac.createGain();
  const t = ac.currentTime + od;
  gain.gain.setValueAtTime(hlasitost, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + delka);
  src.connect(lp).connect(gain).connect(ac.destination);
  src.start(t);
}

// Body přibyly: veselý stoupající akord.
export function zvukBody() {
  const ac = audio();
  if (!ac) return;
  [523, 659, 784, 1047].forEach((f, i) =>
    ton(ac, { typ: "triangle", f, od: i * 0.07, delka: 0.18, hlasitost: 0.18 })
  );
}

// Body ubyly: „au“ jako v Minecraftu — tupý úder a klesající tón.
export function zvukUbrano() {
  const ac = audio();
  if (!ac) return;
  sum(ac, { delka: 0.18, hlasitost: 0.35, filtr: 500 });
  ton(ac, { typ: "square", f: 320, doF: 90, delka: 0.28, hlasitost: 0.2 });
  ton(ac, { typ: "sawtooth", f: 160, doF: 60, delka: 0.3, hlasitost: 0.12 });
}

// Přeskočení někoho v žebříčku: fanfára + jiskření.
export function zvukPreskoceni() {
  const ac = audio();
  if (!ac) return;
  const melodie = [
    [523, 0, 0.1],
    [659, 0.1, 0.1],
    [784, 0.2, 0.1],
    [1047, 0.3, 0.25],
    [784, 0.55, 0.08],
    [1047, 0.63, 0.08],
    [1319, 0.71, 0.45],
  ];
  melodie.forEach(([f, od, delka]) => {
    ton(ac, { typ: "square", f, od, delka, hlasitost: 0.14 });
    ton(ac, { typ: "triangle", f: f / 2, od, delka, hlasitost: 0.12 });
  });
  // závěrečný akord
  [1319, 1568, 2093].forEach((f) =>
    ton(ac, { typ: "triangle", f, od: 0.75, delka: 0.7, hlasitost: 0.1 })
  );
  for (let i = 0; i < 6; i++) {
    sum(ac, { od: 0.7 + i * 0.09, delka: 0.08, hlasitost: 0.06, filtr: 6000 });
  }
}

// Fáborky k přidaným bodům — jedna sprška zezdola.
export function konfetyBody() {
  confetti({
    particleCount: 90,
    spread: 70,
    startVelocity: 45,
    origin: { x: 0.5, y: 0.9 },
    colors: ["#f57c00", "#ffd700", "#2ecc71", "#3498db", "#ffffff"],
  });
}

// Přeskočení: velká show — spršky z obou stran, hvězdy, asi dvě sekundy.
export function konfetyPreskoceni() {
  const konec = Date.now() + 1800;
  const barvy = ["#ffd700", "#ff4081", "#00e5ff", "#76ff03", "#ffffff"];
  const davka = () => {
    confetti({
      particleCount: 40,
      angle: 60,
      spread: 60,
      startVelocity: 60,
      origin: { x: 0, y: 0.7 },
      colors: barvy,
    });
    confetti({
      particleCount: 40,
      angle: 120,
      spread: 60,
      startVelocity: 60,
      origin: { x: 1, y: 0.7 },
      colors: barvy,
    });
    if (Date.now() < konec) setTimeout(davka, 180);
  };
  davka();
  confetti({
    particleCount: 60,
    spread: 360,
    startVelocity: 35,
    gravity: 0.6,
    scalar: 1.6,
    shapes: ["star"],
    origin: { x: 0.5, y: 0.4 },
    colors: ["#ffd700", "#fff59d"],
  });
}
