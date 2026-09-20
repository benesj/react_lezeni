import React from "react";

// Medaile pro první tři místa a brambora pro čtvrté. Kreslí se jako SVG
// přímo v kódu, takže nepotřebují žádné obrázkové soubory.
const BARVY = {
  zlata: { kov: "#ffd700", stin: "#c9a400", stuha: "#d32f2f" },
  stribrna: { kov: "#d9d9d9", stin: "#9e9e9e", stuha: "#1976d2" },
  bronzova: { kov: "#cd7f32", stin: "#8d5524", stuha: "#388e3c" },
};

export function Medaile({ typ, cislo }) {
  const b = BARVY[typ] || BARVY.zlata;
  return (
    <svg className="medaile" viewBox="0 0 40 52" aria-label={`${typ} medaile`}>
      {/* stuha */}
      <polygon points="12,0 20,16 28,0 34,0 22,22 18,22 6,0" fill={b.stuha} />
      <polygon points="17,0 20,8 23,0" fill="#000" opacity="0.25" />
      {/* kotouč */}
      <circle cx="20" cy="34" r="16" fill={b.stin} />
      <circle cx="20" cy="33" r="14" fill={b.kov} />
      <circle cx="20" cy="33" r="10" fill="none" stroke={b.stin} strokeWidth="1.5" />
      <ellipse cx="15" cy="27" rx="4" ry="2.5" fill="#fff" opacity="0.5" />
      <text
        x="20"
        y="38"
        textAnchor="middle"
        fontSize="13"
        fontWeight="bold"
        fill={b.stin}
        fontFamily="Arial, sans-serif"
      >
        {cislo}
      </text>
    </svg>
  );
}

export function Brambora() {
  return (
    <svg className="medaile" viewBox="0 0 40 52" aria-label="brambora">
      <ellipse cx="20" cy="32" rx="16" ry="12" fill="#a0703c" transform="rotate(-18 20 32)" />
      <ellipse cx="20" cy="31" rx="14" ry="10" fill="#c4915a" transform="rotate(-18 20 31)" />
      <ellipse cx="14" cy="27" rx="4" ry="2" fill="#e0b47f" opacity="0.7" transform="rotate(-18 14 27)" />
      {/* očka brambory */}
      <circle cx="13" cy="33" r="1.4" fill="#6b4423" />
      <circle cx="22" cy="37" r="1.4" fill="#6b4423" />
      <circle cx="27" cy="28" r="1.2" fill="#6b4423" />
      <circle cx="18" cy="26" r="1" fill="#6b4423" />
      <text
        x="20"
        y="12"
        textAnchor="middle"
        fontSize="10"
        fill="#c4915a"
        fontFamily="Arial, sans-serif"
      >
        4.
      </text>
    </svg>
  );
}

// Ikona podle umístění (index od nuly); od pátého místa nic.
export function Umisteni({ index }) {
  if (index === 0) return <Medaile typ="zlata" cislo="1" />;
  if (index === 1) return <Medaile typ="stribrna" cislo="2" />;
  if (index === 2) return <Medaile typ="bronzova" cislo="3" />;
  if (index === 3) return <Brambora />;
  return null;
}
