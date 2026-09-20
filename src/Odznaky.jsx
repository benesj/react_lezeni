import React from "react";

// Odznaky (achievementy) lezců. Seznam je napevno — stejná id drží server
// (server/store.js, ODZNAKY). Nový odznak = přidat sem obrázek a id na server.
// Správce je u lezce zaškrtává, ostatní vidí malé obrázky nad jménem.
//
// Každá ikona má vlastní kreslicí plochu (`plocha` = šířka, výška), do kruhu
// 100×100 se vycentruje a zmenší tak, aby delší strana měla 80.
export const ODZNAKY = [
  { id: "lano", nazev: "Smotané lano" },
  { id: "osma", nazev: "Dvojitá osma" },
  { id: "expreska", nazev: "Expreska" },
  { id: "kyblik", nazev: "Jistítko „kyblík“" },
  { id: "zinenka", nazev: "Žíněnka" },
];

export const nazevOdznaku = (id) =>
  ODZNAKY.find((o) => o.id === id)?.nazev || id;

const IKONY = {
  // lano v panence: závěsné očko, omotaná hlava, dvě dlouhé visící smyčky
  lano: {
    plocha: [80, 100],
    kresba: (
      <g
        fill="none"
        stroke="#e8407a"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="4"
      >
        <path d="M40 4 C34 4 34 12 40 12 C46 12 46 4 40 4 Z" strokeWidth="3.5" />
        <path d="M28 40 C24 30 26 16 34 12 C40 9 46 9 52 12 C60 16 62 30 56 40" />
        <path d="M33 38 C30 30 31 20 36 16 C41 13 47 15 48 22 C49 30 48 36 46 40" />
        <path d="M23 34 H61 M22 40 H62 M23 46 H61" />
        <path d="M28 48 C26 62 25 78 28 88 C29 94 37 94 38 88 C40 78 39 62 37 48" />
        <path d="M33 48 C31 62 31 78 33 86" />
        <path d="M46 48 C44 62 44 80 47 90 C48 96 56 96 57 90 C59 80 58 62 56 48" />
        <path d="M51 48 C50 62 50 80 52 88" />
      </g>
    ),
  },
  // osma: ležatý uzel s konci lana vlevo a vpravo
  osma: {
    plocha: [100, 92],
    kresba: (
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path
          d="M3 60 C12 60 18 56 24 48 C26 30 50 28 50 46 C50 64 26 62 26 46 C26 30 50 24 50 46 C50 66 76 66 76 46 C76 26 52 30 50 46 C48 60 72 62 76 48 C80 40 88 36 97 32"
          stroke="#d9714f"
          strokeWidth="8"
        />
      </g>
    ),
  },
  // expreska: šedá karabina nahoře, modrý popruh, modrá karabina dole
  expreska: {
    plocha: [80, 100],
    kresba: (
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path
          d="M38 6 C30 6 27 12 28 20 L30 32 C31 38 35 40 40 40 L48 40 C54 40 56 36 55 30 L52 14 C51 8 46 6 38 6 Z"
          stroke="#7a7a7a"
          strokeWidth="5"
        />
        <path d="M52 16 L55 30" stroke="#a8a8a8" strokeWidth="4" />
        <path d="M35 36 L48 36 L46 62 L37 62 Z" fill="#2f6fd6" stroke="#1f4fa3" strokeWidth="1" />
        <path
          d="M38 40 H45 M38 44 H45 M38 48 H45 M38 52 H45 M38 56 H45"
          stroke="#cfe0ff"
          strokeWidth="1.5"
        />
        <rect x="35" y="58" width="12" height="6" fill="#e53935" />
        <path
          d="M34 62 C28 62 25 66 26 72 L28 82 C29 88 33 92 40 92 L48 92 C54 92 56 88 55 82 L53 70 C52 64 48 62 42 62 Z"
          stroke="#2f6fd6"
          strokeWidth="5"
        />
        <path d="M28 72 C27 80 30 86 36 90" stroke="#7fb0ff" strokeWidth="4" />
      </g>
    ),
  },
  // jistítko „kyblík“: zakulacená tuba s dvěma otvory a drátěným okem
  kyblik: {
    plocha: [100, 100],
    kresba: (
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path
          d="M32 22 C32 16 38 14 50 14 C62 14 68 16 68 22 L66 60 C66 70 58 74 50 74 C42 74 34 70 34 60 Z"
          fill="#6a3fb5"
          stroke="#3f2478"
          strokeWidth="3"
        />
        <path d="M34 30 C40 26 60 26 66 30" stroke="#3f2478" strokeWidth="3" />
        <rect x="36" y="34" width="11" height="30" rx="5.5" fill="#1c1c1c" stroke="#3f2478" strokeWidth="2" />
        <rect x="53" y="34" width="11" height="30" rx="5.5" fill="#1c1c1c" stroke="#3f2478" strokeWidth="2" />
        <path d="M38 74 C36 90 64 90 62 74" stroke="#c0c0c0" strokeWidth="3" />
        <path d="M44 16 C44 8 56 8 56 16" stroke="#c0c0c0" strokeWidth="3" />
      </g>
    ),
  },
  // žíněnka: tlustý modrý kvádr v perspektivě
  zinenka: {
    plocha: [100, 100],
    kresba: (
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 60 L36 42 H88 L66 60 Z" fill="#4a86e8" stroke="#1f4fa3" strokeWidth="2" />
        <path d="M14 60 H66 V78 H14 Z" fill="#2f6fd6" stroke="#1f4fa3" strokeWidth="2" />
        <path d="M66 60 L88 42 V60 L66 78 Z" fill="#1f4fa3" stroke="#1f4fa3" strokeWidth="2" />
      </g>
    ),
  },
};

export function Odznak({ id, maly = false }) {
  const ikona = IKONY[id];
  if (!ikona) return null;
  const [w, h] = ikona.plocha;
  const s = 80 / Math.max(w, h);
  const tx = (100 - w * s) / 2;
  const ty = (100 - h * s) / 2;
  return (
    <svg
      className={`odznak ${maly ? "maly" : ""}`}
      viewBox="0 0 100 100"
      role="img"
      aria-label={nazevOdznaku(id)}
    >
      <title>{nazevOdznaku(id)}</title>
      <circle cx="50" cy="50" r="48" fill="#1c1c1c" stroke="#444" />
      <g transform={`translate(${tx} ${ty}) scale(${s})`}>{ikona.kresba}</g>
    </svg>
  );
}
