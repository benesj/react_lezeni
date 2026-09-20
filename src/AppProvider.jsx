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

// Data se dosadí do známého tvaru, ať aplikace nespadne na cache ze starší
// verze (ta měla místo `kategorie` seznamy mladsi/starsi a boolean odemceno).
function normalizuj(stav) {
  const skupiny = Array.isArray(stav?.skupiny) ? stav.skupiny : [];
  return {
    skupiny: skupiny
      .filter((s) => s && typeof s.id === "string")
      .map((s) => ({
        ...s,
        nazev: s.nazev || s.id,
        rezim: s.rezim || (s.odemceno ? "admin" : "zamceno"),
        kategorie: Array.isArray(s.kategorie)
          ? s.kategorie.map((k) => ({
              ...k,
              lezci: Array.isArray(k.lezci) ? k.lezci : [],
            }))
          : [],
      })),
  };
}

function nactiCache() {
  try {
    return normalizuj(JSON.parse(localStorage.getItem(CACHE_KEY)));
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
  const setData = useCallback((surovy) => {
    const novy = normalizuj(surovy);
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
