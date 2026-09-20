import React from "react";

// Odznaky (achievementy) lezců. Seznam je napevno — stejná id drží server
// (server/store.js, ODZNAKY). Nový odznak = přidat sem obrázek a id na server.
// Správce je u lezce zaškrtává, ostatní vidí malé obrázky nad jménem.
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
  // smotané lano — kotouč závitů
  lano: (
    <g fill="none" stroke="#e0a458" strokeWidth="2.2" strokeLinecap="round">
      <ellipse cx="16" cy="17" rx="11" ry="8" />
      <ellipse cx="16" cy="17" rx="7.5" ry="5" />
      <ellipse cx="16" cy="17" rx="4" ry="2.4" />
      <path d="M8 11 q3 -5 8 -3 q5 2 8 -1" stroke="#c9843a" />
      <path d="M12 8 l2 4 M18 7 l-1 5" />
    </g>
  ),
  // dvojitá osma — uzel s dvěma oky a smyčkou
  osma: (
    <g fill="none" stroke="#5aa9e6" strokeWidth="2.6" strokeLinecap="round">
      <path d="M16 3 v5" />
      <path d="M16 8 c-6 0 -8 3 -6 6 c2 3 10 3 12 0 c2 -3 0 -6 -6 -6 z" />
      <path d="M16 14 c-6 0 -8 3 -6 6 c2 3 10 3 12 0 c2 -3 0 -6 -6 -6 z" />
      <path d="M12 21 c-1 4 1 7 4 8 c3 -1 5 -4 4 -8" stroke="#3d7fb8" />
    </g>
  ),
  // expreska — dvě karabiny spojené popruhem
  expreska: (
    <g fill="none" stroke="#c0c0c0" strokeWidth="2.4" strokeLinecap="round">
      <path d="M11 3 h6 a3 3 0 0 1 3 3 v4 a3 3 0 0 1 -3 3 h-6 a3 3 0 0 1 -3 -3 v-4 a3 3 0 0 1 3 -3 z" />
      <path d="M11 19 h6 a3 3 0 0 1 3 3 v4 a3 3 0 0 1 -3 3 h-6 a3 3 0 0 1 -3 -3 v-4 a3 3 0 0 1 3 -3 z" />
      <path d="M13 13 v6 M19 13 v6" stroke="#e53935" strokeWidth="3.5" />
      <path d="M8 8 l2 -3" stroke="#888" />
    </g>
  ),
  // jistítko „kyblík“ — tuba s drátěným okem
  kyblik: (
    <g fill="none" stroke="#9c6ade" strokeWidth="2.4" strokeLinecap="round">
      <path d="M8 6 h16 l-2 15 h-12 z" fill="#4a2d7a" fillOpacity="0.45" />
      <path d="M12 6 v15 M20 6 v15" strokeWidth="1.5" />
      <path d="M12 21 q4 8 8 0" stroke="#bbb" strokeWidth="1.8" />
      <path d="M11 3 h10" />
    </g>
  ),
  // žíněnka — tlustá modrá matrace
  zinenka: (
    <g fill="none" stroke="#2f6fd6" strokeWidth="2.4" strokeLinecap="round">
      <rect x="3" y="12" width="26" height="12" rx="3" fill="#1f4fa3" fillOpacity="0.6" />
      <path d="M3 18 h26" stroke="#7fb0ff" strokeWidth="1.5" />
      <path d="M11 12 v12 M21 12 v12" stroke="#7fb0ff" strokeWidth="1.5" />
    </g>
  ),
};

export function Odznak({ id, maly = false }) {
  const ikona = IKONY[id];
  if (!ikona) return null;
  return (
    <svg
      className={`odznak ${maly ? "maly" : ""}`}
      viewBox="0 0 32 32"
      role="img"
      aria-label={nazevOdznaku(id)}
    >
      <title>{nazevOdznaku(id)}</title>
      <circle cx="16" cy="16" r="15" fill="#1c1c1c" stroke="#444" />
      {ikona}
    </svg>
  );
}
