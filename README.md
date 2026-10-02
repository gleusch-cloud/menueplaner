# Menüplaner

Browserbasierter Wochen- und Einkaufsplaner mit Vite und Vanilla JavaScript.

## Funktionen

- Wochenplan von Freitag bis Donnerstag mit eigener Speicherung je Woche
- Gerichte mit Kategorie, Favorit, „zuletzt gegessen“ und Zutaten
- Snacks als eigene Stammdaten
- gewichtete Zufallsplanung für einzelne Tage oder die ganze Woche
- Notizen pro Tag
- mehrere Einkaufslisten pro Woche
- feste Einkaufsliste **Essen** für Zutaten aus geplanten Gerichten
- gleiche Zutaten werden zusammengeführt; alle Quellgerichte werden angezeigt
- freie Mengennotiz je Einkaufsartikel
- Artikelhistorie für Vorschläge beim Tippen; häufig verwendete Artikel werden bevorzugt
- kompakte Druck-/PDF-Ansicht für Wochenplan und Einkaufsliste
- Speicherung im Browser über localStorage

## Entwicklung

```bash
npm.cmd install
npm.cmd run dev
```

Im lokalen WLAN:

```bash
npm.cmd run dev -- --host 0.0.0.0
```

Produktions-Build:

```bash
npm.cmd run build
```

## GitHub Pages

Die App wird über GitHub Actions aus `main` gebaut und veröffentlicht. Für GitHub Pages ist in `vite.config.js` die Basis `/menueplaner/` gesetzt.

Hinweis: localStorage ist an Browser und Adresse gebunden. Daten werden daher nicht automatisch zwischen Handy, Laptop, localhost und GitHub Pages synchronisiert.
