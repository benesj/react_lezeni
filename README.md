# Žebříček lezeckého kroužku

Data má na starosti malý server běžící na domácím PC (`server/`). Ukládá je do
`server/data.json` a zároveň rozdává hotovou aplikaci, takže všichni v síti
vidí a mění jeden společný žebříček.

## Spuštění

```bash
npm install          # jen poprvé
npm run set-password # jen poprvé — nastaví admin heslo
npm run build        # po každé změně kódu
npm run server       # tohle nechat běžet
```

Server po startu vypíše adresy, na kterých je dostupný, např.:

```
  místně:  https://localhost:4443
  v síti:  https://192.168.0.15:4443
```

Ostatní zadají tu druhou adresu do prohlížeče (musí být na stejné wifi).
Přidat si ji jde jako zástupce na plochu telefonu.

Jiné porty: `$env:PORT=8080; $env:HTTPS_PORT=8443; npm run server`
(`PORT` je jen přesměrování na `HTTPS_PORT`).

## Zabezpečení spojení

Provoz jede přes HTTPS, takže heslo ani data po síti nikdo nepřečte
(TLS 1.3). Certifikát si server vyrobí sám při prvním spuštění a uloží do
`server/cert/` — je vystavený na jméno počítače a na všechny jeho IP adresy.
Když se PC přepne do jiné sítě a dostane jinou IP, server si při startu udělá
nový.

Protože si certifikát podepsal sám, prohlížeč při **prvním** otevření varuje
("Vaše připojení není soukromé"). Je potřeba jednou dát *Pokročilé →
Pokračovat na…* — na každém zařízení jednou. Po odkliknutí je spojení
šifrované úplně stejně jako u běžných webů, jen za ten certifikát neručí
žádná autorita.

Kdo napíše adresu bez `https://`, přistane na portu 4000 a rovnou se
přesměruje na HTTPS. Nešifrovaně se neobslouží žádná data ani přihlášení —
port 4000 umí jen přesměrovat.

## Heslo

Admin režim ověřuje server. V `server/auth.json` je jen scrypt hash a náhodná
sůl — heslo samotné nikde uložené není a do prohlížeče se nedostane.
Soubor není v gitu ani v buildu. Změna hesla: `npm run set-password`.
Přihlášení platí 12 hodin nebo do restartu serveru.

## Data

Žebříček je uložený **na systémovém disku**, ne u projektu — ten leží na
externím disku, který nemusí být připojený:

```
C:\Users\<jméno>\AppData\Roaming\lezecky-zebricek\data.json
```

- `data.json` — živá data; před každou změnou se předchozí verze odloží
  do `data.bak.json` vedle
- soubory nejsou v gitu, zálohovat se musí ručně (stačí zkopírovat)
- jiné umístění: `$env:DATA_DIR="E:\zalohy\zebricek"; npm run server`
- přesnou cestu server vypíše při startu
- `npm run backup` udělá kopii s datem do podsložky `zalohy/`
  (drží posledních 20)
- v gitu není ani `server/auth.json` a `server/cert/` — patří jen na tenhle stroj

**Přenos starých dat z prohlížeče:** v prohlížeči, kde žebříček dosud byl,
otevřít konzoli (F12) a spustit `copy(localStorage.getItem('urlData'))`.
Obsah schránky vložit do `server/data.json` a restartovat server.

## Vývoj

`npm start` běží na portu 3000 a data si sám bere ze serveru na portu 4443,
takže je potřeba mít vedle spuštěné i `npm run server`. Napoprvé je nutné
otevřít <https://localhost:4443> a odkliknout varování o certifikátu, jinak
prohlížeč volání z vývojového serveru zablokuje.

Jinou adresu serveru lze nastavit v `.env.local`:
`REACT_APP_API_URL=https://192.168.0.15:4443`

## Verze na GitHub Pages

`npm run deploy` publikuje aplikaci na
<https://benesj.github.io/react_lezeni>. Ta se ale k serveru doma nedostane
(stránka jede přes https, domácí server přes http v lokální síti — prohlížeč
takové volání zablokuje), takže bude jen zobrazovat naposledy načtená data.
Sdílený žebříček funguje přes adresu z `npm run server`.

---

# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
