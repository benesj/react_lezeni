import React, { createContext, useCallback, useEffect, useRef, useState } from "react";
import { nactiData } from "./api";
import "./App.css";

export const AppContext = createContext();

// Jak často se kontroluje, jestli někdo jiný data nezměnil.
const INTERVAL_MS = 5000;
// Poslední známá data, aby tabulka nebyla prázdná, než dojde odpověď
// (a aby bylo co ukázat, když server zrovna neběží).
const CACHE_KEY = "urlDataCache";

function nactiCache() {
  try {
    const ulozene = JSON.parse(localStorage.getItem(CACHE_KEY));
    if (ulozene?.mladsi && ulozene?.starsi) return ulozene;
  } catch {
    /* poškozená cache se prostě zahodí */
  }
  return { mladsi: [], starsi: [] };
}

function AppProvider({ children }) {
  const [data, setDataState] = useState(nactiCache);
  const [chyba, setChyba] = useState(null);
  // drží se v ref, aby změna nespouštěla znovu efekt s intervalem
  const jePrvniNacteni = useRef(true);

  const setData = useCallback((nova) => {
    setDataState(nova);
    localStorage.setItem(CACHE_KEY, JSON.stringify(nova));
  }, []);

  const obnov = useCallback(async () => {
    try {
      setData(await nactiData());
      setChyba(null);
    } catch (e) {
      setChyba("Server s daty není dostupný — zobrazeno naposledy načtené.");
      if (jePrvniNacteni.current) console.warn("Načtení dat selhalo:", e.message);
    } finally {
      jePrvniNacteni.current = false;
    }
  }, [setData]);

  useEffect(() => {
    obnov();
    const id = setInterval(() => {
      if (!document.hidden) obnov();
    }, INTERVAL_MS);
    return () => clearInterval(id);
  }, [obnov]);

  const value = { data, setData, chyba, obnov };

  return (
    <div className="app-container">
      <AppContext.Provider value={value}>{children}</AppContext.Provider>
    </div>
  );
}

export default AppProvider;
