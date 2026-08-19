import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { nactiData } from "./api";
import "./App.css";

export const AppContext = createContext();

// Jak často se kontroluje, jestli někdo jiný data nezměnil.
const INTERVAL_MS = 5000;
// Poslední známý stav, aby tabulka nebyla prázdná, než dojde odpověď
// (a aby bylo co ukázat, když server zrovna neběží).
const CACHE_KEY = "zebricekCache";
// Kterou skupinu měl uživatel naposledy vybranou.
const VYBRANA_KEY = "vybranaSkupina";

function nactiCache() {
  try {
    const ulozene = JSON.parse(localStorage.getItem(CACHE_KEY));
    if (Array.isArray(ulozene?.skupiny)) return ulozene;
  } catch {
    /* poškozená cache se prostě zahodí */
  }
  return { skupiny: [] };
}

function AppProvider({ children }) {
  const [stav, setStavState] = useState(nactiCache);
  const [vybrana, setVybranaState] = useState(
    () => localStorage.getItem(VYBRANA_KEY) || ""
  );
  const [chyba, setChyba] = useState(null);
  // drží se v ref, aby změna nespouštěla znovu efekt s intervalem
  const jePrvniNacteni = useRef(true);

  // setData dostává celý nový stav ze serveru (každý zápis ho vrací).
  const setData = useCallback((novy) => {
    setStavState(novy);
    localStorage.setItem(CACHE_KEY, JSON.stringify(novy));
  }, []);

  const setVybrana = useCallback((id) => {
    setVybranaState(id);
    localStorage.setItem(VYBRANA_KEY, id);
  }, []);

  const obnov = useCallback(async () => {
    try {
      setData(await nactiData());
      setChyba(null);
    } catch (e) {
      setChyba("Server s daty není dostupný — zobrazeno naposledy načtené.");
      if (jePrvniNacteni.current)
        console.warn("Načtení dat selhalo:", e.message);
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

  const skupiny = useMemo(() => stav.skupiny || [], [stav]);
  // Když vybraná skupina zmizí (nebo ještě žádná nebyla), bere se první.
  const skupina = useMemo(
    () => skupiny.find((s) => s.id === vybrana) || skupiny[0] || null,
    [skupiny, vybrana]
  );

  const value = {
    skupiny,
    skupina,
    vybrana: skupina?.id || "",
    setVybrana,
    setData,
    chyba,
    obnov,
  };

  return (
    <div className="app-container">
      <AppContext.Provider value={value}>{children}</AppContext.Provider>
    </div>
  );
}

export default AppProvider;
