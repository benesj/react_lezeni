import React, { useContext, useEffect, useState } from "react";
import { AppContext } from "./AppProvider";
import "./App.css";

// ✅ Pomocné validace
function isNumberOk(number) {
  // return !isNaN(number) && number > 0;
  return !isNaN(number);
}
function isTextOk(text, data) {
  const num = parseInt(text, 10);

  // funkce na kontrolu jednoho pole
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
  calculateNewXp,
  updateCounter,
  setUpdateCounter,
  add,
  remove,
}) => {
  const { data, setUrlData, setData } = useContext(AppContext);

  const handleVypocet = (identifier, stena) => {
  let newData = { ...data };
  let isObjFromMladsi = true;
  let objIndex = -1;

  if (typeof identifier === "number") {
    // hledání podle čísla v závorce
    const findByNumber = (arr, num) =>
      arr.findIndex((e) => {
        const match = e.jmeno.match(/\((\d+)\)$/);
        return match && parseInt(match[1], 10) === num;
      });

    objIndex = findByNumber(newData?.mladsi || [], identifier);

    if (objIndex < 0) {
      objIndex = findByNumber(newData?.starsi || [], identifier);
      isObjFromMladsi = false;
    }
  } else {
    // hledání podle celého jména
    objIndex = newData?.mladsi?.findIndex((e) => e.jmeno === identifier);
    if (objIndex < 0) {
      objIndex = newData?.starsi?.findIndex((e) => e.jmeno === identifier);
      isObjFromMladsi = false;
    }
  }

  if (objIndex >= 0) {
    if (isObjFromMladsi) {
      newData.mladsi[objIndex].xp = calculateNewXp(
        stena,
        newData.mladsi[objIndex].xp
      );
    } else {
      newData.starsi[objIndex].xp = calculateNewXp(
        stena,
        newData.starsi[objIndex].xp
      );
    }

    setUrlData(newData);
    setData(newData);
    setUpdateCounter(!updateCounter);
  }
};

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
      <input
        className={`input ${isNumberOk(number) ? "ok" : "not-ok"}`}
        value={number || ""}
        onChange={(e) => onChangeNumber(e.target.value)}
        placeholder="lvl překážky"
        type="number"
      />

      <button
        className="btn green"
        onClick={() =>
          !isTextOk(text, data) &&
          isSkupinaOk(skupina) &&
          add(text, skupina, number, data)
        }
      >
        přidej
      </button>
      <button
        className="btn red"
        onClick={() =>
          isTextOk(text, data) && isSkupinaOk(skupina) && remove(text, skupina)
        }
      >
        odeber
      </button>
      <button
        className="btn"
        onClick={() => {
          if (isTextOk(text, data) && isNumberOk(number)) {
            const match = text.match(/\((\d+)\)$/);

            let id;
            if (match) {
              // ✅ formát jméno (5)
              id = parseInt(match[1], 10);
            } else if (!isNaN(parseInt(text, 10))) {
              // ✅ když je to jen číslo "5"
              id = parseInt(text, 10);
            } else {
              // ✅ jinak bereme celý text jako jméno
              id = text;
            }

            handleVypocet(id, number);
          }
        }}
      >
        vypočítej
      </button>

    </div>
  );
};

const LoginForm = ({ password, onChangePassword, setAdmin }) => {
  const handleLogin = (password) => {
    if (password === "vasile necum") {
      setAdmin(true);
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
          placeholder="Zadej heslo"
        />

        <button
          className="btn green"
          onClick={() => handleLogin(password)}
        >
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

  return (
    <div>
      <p className="section-title red">Mladší:</p>
      {serazeneMladsi.map((item, index) => (
        <div key={index}>
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
      ))}

      <p className="section-title red">Starší:</p>
      {serazeneStarsi.map((item, index) => (
        <div key={index}>
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
      ))}
    </div>
  );
};

// ✅ Hlavní komponenta
function Calculator() {
  const { data, setUrlData, setData } = useContext(AppContext);
  console.log("data " + JSON.stringify(data));
  const [admin, setAdmin] = useState(false); 
  const [password, onChangePassword] = useState("");

  const [updateCounter, setUpdateCounter] = useState(true);

  const [text, onChangeText] = useState("Jmeno");
  const [skupina, onChangeSkupina] = useState("skupina");
  const [number, onChangeNumber] = useState(null);

  useEffect(() => {
    console.log("Tabulka se bude překreslovat!");
  }, [data, updateCounter]);

  const add = (who, where, xp = 0, data) => {
  let newData = { ...data };

  // 🔹 vytáhneme všechna čísla z obou skupin (mladsi + starsi)
  const usedNumbers = Object.values(newData || {})
    .flat()
    .map(item => {
      const match = item.jmeno.match(/\((\d+)\)$/); // číslo v závorkách na konci
      return match ? parseInt(match[1], 10) : null;
    })
    .filter(n => n !== null);

  // 🔹 najdeme první volné číslo, které není nikde použité
  let nextNumber = 1;
  while (usedNumbers.includes(nextNumber)) {
    nextNumber++;
  }

  // 🔹 přidáme novou položku
  newData[where].push({
    jmeno: `${who} (${nextNumber})`,
    xp: +xp,
  });

  setUrlData(newData);
  setData(newData);
  setUpdateCounter(!updateCounter);
};

  const remove = (who, where) => {
    let newData = { ...data };
    newData[where] = newData[where].filter((item) => item.jmeno !== who);
    setUrlData(newData);
    setData(newData);
    setUpdateCounter(!updateCounter);
  };

//   const getLvlFromXp = (xp) => Math.trunc(xp / 50);

  const calculateNewXp = (stena, xp) => {
    // let increment = +stena + 10 - getLvlFromXp(+xp);
    let increment = +stena;
    // if (increment < 1) increment = 1;
    return xp + increment;
  };

  return (
    <>
      {admin ? <TextInputExample
        text={text}
        onChangeText={onChangeText}
        number={number}
        onChangeNumber={onChangeNumber}
        skupina={skupina}
        onChangeSkupina={onChangeSkupina}
        calculateNewXp={calculateNewXp}
        setUpdateCounter={setUpdateCounter}
        updateCounter={updateCounter}
        add={add}
        remove={remove}
      />:
      <LoginForm
        password={password}
        onChangePassword={onChangePassword}
        setAdmin={setAdmin}
      />
      }
      <Tabulka
        onChangeText={onChangeText}
        onChangeNumber={onChangeNumber}
        data={data}
      />
    </>
  );
}

export default Calculator;
