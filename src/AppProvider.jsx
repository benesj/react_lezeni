import React, { createContext, useEffect, useState } from "react";
import "./App.css";

export const AppContext = createContext();

function AppProvider({ children }) {
  const [data, setData] = useState({ mladsi: [], starsi: [] });

  console.log("actual Data " + JSON.stringify(data));

  // načtení dat při startu
  useEffect(() => {
    const urlData = localStorage.getItem("urlData");
    urlData
      ? setData(JSON.parse(urlData))
      : setData({ mladsi: [], starsi: [] });
  }, []);

  // uložení dat do localStorage
  const setUrlData = (newData) => {
    localStorage.setItem("urlData", JSON.stringify(newData));
  };

  const value = {
    data,
    setUrlData,
    setData,
  };

  return (
    <div className="app-container">
      <AppContext.Provider value={value}>{children}</AppContext.Provider>
    </div>
  );
}

export default AppProvider;
