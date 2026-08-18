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
  místně:  http://localhost:4000
  v síti:  http://192.168.0.15:4000
```

Ostatní zadají tu druhou adresu do prohlížeče (musí být na stejné wifi).
Přidat si ji jde jako zástupce na plochu telefonu.

Jiný port: `set PORT=8080 && npm run server` (PowerShell: `$env:PORT=8080; npm run server`).

## Heslo

Admin režim ověřuje server. V `server/auth.json` je jen scrypt hash a náhodná
sůl — heslo samotné nikde uložené není a do prohlížeče se nedostane.
Soubor není v gitu ani v buildu. Změna hesla: `npm run set-password`.
Přihlášení platí 12 hodin nebo do restartu serveru.

## Data

- `server/data.json` — živá data, po každé změně se předchozí verze odloží
  do `server/data.bak.json`
- ani jeden soubor není v gitu, zálohovat se musí ručně (stačí zkopírovat)

**Přenos starých dat z prohlížeče:** v prohlížeči, kde žebříček dosud byl,
otevřít konzoli (F12) a spustit `copy(localStorage.getItem('urlData'))`.
Obsah schránky vložit do `server/data.json` a restartovat server.

## Vývoj

`npm start` běží na portu 3000 a data si sám bere ze serveru na portu 4000,
takže je potřeba mít vedle spuštěné i `npm run server`.
Jinou adresu serveru lze nastavit v `.env.local`:
`REACT_APP_API_URL=http://192.168.0.15:4000`

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
