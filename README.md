# Žebříček lezeckého kroužku

Data má na starosti malý server běžící na domácím PC (`server/`). Ukládá je do
profilu uživatele (viz [Data](#data)) a zároveň rozdává hotovou aplikaci, takže
všichni vidí a mění jeden společný žebříček — v domácí wifi i odkudkoli
z internetu přes Cloudflare Tunnel.

## Spuštění

```bash
npm install          # jen poprvé
npm run set-password # jen poprvé — nastaví admin heslo
npm run build        # po každé změně kódu
npm run doma         # tohle nechat běžet (server + tunel do internetu)
```

Kdo chce jen domácí síť bez přístupu zvenku, spustí místo toho `npm run server`.

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

## Přístup odkudkoli

`npm run doma` vedle serveru spustí i **Cloudflare Tunnel** (`server/tunel.js`).
Ten naváže *odchozí* spojení z PC k Cloudflare a zpřístupní server na veřejné
https adrese. Na routeru se nic nepřesměrovává a PC není z internetu vidět —
roura vede výhradně na `https://localhost:4443`.

Použitý je *quick tunnel*, který nepotřebuje účet ani doménu. Jeho adresa
(`*.trycloudflare.com`) se ale **při každém spuštění mění**, takže se nedá nikomu
dát natrvalo. Řeší se to takhle:

1. `tunel.js` po startu zapíše aktuální adresu do `tunnel-url.json` a pushne ji
   na GitHub.
2. Aplikace na GitHub Pages si při načtení tuhle adresu přečte a mluví s ní.

**Trvalý odkaz pro ostatní je tedy <https://benesj.github.io/react_lezeni>** —
ten se nemění nikdy, měnící se tunel je schovaný za ním. Po restartu tunelu
může chvíli (~5 min, cache GitHubu) ukazovat ještě na starou adresu.

Certifikát na tunelu je od Cloudflare, takže zvenku prohlížeč **nevaruje**.
Varování se týká jen přímého přístupu v domácí síti přes `https://<IP>:4443`.

### Spuštění po startu Windows

`server/autostart.cmd` počká, až bude dostupný disk s projektem, a pak spustí
`npm run doma`. Pouští ho `lezecky-zebricek.vbs` ve složce Po spuštění
(Startup), aby nebylo vidět okno:

```
%APPDATA%MicrosoftWindowsStart MenuProgramsStartuplezecky-zebricek.vbs
```

Autostart se zruší smazáním toho `.vbs`. Log: `%APPDATA%lezecky-zebricekautostart.log`.

Běží pod přihlášeným uživatelem, ne jako služba pod SYSTEM — server vystavený
do internetu záměrně nemá běžet s plnými právy. Znamená to ale, že po restartu
PC naskočí až po přihlášení do Windows.

## Verze na GitHub Pages

`npm run deploy` publikuje aplikaci na <https://benesj.github.io/react_lezeni>.
Data si bere z domácího serveru přes tunel (viz výše), takže je to plnohodnotný
sdílený žebříček. Když server doma neběží, ukáže naposledy načtená data z cache.

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
