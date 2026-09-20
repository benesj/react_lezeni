import React, { useContext, useEffect, useRef, useState } from "react";
import { AppContext } from "./AppProvider";
import {
  getToken,
  logout,
  prihlas,
  pridejLezce,
  odeberLezce,
  pripisXp,
  pridejKategorii,
  smazKategorii,
  nastavRezim,
  pridejSkupinu,
  smazSkupinu,
} from "./api";
import {
  zvukBody,
  zvukUbrano,
  zvukPreskoceni,
  konfetyBody,
  konfetyPreskoceni,
} from "./efekty";
import { Umisteni } from "./Medaile";
import "./App.css";

// Režimy zámku skupiny — stejné hodnoty drží server.
const REZIMY = [
  { id: "zamceno", ikona: "🔒", nazev: "zamčeno", popis: "jen prohlížení" },
  { id: "body", ikona: "🧗", nazev: "body", popis: "body jde jen přidávat" },
  { id: "admin", ikona: "🔓", nazev: "admin", popis: "vše: body ±, členové, kategorie" },
];
const rezimInfo = (id) => REZIMY.find((r) => r.id === id) || REZIMY[0];

// ✅ Pomocné validace
// Celé číslo, klidně záporné — mínusem se dají body i odebrat (jen v admin).
function isNumberOk(number, { jenPlus = false } = {}) {
  const text = String(number ?? "").trim();
  if (jenPlus) return /^\d+$/.test(text) && Number(text) > 0;
  return /^-?\d+$/.test(text);
}

// Telefonní klávesnice mínus nenabízí, proto tlačítko ±.
function prehodZnamenko(hodnota) {
  const text = String(hodnota ?? "").trim();
  if (text.startsWith("-")) return text.slice(1);
  return text ? "-" + text : "-";
}

const cisloZeJmena = (jmeno) => {
  const match = String(jmeno).match(/\((\d+)\)$/);
  return match ? parseInt(match[1], 10) : null;
};

// Najde lezce ve skupině podle celého jména nebo pořadového čísla.
// Vrací { kategorie, lezec } nebo null.
function najdiLezce(skupina, text) {
  const hledany = String(text ?? "").trim();
  const cislo = /^\d+$/.test(hledany)
    ? parseInt(hledany, 10)
    : cisloZeJmena(hledany);
  for (const kategorie of skupina?.kategorie || []) {
    const lezec = kategorie.lezci.find(
      (e) =>
        e.jmeno === hledany ||
        (cislo !== null && cisloZeJmena(e.jmeno) === cislo)
    );
    if (lezec) return { kategorie, lezec };
  }
  return null;
}

const isTextOk = (text, skupina) => !!najdiLezce(skupina, text);

const serad = (lezci) => [...lezci].sort((a, b) => b.xp - a.xp);

// Pořadí lezce v jeho kategorii (0 = první) a jména těch nad ním.
function umisteni(skupina, jmeno) {
  const nalezen = najdiLezce(skupina, jmeno);
  if (!nalezen) return null;
  const serazeni = serad(nalezen.kategorie.lezci);
  const index = serazeni.findIndex((e) => e.jmeno === nalezen.lezec.jmeno);
  return { index, serazeni };
}

// ✅ Formulář pro zápis. V režimu „body“ jen kdo + kolik + vypočítej,
// v režimu „admin“ navíc kategorie, ±, členové a zakládání kategorií.
const Formular = ({
  rezim,
  text,
  onChangeText,
  number,
  onChangeNumber,
  kategorie,
  onChangeKategorie,
  novaKategorie,
  onChangeNovaKategorie,
  add,
  remove,
  vypocet,
  pridatKategorii,
}) => {
  const { skupina } = useContext(AppContext);
  const admin = rezim === "admin";
  const kategorieOk = skupina?.kategorie.some((k) => k.id === kategorie);
  const cisloOk = isNumberOk(number, { jenPlus: !admin });

  return (
    <div>
      <input
        className={`input ${isTextOk(text, skupina) ? "ok" : "not-ok"}`}
        value={text}
        onChange={(e) => onChangeText(e.target.value)}
        placeholder="jméno nebo číslo lezce"
      />

      {admin && (
        <select
          className={`input ${kategorieOk ? "ok" : "not-ok"}`}
          value={kategorieOk ? kategorie : ""}
          onChange={(e) => onChangeKategorie(e.target.value)}
        >
          <option value="">kategorie pro nového člena…</option>
          {skupina.kategorie.map((k) => (
            <option key={k.id} value={k.id}>
              {k.nazev}
            </option>
          ))}
        </select>
      )}

      <div className="input-radek">
        <input
          className={`input ${cisloOk ? "ok" : "not-ok"}`}
          value={number ?? ""}
          // text + inputMode: na mobilu vyskočí číselná klávesnice,
          // ale na rozdíl od type="number" jde napsat i mínus
          onChange={(e) =>
            (admin ? /^-?\d*$/ : /^\d*$/).test(e.target.value) &&
            onChangeNumber(e.target.value)
          }
          placeholder={admin ? "body (mínus = odebrat)" : "kolik bodů"}
          type="text"
          inputMode="numeric"
        />
        {admin && (
          <button
            className="btn"
            title="přepnout plus/mínus"
            onClick={() => onChangeNumber(prehodZnamenko(number))}
          >
            ±
          </button>
        )}
      </div>

      <button
        className="btn hlavni"
        onClick={() =>
          isTextOk(text, skupina) && cisloOk && vypocet(text, number)
        }
      >
        vypočítej
      </button>

      {admin && (
        <div className="admin-blok">
          <p className="section-title">Členové</p>
          <button
            className="btn green"
            onClick={() =>
              !isTextOk(text, skupina) &&
              kategorieOk &&
              add(text, kategorie, isNumberOk(number) ? number : 0)
            }
          >
            nový člen
          </button>
          <button
            className="btn red"
            onClick={() => isTextOk(text, skupina) && remove(text)}
          >
            odeber člena
          </button>

          <p className="section-title">Kategorie</p>
          <div className="input-radek">
            <input
              className="input"
              value={novaKategorie}
              onChange={(e) => onChangeNovaKategorie(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && pridatKategorii()}
              placeholder="název nové kategorie"
            />
            <button className="btn green" onClick={pridatKategorii}>
              přidej kategorii
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const LoginForm = ({ password, onChangePassword, setSpravce, setChybaAkce }) => {
  const handleLogin = async () => {
    try {
      // heslo ověřuje server proti hashi, v aplikaci žádné uložené není
      await prihlas(password);
      onChangePassword("");
      setChybaAkce(null);
      setSpravce(true);
    } catch (e) {
      setChybaAkce(e.message);
    }
  };

  return (
    <div className="loginContainer">
      <div className="loginCard">
        <input
          type="password"
          className="passwordInput"
          value={password}
          onChange={(e) => onChangePassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          placeholder="Zadej heslo"
        />

        <button className="btn green" onClick={handleLogin}>
          ověř
        </button>
      </div>
    </div>
  );
};

// ✅ Přepínač lezeckých skupin. Každá má vlastní žebříček i vlastní režim.
const PrepinacSkupin = ({ skupiny, vybrana, setVybrana }) => {
  if (skupiny.length < 2) return null;

  return (
    <div className="skupiny-radek">
      {skupiny.map((s) => (
        <button
          key={s.id}
          className={`tab ${s.id === vybrana ? "aktivni" : ""}`}
          onClick={() => setVybrana(s.id)}
        >
          {s.nazev} {rezimInfo(s.rezim).ikona}
        </button>
      ))}
    </div>
  );
};

// ✅ Panel správce — režim zámku a zakládání/mazání skupin. Jen za heslem.
const PanelSpravce = ({ skupina, provedAkci, odhlas, setVybrana }) => {
  const [novaSkupina, setNovaSkupina] = useState("");

  const zaloz = () => {
    if (!novaSkupina.trim()) return;
    provedAkci(async () => {
      const { novaSkupina: id, ...stav } = await pridejSkupinu(novaSkupina);
      setNovaSkupina("");
      if (id) setVybrana(id);
      return stav;
    });
  };

  const smaz = () => {
    const otazka =
      `Smazat skupinu "${skupina.nazev}" i s jejím žebříčkem?\n` +
      "Soubor se odloží do složky smazane/, takže se dá vrátit.";
    if (window.confirm(otazka)) provedAkci(() => smazSkupinu(skupina.id));
  };

  return (
    <div className="spravce">
      <p className="section-title">Správce — režim skupiny „{skupina.nazev}“</p>
      <div className="rezimy">
        {REZIMY.map((r) => (
          <button
            key={r.id}
            className={`tab ${skupina.rezim === r.id ? "aktivni" : ""}`}
            title={r.popis}
            onClick={() =>
              skupina.rezim !== r.id &&
              provedAkci(() => nastavRezim(skupina.id, r.id))
            }
          >
            {r.ikona} {r.nazev}
          </button>
        ))}
      </div>
      <p className="popis-rezimu">{rezimInfo(skupina.rezim).popis}</p>

      <div className="input-radek">
        <input
          className="input"
          value={novaSkupina}
          onChange={(e) => setNovaSkupina(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && zaloz()}
          placeholder="název nové skupiny"
        />
        <button className="btn green" onClick={zaloz}>
          přidej skupinu
        </button>
      </div>

      <button className="btn red" onClick={smaz}>
        smaž skupinu
      </button>
      <button className="btn" onClick={odhlas}>
        ukonči správce
      </button>
    </div>
  );
};

// ✅ Tabulka — každá kategorie má vlastní žebříček s medailemi a bramborou.
const Tabulka = ({ skupina, onChangeText, onChangeNumber, smazatKategorii }) => {
  if (!skupina) return null;
  if (!skupina.kategorie.length) {
    return (
      <p className="popis-rezimu">
        Zatím žádná kategorie. Přidá se v režimu „admin“.
      </p>
    );
  }

  const radek = (item, index) => (
    <div key={item.jmeno} className="radek-lezce">
      <span className="umisteni">
        <Umisteni index={index} />
      </span>
      <span
        onClick={() => {
          onChangeText(item.jmeno);
          onChangeNumber(null);
        }}
        className="bold-text"
      >
        {item.jmeno} xp: {item.xp}
      </span>
    </div>
  );

  return (
    <div>
      {skupina.kategorie.map((k) => (
        <div key={k.id} className="kategorie">
          <p className="section-title red">
            {k.nazev}:
            {smazatKategorii && !k.lezci.length && (
              <button
                className="btn odkaz maly"
                onClick={() => smazatKategorii(k.id)}
              >
                smaž prázdnou kategorii
              </button>
            )}
          </p>
          {serad(k.lezci).map(radek)}
        </div>
      ))}
    </div>
  );
};

// ✅ Hlavní komponenta
function Calculator() {
  const { skupiny, skupina, vybrana, setVybrana, setData, chyba } =
    useContext(AppContext);
  // přihlášení správce přežije obnovení stránky, dokud platí token
  const [spravce, setSpravce] = useState(() => !!getToken());
  const [chceHeslo, setChceHeslo] = useState(false);
  const [password, onChangePassword] = useState("");
  const [chybaAkce, setChybaAkce] = useState(null);

  const [text, onChangeText] = useState("");
  const [kategorie, onChangeKategorie] = useState("");
  const [number, onChangeNumber] = useState(null);
  const [novaKategorie, onChangeNovaKategorie] = useState("");

  // efekty: červený záblesk při ubrání bodů, hláška při přeskočení
  const [blesk, setBlesk] = useState(false);
  const [preskoceni, setPreskoceni] = useState(null);
  const casovace = useRef([]);
  useEffect(() => () => casovace.current.forEach(clearTimeout), []);
  const zaChvili = (fn, ms) => casovace.current.push(setTimeout(fn, ms));

  // Každá změna jde na server a ten vrátí celý aktuální stav.
  const provedAkci = async (akce) => {
    try {
      const novy = await akce();
      setData(novy);
      setChybaAkce(null);
      return novy;
    } catch (e) {
      setChybaAkce(e.message);
      if (!getToken()) setSpravce(false); // token vypršel -> znovu heslo
      return null;
    }
  };

  const add = (who, kam, xp = 0) =>
    provedAkci(() => pridejLezce(skupina.id, who, kam, xp));

  const remove = (who) => provedAkci(() => odeberLezce(skupina.id, who));

  const pridatKategorii = () => {
    if (!novaKategorie.trim()) return;
    provedAkci(async () => {
      const stav = await pridejKategorii(skupina.id, novaKategorie);
      onChangeNovaKategorie("");
      return stav;
    });
  };

  const smazatKategorii = (kid) =>
    provedAkci(() => smazKategorii(skupina.id, kid));

  // Zápis bodů + efekty podle toho, co se stalo.
  const vypocet = async (who, stena) => {
    const body = Number(stena) || 0;
    const pred = umisteni(skupina, who);
    const novy = await provedAkci(() => pripisXp(skupina.id, who, stena));
    if (!novy) return;

    if (body < 0) {
      zvukUbrano();
      setBlesk(true);
      zaChvili(() => setBlesk(false), 600);
      return;
    }
    if (body === 0) return;

    const skupinaPo = novy.skupiny.find((s) => s.id === skupina.id);
    const po = umisteni(skupinaPo, who);
    if (pred && po && po.index < pred.index) {
      // Přeskočil někoho — ti, kdo byli nad ním a teď jsou pod ním.
      const preskoceni = pred.serazeni
        .slice(po.index, pred.index)
        .map((e) => e.jmeno);
      zvukPreskoceni();
      konfetyPreskoceni();
      setPreskoceni({
        kdo: po.serazeni[po.index].jmeno,
        misto: po.index + 1,
        koho: preskoceni,
      });
      zaChvili(() => setPreskoceni(null), 3200);
    } else {
      zvukBody();
      konfetyBody();
    }
  };

  const odhlas = () => {
    logout();
    setSpravce(false);
    setChceHeslo(false);
  };

  const rezim = skupina?.rezim || "zamceno";
  const info = rezimInfo(rezim);

  return (
    <>
      {blesk && <div className="blesk" />}
      {preskoceni && (
        <div className="preskoceni">
          <div className="preskoceni-kdo">{preskoceni.kdo}</div>
          <div className="preskoceni-text">
            {preskoceni.misto}. místo! Přeskočil(a) {preskoceni.koho.join(", ")}
          </div>
        </div>
      )}

      <PrepinacSkupin
        skupiny={skupiny}
        vybrana={vybrana}
        setVybrana={setVybrana}
      />

      {skupina && (
        <p className="section-title">
          {skupina.nazev} {info.ikona} {info.nazev}
        </p>
      )}

      {/* Formulář se ukáže jen u odemčené skupiny — zamčenou nezmění nikdo. */}
      {skupina && rezim !== "zamceno" ? (
        <Formular
          rezim={rezim}
          text={text}
          onChangeText={onChangeText}
          number={number}
          onChangeNumber={onChangeNumber}
          kategorie={kategorie}
          onChangeKategorie={onChangeKategorie}
          novaKategorie={novaKategorie}
          onChangeNovaKategorie={onChangeNovaKategorie}
          add={add}
          remove={remove}
          vypocet={vypocet}
          pridatKategorii={pridatKategorii}
        />
      ) : (
        <p>Zamčeno, jde jen prohlížet. Odemkne správce heslem.</p>
      )}

      {spravce && skupina ? (
        <PanelSpravce
          skupina={skupina}
          provedAkci={provedAkci}
          odhlas={odhlas}
          setVybrana={setVybrana}
        />
      ) : chceHeslo ? (
        <LoginForm
          password={password}
          onChangePassword={onChangePassword}
          setSpravce={setSpravce}
          setChybaAkce={setChybaAkce}
        />
      ) : (
        <button className="btn odkaz" onClick={() => setChceHeslo(true)}>
          správce
        </button>
      )}

      {(chybaAkce || chyba) && (
        <p className="section-title red">{chybaAkce || chyba}</p>
      )}

      <Tabulka
        onChangeText={onChangeText}
        onChangeNumber={onChangeNumber}
        skupina={skupina}
        smazatKategorii={rezim === "admin" ? smazatKategorii : null}
      />
    </>
  );
}

export default Calculator;
