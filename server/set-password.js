// Nastavení admin hesla:  npm run set-password
// Heslo se zadá do promptu (nezůstane v historii příkazů) a uloží se
// zahashované do server/auth.json.
const readline = require("readline");
const { ulozHeslo, AUTH_FILE } = require("./auth");

const zArgumentu = process.argv[2];

if (zArgumentu) {
  ulozHeslo(zArgumentu);
  console.log("Heslo uloženo do " + AUTH_FILE);
  process.exit(0);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question("Nové admin heslo: ", (heslo) => {
  if (!heslo || heslo.length < 4) {
    console.error("Heslo musí mít aspoň 4 znaky.");
    rl.close();
    process.exit(1);
  }
  ulozHeslo(heslo);
  console.log("Heslo uloženo do " + AUTH_FILE);
  rl.close();
});
