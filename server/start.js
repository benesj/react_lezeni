// Spustí naráz server i tunel:  npm run doma
require("./server");

setTimeout(() => {
  try {
    require("./tunel").spust();
  } catch (e) {
    console.log("Tunel se nespustil: " + e.message);
    console.log("Server běží dál, jen bude dostupný pouze z domácí sítě.");
  }
}, 2000);
