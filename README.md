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
- automatisches lokales Speichern im Browser über localStorage
- Backup als JSON-Datei und Wiederherstellung direkt in der App
- optionale Cloud-Synchronisation über Supabase mit E-Mail/Passwort
- gleiche Daten auf mehreren Geräten bei Anmeldung mit demselben Konto

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

Ohne Anmeldung bleiben die Daten ausschließlich lokal im jeweiligen Browser. Unter **Daten** kann ein Synchronisationskonto angelegt werden. Danach werden Änderungen lokal gespeichert und zusätzlich mit Supabase synchronisiert. Beim ersten Konto-Login werden vorhandene lokale Daten in die Cloud übernommen, sofern dort noch kein Datenstand existiert. Weitere Geräte laden den vorhandenen Cloud-Stand. Das JSON-Backup bleibt als zusätzliche Sicherungsmöglichkeit erhalten.
