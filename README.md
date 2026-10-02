# Menüplaner v3

Komplett neuer Projektordner für Vite + Vanilla JavaScript.

## Enthalten

- Wochenansicht Freitag bis Donnerstag
- Wochentage untereinander
- separate Ansicht „Verwaltung“
- Gerichte als Stammdaten mit Kategorie und Favorit
- Snacks als eigene Stammdaten ohne Kategorie/Favorit
- pro Tag ein Gericht
- pro Tag beliebig viele Snacks, auch derselbe Snack mehrfach
- Notiz pro Tag
- Zufallsplanung der ganzen Woche ohne unnötige Gericht-Doppelungen
- einzelne Tage neu würfeln
- Speicherung in localStorage
- vorhandene alte Gerichteliste aus `localStorage["gerichte"]` wird beim ersten Start übernommen, falls vorhanden
- responsive Darstellung für Laptop, Tablet und Handy

## Start

Ordner in VS Code öffnen.

Im Terminal:

    npm.cmd install

Danach:

    npm.cmd run dev

Die von Vite angezeigte lokale Adresse im Browser öffnen.
