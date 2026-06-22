# HÉV Radar

A H5 vonal összes aktuális szerelvényének élő követőoldala. A `1131-766-1132` pályaszámot tartalmazó célszerelvényt külön, pulzáló jelölő emeli ki. Az adatokat közvetlenül a BKK publikus webes API-jából olvassa, majd 10 másodpercenként frissíti.

- A szűrőből tetszőleges számú aktuális szerelvény adható hozzá ideiglenes, türkiz kiemelésként.
- Bármelyik térképi járműre kattintva megnyílik a teljes, mezőnként kibontott API-adatlapja.
- Az ideiglenes kiemelések az oldalon maradnak, amíg a jármű elérhető vagy az oldal újra nem töltődik.

## Indítás

```bash
npm install
npm run dev
```

Ezután nyisd meg a terminálban megjelenő helyi címet (alapértelmezetten `http://localhost:5173`).

Ha a szerelvény épp nincs forgalomban, a fejlesztői demónézet a `?demo=1` query paraméterrel tekinthető meg, például: `http://localhost:5173/?demo=1`. A demó kizárólag fejlesztői módban aktív; a production build mindig csak valódi adatot mutat.

## Production build

```bash
npm run build
npm run preview
```
