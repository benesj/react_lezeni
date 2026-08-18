import React, { useContext, useState } from "react";
import { AppContext } from "./AppProvider";
import { getToken, prihlas, pridejLezce, odeberLezce, pripisXp } from "./api";
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

// Sedí zadaný text na některého lezce? Bere celé jméno i samotné pořadové číslo.
function isTextOk(text, data) {
  const num = parseInt(text, 10);

  const checkArray = (arr) =>
    arr?.some((e) => {
      // 1️⃣ kontrola celé shody jména
      if (e.jmeno === text) return true;

      // 2️⃣ kontrola podle čísla v závorce
      const match = e.jmeno.match(/\((\d+)\)$/);
      return match && !isNaN(num) && parseInt(match[1], 10) === num;
    });

  return checkArray(data?.mladsi) || checkArray(data?.starsi);
}

function isSkupinaOk(skupina) {
  return skupina === "mladsi" || skupina === "starsi";
}

// ✅ Komponenta pro formulář
const TextInputExample = ({
  text,
  onChangeText,
  number,
  onChangeNumber,
  skupina,
  onChangeSkupina,
  add,
  remove,
  vypocet,
}) => {
  const { data } = useContext(AppContext);

  return (
    <div>
      <input
        className={`input ${isTextOk(text, data) ? "ok" : "not-ok"}`}
        value={text}
        onChange={(e) => onChangeText(e.target.value)}
        placeholder="jméno"
      />
      <input
        className={`input ${isSkupinaOk(skupina) ? "ok" : "not-ok"}`}
        value={skupina}
        onChange={(e) => onChangeSkupina(e.target.value)}
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
          !isTextOk(text, data) &&
          isSkupinaOk(skupina) &&
          add(text, skupina, number)
        }
      >
        nový člen
      </button>
      <button
        className="btn red"
        onClick={() => isTextOk(text, data) && remove(text)}
      >
        odeber člena
      </button>
      <button
        className="btn hlavni"
        onClick={() =>
          isTextOk(text, data) && isNumberOk(number) && vypocet(text, number)
        }
      >
        vypočítej
      </button>
    </div>
  );
};

const LoginForm = ({ password, onChangePassword, setAdmin, setChybaAkce }) => {
  const handleLogin = async () => {
    try {
      // heslo ověřuje server proti hashi, v aplikaci žádné uložené není
      await prihlas(password);
      onChangePassword("");
      setChybaAkce(null);
      setAdmin(true);
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

// ✅ Tabulka
const Tabulka = ({ data, onChangeText, onChangeNumber }) => {
  const serazeneMladsi = [...(data?.mladsi || [])].sort((a, b) => b.xp - a.xp);
  const serazeneStarsi = [...(data?.starsi || [])].sort((a, b) => b.xp - a.xp);

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
  const { data, setData, chyba } = useContext(AppContext);
  // přihlášení přežije obnovení stránky, dokud platí token
  const [admin, setAdmin] = useState(() => !!getToken());
  const [password, onChangePassword] = useState("");
  const [chybaAkce, setChybaAkce] = useState(null);

  const [text, onChangeText] = useState("Jmeno");
  const [skupina, onChangeSkupina] = useState("skupina");
  const [number, onChangeNumber] = useState(null);

  // Každá změna jde na server a ten vrátí celá aktuální data.
  const provedAkci = async (akce) => {
    try {
      setData(await akce());
      setChybaAkce(null);
    } catch (e) {
      setChybaAkce(e.message);
      if (!getToken()) setAdmin(false); // token vypršel -> zpátky na přihlášení
    }
  };

  const add = (who, where, xp = 0) =>
    provedAkci(() => pridejLezce(who, where, xp));

  const remove = (who) => provedAkci(() => odeberLezce(who));

  const vypocet = (who, stena) => provedAkci(() => pripisXp(who, stena));

  return (
    <>
      {admin ? (
        <TextInputExample
          text={text}
          onChangeText={onChangeText}
          number={number}
          onChangeNumber={onChangeNumber}
          skupina={skupina}
          onChangeSkupina={onChangeSkupina}
          add={add}
          remove={remove}
          vypocet={vypocet}
        />
      ) : (
        <LoginForm
          password={password}
          onChangePassword={onChangePassword}
          setAdmin={setAdmin}
          setChybaAkce={setChybaAkce}
        />
      )}
      {(chybaAkce || chyba) && (
        <p className="section-title red">{chybaAkce || chyba}</p>
      )}
      <Tabulka
        onChangeText={onChangeText}
        onChangeNumber={onChangeNumber}
        data={data}
      />
    </>
  );
}

export default Calculator;
