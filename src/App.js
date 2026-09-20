import React from "react";
import AppProvider from "./AppProvider";
import Calculator from "./Calculator";

// Když něco v aplikaci spadne, ukáže se hláška s tlačítkem místo bílé
// obrazovky. Tlačítko smaže uložená data prohlížeče (cache žebříčku,
// vybranou skupinu, token) a načte stránku znovu.
class ZachytChybu extends React.Component {
  state = { chyba: null };

  static getDerivedStateFromError(chyba) {
    return { chyba };
  }

  componentDidCatch(chyba) {
    console.error("Aplikace spadla:", chyba);
  }

  render() {
    if (!this.state.chyba) return this.props.children;
    return (
      <div className="app-container">
        <p className="section-title red">Něco se pokazilo.</p>
        <p>{String(this.state.chyba?.message || this.state.chyba)}</p>
        <button
          className="btn green"
          onClick={() => {
            localStorage.clear();
            window.location.reload();
          }}
        >
          smazat uložená data a načíst znovu
        </button>
      </div>
    );
  }
}

function App() {
  return (
    <ZachytChybu>
      <AppProvider>
        <Calculator />
      </AppProvider>
    </ZachytChybu>
  );
}

export default App;
