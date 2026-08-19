import React, { useContext, useState } from "react";
import { AppContext } from "./AppProvider";
import {
  getToken,
  logout,
  prihlas,
  pridejLezce,
  odeberLezce,
  pripisXp,
  nastavZamek,
  pridejSkupinu,
  smazSkupinu,
} from "./api";
import "./App.css";

// ✅ Pomocné validace
// Celé číslo, klidně záporné — mínusem se dají body i odebrat.
function isNumberOk(number) {
  return /^-?\d+$/.test(String(number ?? "").trim());
}

// Telefonní klávesnice mínus nenabízí, proto tlačítko ±.
function prehodZnamenko(hodnota) {
  const text = String(hodnota ?? "").trim();
  if (text.startsWith("-")) return text.slice(1);
  return text ? "-" + text : "-";
}

// Sedí zadaný text na některého lezce ve vybrané skupině?
// Bere celé jméno i samotné pořadové číslo.
function isTextOk(text, skupina) {
  const num = parseInt(text, 10);

  const checkArray = (arr) =>
    arr?.some((e) => {
      // 1️⃣ kontrola celé shody jména
      if (e.jmeno === text) return true;

      // 2️⃣ kontrola podle čísla v závorce
      const match = e.jmeno.match(/\((\d+)\)$/);
      return match && !isNaN(num) && parseInt(match[1], 10) === num;
    });

  return checkArray(skupina?.mladsi) || checkArray(skupina?.starsi);
}

function isKategorieOk(kategorie) {
  return kategorie === "mladsi" || kategorie === "starsi";
}

// ✅ Komponenta pro formulář
const TextInputExample = ({
  text,
  onChangeText,
  number,
  onChangeNumber,
  kategorie,
  onChangeKategorie,
  add,
  remove,
  vypocet,
}) => {
  const { skupina } = useContext(AppContext);

  return (
    <div>
      <input
        className={`input ${isTextOk(text, skupina) ? "ok" : "not-ok"}`}
        value={text}
        onChange={(e) => onChangeText(e.target.value)}
        placeholder="jméno"
      />
      <input
        className={`input ${isKategorieOk(kategorie) ? "ok" : "not-ok"}`}
        value={kategorie}
        onChange={(e) => onChangeKategorie(e.target.value)}
        placeholder="mladsi / starsi"
      />
      <div className="input-radek">
        <input
          className={`input ${isNumberOk(number) ? "ok" : "not-ok"}`}
          value={number ?? ""}
          // text + inputMode: na mobilu vyskočí číselná klávesnice,
          // ale na rozdíl od type="number" jde napsat i mínus
          onChange={(e) =>
            /^-?\d*$/.test(e.target.value) && onChangeNumber(e.target.value)
          }
          placeholder="lvl překážky"
          type="text"
          inputMode="numeric"
        />
        <button
          className="btn"
          title="přepnout plus/mínus"
          onClick={() => onChangeNumber(prehodZnamenko(number))}
        >
          ±
        </button>
      </div>

      <button
        className="btn green"
        onClick={() =>
          !isTextOk(text, skupina) &&
          isKategorieOk(kategorie) &&
          add(text, kategorie, number)
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
      <button
        className="btn hlavni"
        onClick={() =>
          isTextOk(text, skupina) && isNumberOk(number) && vypocet(text, number)
        }
      >
        vypočítej
      </button>
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

// ✅ Přepínač lezeckých skupin. Každá má vlastní žebříček i vlastní zámek.
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
          {s.nazev} {s.odemceno ? "🔓" : "🔒"}
        </button>
      ))}
    </div>
  );
};

// ✅ Panel správce — zámek a zakládání/mazání skupin. Jen za heslem.
const PanelSpravce = ({ skupina, provedAkci, odhlas, setVybrana }) => {
  const [novaSkupina, setNovaSkupina] = useState("");

  const prepniZamek = () =>
    provedAkci(() => nastavZamek(skupina.id, !skupina.odemceno));

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
      <p className="section-title">Správce</p>

      <button
        className={`btn ${skupina.odemceno ? "red" : "green"}`}
        onClick={prepniZamek}
      >
        {skupina.odemceno
          ? `zamkni „${skupina.nazev}“`
          : `odemkni „${skupina.nazev}“`}
      </button>

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

// ✅ Tabulka
const Tabulka = ({ skupina, onChangeText, onChangeNumber }) => {
  const serazeneMladsi = [...(skupina?.mladsi || [])].sort((a, b) => b.xp - a.xp);
  const serazeneStarsi = [...(skupina?.starsi || [])].sort((a, b) => b.xp - a.xp);

  const radek = (item, index) => (
    <div key={item.jmeno}>
      <span
        onClick={() => {
          onChangeText(item.jmeno);
          onChangeNumber(null);
        }}
        className="bold-text"
      >
        {item.jmeno} xp: {item.xp}{" "}
        {index === 0 && <span className="gold">☻</span>}
        {index === 1 && <span className="silver">☻</span>}
        {index === 2 && <span className="bronze">☻</span>}
      </span>
    </div>
  );

  return (
    <div>
      <p className="section-title red">Mladší:</p>
      {serazeneMladsi.map(radek)}

      <p className="section-title red">Starší:</p>
      {serazeneStarsi.map(radek)}
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

  const [text, onChangeText] = useState("Jmeno");
  const [kategorie, onChangeKategorie] = useState("kategorie");
  const [number, onChangeNumber] = useState(null);

  // Každá změna jde na server a ten vrátí celý aktuální stav.
  const provedAkci = async (akce) => {
    try {
      setData(await akce());
      setChybaAkce(null);
    } catch (e) {
      setChybaAkce(e.message);
      if (!getToken()) setSpravce(false); // token vypršel -> znovu heslo
    }
  };

  const add = (who, kam, xp = 0) =>
    provedAkci(() => pridejLezce(skupina.id, who, kam, xp));

  const remove = (who) => provedAkci(() => odeberLezce(skupina.id, who));

  const vypocet = (who, stena) =>
    provedAkci(() => pripisXp(skupina.id, who, stena));

  const odhlas = () => {
    logout();
    setSpravce(false);
    setChceHeslo(false);
  };

  return (
    <>
      <PrepinacSkupin
        skupiny={skupiny}
        vybrana={vybrana}
        setVybrana={setVybrana}
      />

      {skupina && (
        <p className="section-title">
          {skupina.nazev} {skupina.odemceno ? "🔓 odemčeno" : "🔒 zamčeno"}
        </p>
      )}

      {/* Formulář se ukáže jen u odemčené skupiny — zamčenou nezmění nikdo. */}
      {skupina?.odemceno ? (
        <TextInputExample
          text={text}
          onChangeText={onChangeText}
          number={number}
          onChangeNumber={onChangeNumber}
          kategorie={kategorie}
          onChangeKategorie={onChangeKategorie}
          add={add}
          remove={remove}
          vypocet={vypocet}
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
      />
    </>
  );
}

export default Calculator;
