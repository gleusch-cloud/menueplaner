import './style.css'

const TAGE = [
  'Freitag',
  'Samstag',
  'Sonntag',
  'Montag',
  'Dienstag',
  'Mittwoch',
  'Donnerstag'
]

const GERICHT_KATEGORIEN = [
  'Pasta',
  'Reisgericht',
  'Kartoffelgericht',
  'Suppe',
  'Fleisch',
  'Fisch',
  'Vegetarisch',
  'Pizza',
  'Sonstiges'
]

const STORAGE = {
  gerichte: 'menueplaner_gerichte',
  snacks: 'menueplaner_snacks',
  woche: 'menueplaner_woche',
  wochenStart: 'menueplaner_wochenstart'
}

const alteGerichte = JSON.parse(
  localStorage.getItem('gerichte') || 'null'
)

let gerichte = ladeDaten(
  STORAGE.gerichte,
  Array.isArray(alteGerichte) && alteGerichte.length
    ? alteGerichte.map(normalisiereGericht)
    : [
        neuesGericht('Spaghetti Bolognese', 'Pasta'),
        neuesGericht('Kartoffelsuppe', 'Suppe'),
        neuesGericht('Pizza', 'Pizza'),
        neuesGericht('Geschnetzeltes mit Reis', 'Reisgericht'),
        neuesGericht('Pfannkuchen', 'Sonstiges'),
        neuesGericht('Lasagne', 'Pasta')
      ]
)

let snacks = ladeDaten(STORAGE.snacks, [
  neuerSnack('Apfel'),
  neuerSnack('Joghurt'),
  neuerSnack('Banane'),
  neuerSnack('Müsliriegel')
])

let wochenplan = ladeDaten(
  STORAGE.woche,
  erstelleLeerenWochenplan()
)

wochenplan = normalisiereWochenplan(wochenplan)

let aktuelleAnsicht = 'woche'
let bearbeitetesGerichtId = null
let bearbeiteterSnackId = null
let wochenStart = ladeWochenStart()

// --------------------------------------------------
// DATEN LADEN UND SPEICHERN
// --------------------------------------------------

function ladeDaten(key, fallback) {
  try {
    const gespeichert = JSON.parse(
      localStorage.getItem(key)
    )

    return gespeichert ?? fallback
  } catch {
    return fallback
  }
}

function speichern() {
  localStorage.setItem(
    STORAGE.gerichte,
    JSON.stringify(gerichte)
  )

  localStorage.setItem(
    STORAGE.snacks,
    JSON.stringify(snacks)
  )

  localStorage.setItem(
    STORAGE.woche,
    JSON.stringify(wochenplan)
  )
}


// --------------------------------------------------
// ID ERZEUGEN
// --------------------------------------------------

function neueId() {
  if (globalThis.crypto?.randomUUID) {
    return crypto.randomUUID()
  }

  return (
    Date.now().toString(36) +
    Math.random().toString(36).substring(2)
  )
}


// --------------------------------------------------
// GERICHTE UND SNACKS
// --------------------------------------------------

function neuesGericht(
  name,
  kategorie = 'Sonstiges'
) {
  return {
    id: neueId(),
    name,
    kategorie,
    favorit: false,
    zuletztGegessen: null
  }
}

function normalisiereGericht(gericht) {
  return {
    id: gericht.id || neueId(),
    name: gericht.name || 'Unbenanntes Gericht',
    kategorie: gericht.kategorie || 'Sonstiges',
    favorit: Boolean(gericht.favorit),
    zuletztGegessen:
      gericht.zuletztGegessen || null
  }
}

function neuerSnack(name) {
  return {
    id: neueId(),
    name
  }
}


// --------------------------------------------------
// WOCHENPLAN
// --------------------------------------------------

function erstelleLeerenWochenplan() {
  return TAGE.map(tag => ({
    tag,
    gerichtId: null,
    snackIds: [],
    notiz: ''
  }))
}

function normalisiereWochenplan(plan) {
  if (!Array.isArray(plan)) {
    return erstelleLeerenWochenplan()
  }

  return TAGE.map(tag => {
    const alt = plan.find(
      eintrag => eintrag.tag === tag
    )

    return {
      tag,
      gerichtId: alt?.gerichtId || null,
      snackIds:
        Array.isArray(alt?.snackIds)
          ? alt.snackIds
          : [],
      notiz: alt?.notiz || ''
    }
  })
}


// --------------------------------------------------
// HILFSFUNKTIONEN
// --------------------------------------------------
function datumOhneUhrzeit(datum) {
  return new Date(
    datum.getFullYear(),
    datum.getMonth(),
    datum.getDate()
  )
}

function findeFreitagDerPlanungswoche() {
  const heute = datumOhneUhrzeit(new Date())

  const wochentag = heute.getDay()

  // JavaScript:
  // Sonntag = 0
  // Montag = 1
  // ...
  // Freitag = 5
  // Samstag = 6

  let differenz

  if (wochentag >= 5) {
    // Freitag oder Samstag:
    // Freitag dieser Woche verwenden
    differenz = 5 - wochentag
  } else {
    // Sonntag bis Donnerstag:
    // Freitag der vorherigen Kalenderwoche verwenden
    differenz = -(wochentag + 2)
  }

  heute.setDate(
    heute.getDate() + differenz
  )

  return heute
}

function datumZuSpeicherwert(datum) {
  const jahr = datum.getFullYear()

  const monat = String(
    datum.getMonth() + 1
  ).padStart(2, '0')

  const tag = String(
    datum.getDate()
  ).padStart(2, '0')

  return `${jahr}-${monat}-${tag}`
}

function speicherwertZuDatum(wert) {
  if (!wert) {
    return null
  }

  const teile = wert
    .split('-')
    .map(Number)

  if (teile.length !== 3) {
    return null
  }

  const [jahr, monat, tag] = teile

  const datum = new Date(
    jahr,
    monat - 1,
    tag
  )

  if (Number.isNaN(datum.getTime())) {
    return null
  }

  return datum
}

function ladeWochenStart() {
  const gespeichert =
    localStorage.getItem(
      STORAGE.wochenStart
    )

  const datum =
    speicherwertZuDatum(
      gespeichert
    )

  if (datum) {
    return datum
  }

  const freitag =
    findeFreitagDerPlanungswoche()

  localStorage.setItem(
    STORAGE.wochenStart,
    datumZuSpeicherwert(freitag)
  )

  return freitag
}

function datumFuerTag(index) {
  const datum =
    new Date(wochenStart)

  datum.setDate(
    datum.getDate() + index
  )

  return datum
}

function formatiereTagesDatum(datum) {
  return datum.toLocaleDateString(
    'de-DE',
    {
      day: '2-digit',
      month: '2-digit'
    }
  )
}

function formatiereWochenZeitraum() {
  const ende =
    datumFuerTag(6)

  const startText =
    wochenStart.toLocaleDateString(
      'de-DE',
      {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }
    )

  const endeText =
    ende.toLocaleDateString(
      'de-DE',
      {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }
    )

  return `${startText} – ${endeText}`
}
function findeGericht(id) {
  return gerichte.find(
    gericht => gericht.id === id
  )
}

function findeSnack(id) {
  return snacks.find(
    snack => snack.id === id
  )
}

function tageSeitDatum(datum) {
  if (!datum) {
    return Infinity
  }

  const damals = new Date(datum)

  if (Number.isNaN(damals.getTime())) {
    return Infinity
  }

  const heute = new Date()

  const differenz =
    heute.getTime() - damals.getTime()

  return Math.floor(
    differenz / (1000 * 60 * 60 * 24)
  )
}


// --------------------------------------------------
// INTELLIGENTE GERICHTAUSWAHL
// --------------------------------------------------

function gewichtFuerGericht(
  gericht,
  verwendeteKategorien = []
) {
  let gewicht = 1

  // Favoriten bekommen eine höhere Chance
  if (gericht.favorit) {
    gewicht *= 2
  }

  // Kürzlich gegessene Gerichte werden gebremst
  const tage = tageSeitDatum(
    gericht.zuletztGegessen
  )

  if (tage < 3) {
    gewicht *= 0.1
  } else if (tage < 7) {
    gewicht *= 0.25
  } else if (tage < 14) {
    gewicht *= 0.5
  } else if (tage < 30) {
    gewicht *= 0.8
  }

  // Bereits verwendete Kategorien werden
  // etwas unwahrscheinlicher
  const anzahlKategorie =
    verwendeteKategorien.filter(
      kategorie =>
        kategorie === gericht.kategorie
    ).length

  if (anzahlKategorie === 1) {
    gewicht *= 0.45
  }

  if (anzahlKategorie >= 2) {
    gewicht *= 0.15
  }

  return Math.max(gewicht, 0.01)
}

function gewichteteAuswahl(
  kandidaten,
  verwendeteKategorien = []
) {
  if (!kandidaten.length) {
    return null
  }

  const eintraege = kandidaten.map(
    gericht => ({
      gericht,
      gewicht: gewichtFuerGericht(
        gericht,
        verwendeteKategorien
      )
    })
  )

  const gesamtgewicht =
    eintraege.reduce(
      (summe, eintrag) =>
        summe + eintrag.gewicht,
      0
    )

  let zufall =
    Math.random() * gesamtgewicht

  for (const eintrag of eintraege) {
    zufall -= eintrag.gewicht

    if (zufall <= 0) {
      return eintrag.gericht
    }
  }

  return eintraege[
    eintraege.length - 1
  ].gericht
}


// --------------------------------------------------
// GANZE WOCHE PLANEN
// --------------------------------------------------

function planeWocheZufaellig() {
  if (!gerichte.length) {
    return
  }

  const bereitsVerwendet = new Set()

  const verwendeteKategorien = []

  wochenplan.forEach(eintrag => {
    let kandidaten = gerichte.filter(
      gericht =>
        !bereitsVerwendet.has(gericht.id)
    )

    // Wenn weniger Gerichte als Tage vorhanden sind,
    // dürfen Gerichte erst wiederholt werden,
    // nachdem alle einmal verwendet wurden.
    if (!kandidaten.length) {
      bereitsVerwendet.clear()

      kandidaten = [...gerichte]
    }

    const ausgewaehlt =
      gewichteteAuswahl(
        kandidaten,
        verwendeteKategorien
      )

    if (!ausgewaehlt) {
      eintrag.gerichtId = null
      return
    }

    eintrag.gerichtId =
      ausgewaehlt.id

    bereitsVerwendet.add(
      ausgewaehlt.id
    )

    verwendeteKategorien.push(
      ausgewaehlt.kategorie
    )
  })

  speichern()
  render()
}


// --------------------------------------------------
// EINZELNEN TAG NEU WÜRFELN
// --------------------------------------------------

function zufallsGerichtFuerTag(tag) {
  if (!gerichte.length) {
    return
  }

  const eintrag =
    wochenplan.find(
      item => item.tag === tag
    )

  if (!eintrag) {
    return
  }

  const bereitsVerwendet =
    new Set(
      wochenplan
        .filter(
          item =>
            item.tag !== tag &&
            item.gerichtId
        )
        .map(
          item => item.gerichtId
        )
    )

  let kandidaten =
    gerichte.filter(
      gericht =>
        !bereitsVerwendet.has(
          gericht.id
        )
    )

  if (!kandidaten.length) {
    kandidaten = [...gerichte]
  }

  const verwendeteKategorien =
    wochenplan
      .filter(
        item =>
          item.tag !== tag &&
          item.gerichtId
      )
      .map(item =>
        findeGericht(
          item.gerichtId
        )?.kategorie
      )
      .filter(Boolean)

  const ausgewaehlt =
    gewichteteAuswahl(
      kandidaten,
      verwendeteKategorien
    )

  if (!ausgewaehlt) {
    return
  }

  eintrag.gerichtId =
    ausgewaehlt.id

  speichern()
  render()
}


// --------------------------------------------------
// ALS GEGESSEN MARKIEREN
// --------------------------------------------------

function gerichtAlsGegessenMarkieren(tag) {
  const eintrag =
    wochenplan.find(
      item => item.tag === tag
    )

  if (!eintrag?.gerichtId) {
    return
  }

  const gericht =
    findeGericht(
      eintrag.gerichtId
    )

  if (!gericht) {
    return
  }

  gericht.zuletztGegessen =
    new Date().toISOString()

  speichern()
  render()
}

function datumAnzeigen(datum) {
  if (!datum) {
    return ''
  }

  const wert = new Date(datum)

  if (Number.isNaN(wert.getTime())) {
    return ''
  }

  return wert.toLocaleDateString(
    'de-DE'
  )
}


// --------------------------------------------------
// HAUPTANSICHT
// --------------------------------------------------

function render() {
  document.querySelector(
    '#app'
  ).innerHTML = `
    <main class="app-shell">

      <header class="app-header">

        <div>
          <h1>🍽️ Menüplaner</h1>
          <p>
            Wochenplanung von Freitag
            bis Donnerstag
          </p>
        </div>

        <nav
          class="navigation"
          aria-label="Hauptnavigation"
        >

          <button
            class="${
              aktuelleAnsicht === 'woche'
                ? 'aktiv'
                : ''
            }"
            data-view="woche"
          >
            📅 Wochenplan
          </button>

          <button
            class="${
              aktuelleAnsicht ===
              'verwaltung'
                ? 'aktiv'
                : ''
            }"
            data-view="verwaltung"
          >
            🗃️ Verwaltung
          </button>

        </nav>

      </header>

      ${
        aktuelleAnsicht === 'woche'
          ? renderWochenansicht()
          : renderVerwaltung()
      }

    </main>
  `

  verbindeNavigation()

  if (
    aktuelleAnsicht === 'woche'
  ) {
    verbindeWochenEvents()
  } else {
    verbindeVerwaltungsEvents()
  }
}


// --------------------------------------------------
// WOCHENANSICHT
// --------------------------------------------------

function renderWochenansicht() {
  return `
    <section class="seitenkopf">

      <div>
        <h2>Diese Woche</h2>

        <p>
          ${formatiereWochenZeitraum()}
        </p>
      </div>

      <button
        id="wocheWuerfeln"
        class="primary"
      >
        🎲 Ganze Woche erstellen
      </button>

    </section>

    <section class="tage-liste">

      ${wochenplan.map((eintrag, index) => {

        const gericht =
          findeGericht(
            eintrag.gerichtId
          )
  const tagesDatum =
    datumFuerTag(index)
        return `
          <article
            class="tageskarte"
            data-tag="${eintrag.tag}"
          >

            <div class="tageskopf">

              <h3>
               ${eintrag.tag},
  ${formatiereTagesDatum(tagesDatum)}
              </h3>

              <button
                class="secondary tag-wuerfeln"
                data-tag="${eintrag.tag}"
              >
                🎲 Gericht
              </button>

            </div>


            <div class="feldgruppe">

              <label
                for="gericht-${eintrag.tag}"
              >
                🍽️ Gericht
              </label>

              <select
                class="gericht-auswahl"
                id="gericht-${eintrag.tag}"
                data-tag="${eintrag.tag}"
              >

                <option value="">
                  Noch nichts geplant
                </option>

                ${gerichte.map(item => `
                  <option
                    value="${item.id}"
                    ${
                      item.id ===
                      eintrag.gerichtId
                        ? 'selected'
                        : ''
                    }
                  >
                    ${
                      item.favorit
                        ? '⭐ '
                        : ''
                    }
                    ${escapeHtml(item.name)}
                    ·
                    ${escapeHtml(
                      item.kategorie
                    )}
                  </option>
                `).join('')}

              </select>

              ${
                gericht
                  ? `
                    <div class="auswahl-info">

                      ${
                        gericht.favorit
                          ? '⭐ Favorit · '
                          : ''
                      }

                      ${escapeHtml(
                        gericht.kategorie
                      )}

                      ${
                        gericht.zuletztGegessen
                          ? `
                            · zuletzt gegessen:
                            ${datumAnzeigen(
                              gericht.zuletztGegessen
                            )}
                          `
                          : ''
                      }

                    </div>

                    <button
                      class="secondary gegessen-button"
                      data-tag="${eintrag.tag}"
                      style="margin-top: 8px;"
                    >
                      ✓ Als gegessen markieren
                    </button>
                  `
                  : ''
              }

            </div>


            <div class="feldgruppe">

              <div class="labelzeile">

                <span>
                  🍎 Snacks
                </span>

                <span class="anzahl">
                  ${eintrag.snackIds.length}
                </span>

              </div>

              <div class="snack-chips">

                ${
                  eintrag.snackIds.length
                    ? eintrag.snackIds
                        .map(
                          (
                            snackId,
                            index
                          ) => {

                            const snack =
                              findeSnack(
                                snackId
                              )

                            if (!snack) {
                              return ''
                            }

                            return `
                              <span class="chip">

                                ${escapeHtml(
                                  snack.name
                                )}

                                <button
                                  class="snack-entfernen"
                                  data-tag="${eintrag.tag}"
                                  data-index="${index}"
                                  title="Snack entfernen"
                                >
                                  ×
                                </button>

                              </span>
                            `
                          }
                        )
                        .join('')
                    : `
                      <span class="leertext">
                        Noch keine Snacks
                        ausgewählt.
                      </span>
                    `
                }

              </div>


              <div
                class="snack-hinzufuegen-zeile"
              >

                <select
                  class="snack-auswahl"
                  data-tag="${eintrag.tag}"
                >

                  <option value="">
                    Snack auswählen …
                  </option>

                  ${snacks.map(snack => `
                    <option
                      value="${snack.id}"
                    >
                      ${escapeHtml(
                        snack.name
                      )}
                    </option>
                  `).join('')}

                </select>

                <button
                  class="secondary snack-hinzufuegen"
                  data-tag="${eintrag.tag}"
                >
                  + Hinzufügen
                </button>

              </div>

            </div>


            <div class="feldgruppe">

              <label
                for="notiz-${eintrag.tag}"
              >
                📝 Notiz
              </label>

              <textarea
                id="notiz-${eintrag.tag}"
                class="notiz"
                data-tag="${eintrag.tag}"
                rows="3"
                placeholder="z. B. Training, Besuch, später essen …"
              >${escapeHtml(
                eintrag.notiz
              )}</textarea>

            </div>

          </article>
        `
      }).join('')}

    </section>
  `
}


// --------------------------------------------------
// VERWALTUNG
// --------------------------------------------------

function renderVerwaltung() {
  return `
    <section class="seitenkopf">

      <div>
        <h2>Verwaltung</h2>

        <p>
          Hier werden Gerichte und Snacks
          einmal angelegt und später im
          Wochenplan ausgewählt.
        </p>
      </div>

    </section>


    <section class="verwaltung-grid">


      <article class="verwaltung-karte">

        <h3>🍽️ Meine Gerichte</h3>


        <form
          id="gerichtForm"
          class="eingabe-form"
        >

          <input
            id="gerichtName"
            type="text"
            placeholder="Gericht eingeben"
            required
          >

          <select id="gerichtKategorie">

            ${GERICHT_KATEGORIEN.map(
              kategorie => `
                <option value="${kategorie}">
                  ${kategorie}
                </option>
              `
            ).join('')}

          </select>

          <button
            class="primary"
            type="submit"
          >
            + Gericht
          </button>

        </form>


        <div class="stammdaten-liste">

          ${
            gerichte.length
              ? gerichte.map(gericht => {

                  const wirdBearbeitet =
                    bearbeitetesGerichtId === gericht.id

                  if (wirdBearbeitet) {
                    return `
                      <div class="bearbeiten-box">

                        <input
                          class="gericht-bearbeiten-name"
                          data-id="${gericht.id}"
                          type="text"
                          value="${escapeHtml(gericht.name)}"
                        >

                        <select
                          class="gericht-bearbeiten-kategorie"
                          data-id="${gericht.id}"
                        >

                          ${GERICHT_KATEGORIEN.map(
                            kategorie => `
                              <option
                                value="${kategorie}"
                                ${
                                  gericht.kategorie === kategorie
                                    ? 'selected'
                                    : ''
                                }
                              >
                                ${kategorie}
                              </option>
                            `
                          ).join('')}

                        </select>

                        <div class="bearbeiten-buttons">

                          <button
                            class="primary gericht-speichern"
                            data-id="${gericht.id}"
                          >
                            💾 Speichern
                          </button>

                          <button
                            class="secondary gericht-abbrechen"
                            data-id="${gericht.id}"
                          >
                            Abbrechen
                          </button>

                        </div>

                      </div>
                    `
                  }

                  return `
                    <div class="stammdaten-zeile">

                      <button
                        class="favorit-toggle icon-button"
                        data-id="${gericht.id}"
                        title="Favorit"
                      >
                        ${
                          gericht.favorit
                            ? '⭐'
                            : '☆'
                        }
                      </button>

                      <div class="stammdaten-text">

                        <strong>
                          ${escapeHtml(gericht.name)}
                        </strong>

                        <small>
                          ${escapeHtml(gericht.kategorie)}

                          ${
                            gericht.zuletztGegessen
                              ? `
                                · zuletzt:
                                ${datumAnzeigen(
                                  gericht.zuletztGegessen
                                )}
                              `
                              : ''
                          }
                        </small>

                      </div>

                      <div class="aktions-buttons">

                        <button
                          class="secondary gericht-bearbeiten"
                          data-id="${gericht.id}"
                        >
                          ✏️
                        </button>

                        <button
                          class="danger gericht-loeschen"
                          data-id="${gericht.id}"
                        >
                          Löschen
                        </button>

                      </div>

                    </div>
                  `
                }).join('')

              : `
                <p class="leertext">
                  Noch keine Gerichte angelegt.
                </p>
              `
          }

        </div>

      </article>


      <article class="verwaltung-karte">

        <h3>🍎 Meine Snacks</h3>

        <p class="hinweis">
          Snacks sind eigene Stammdaten.
          Keine Kategorie, keine Favoriten.
        </p>


        <form
          id="snackForm"
          class="eingabe-form snack-form"
        >

          <input
            id="snackName"
            type="text"
            placeholder="Snack eingeben"
            required
          >

          <button
            class="primary"
            type="submit"
          >
            + Snack
          </button>

        </form>


        <div class="stammdaten-liste">

          ${
            snacks.length
              ? snacks.map(snack => {

                  const wirdBearbeitet =
                    bearbeiteterSnackId === snack.id

                  if (wirdBearbeitet) {
                    return `
                      <div class="bearbeiten-box">

                        <input
                          class="snack-bearbeiten-name"
                          data-id="${snack.id}"
                          type="text"
                          value="${escapeHtml(snack.name)}"
                        >

                        <div class="bearbeiten-buttons">

                          <button
                            class="primary snack-speichern"
                            data-id="${snack.id}"
                          >
                            💾 Speichern
                          </button>

                          <button
                            class="secondary snack-abbrechen"
                            data-id="${snack.id}"
                          >
                            Abbrechen
                          </button>

                        </div>

                      </div>
                    `
                  }

                  return `
                    <div class="stammdaten-zeile">

                      <div class="stammdaten-text">

                        <strong>
                          ${escapeHtml(snack.name)}
                        </strong>

                      </div>

                      <div class="aktions-buttons">

                        <button
                          class="secondary snack-bearbeiten"
                          data-id="${snack.id}"
                        >
                          ✏️
                        </button>

                        <button
                          class="danger snack-loeschen"
                          data-id="${snack.id}"
                        >
                          Löschen
                        </button>

                      </div>

                    </div>
                  `
                }).join('')

              : `
                <p class="leertext">
                  Noch keine Snacks angelegt.
                </p>
              `
          }

        </div>

      </article>


    </section>
  `
}


// --------------------------------------------------
// NAVIGATION
// --------------------------------------------------

function verbindeNavigation() {
  document
    .querySelectorAll(
      '[data-view]'
    )
    .forEach(button => {

      button.addEventListener(
        'click',
        () => {

          aktuelleAnsicht =
            button.dataset.view

          render()
        }
      )
    })
}


// --------------------------------------------------
// EVENTS WOCHENPLAN
// --------------------------------------------------

function verbindeWochenEvents() {

  document
    .querySelector(
      '#wocheWuerfeln'
    )
    ?.addEventListener(
      'click',
      planeWocheZufaellig
    )


  document
    .querySelectorAll(
      '.tag-wuerfeln'
    )
    .forEach(button => {

      button.addEventListener(
        'click',
        () =>
          zufallsGerichtFuerTag(
            button.dataset.tag
          )
      )
    })


  document
    .querySelectorAll(
      '.gericht-auswahl'
    )
    .forEach(select => {

      select.addEventListener(
        'change',
        () => {

          const eintrag =
            wochenplan.find(
              item =>
                item.tag ===
                select.dataset.tag
            )

          eintrag.gerichtId =
            select.value || null

          speichern()
          render()
        }
      )
    })


  document
    .querySelectorAll(
      '.gegessen-button'
    )
    .forEach(button => {

      button.addEventListener(
        'click',
        () =>
          gerichtAlsGegessenMarkieren(
            button.dataset.tag
          )
      )
    })


  document
    .querySelectorAll(
      '.snack-hinzufuegen'
    )
    .forEach(button => {

      button.addEventListener(
        'click',
        () => {

          const tag =
            button.dataset.tag

          const select =
            document.querySelector(
              `.snack-auswahl[data-tag="${tag}"]`
            )

          if (!select.value) {
            return
          }

          const eintrag =
            wochenplan.find(
              item =>
                item.tag === tag
            )

          eintrag.snackIds.push(
            select.value
          )

          speichern()
          render()
        }
      )
    })


  document
    .querySelectorAll(
      '.snack-entfernen'
    )
    .forEach(button => {

      button.addEventListener(
        'click',
        () => {

          const eintrag =
            wochenplan.find(
              item =>
                item.tag ===
                button.dataset.tag
            )

          eintrag.snackIds.splice(
            Number(
              button.dataset.index
            ),
            1
          )

          speichern()
          render()
        }
      )
    })


  document
    .querySelectorAll(
      '.notiz'
    )
    .forEach(textarea => {

      textarea.addEventListener(
        'input',
        () => {

          const eintrag =
            wochenplan.find(
              item =>
                item.tag ===
                textarea.dataset.tag
            )

          eintrag.notiz =
            textarea.value

          speichern()
        }
      )
    })
}


// --------------------------------------------------
// EVENTS VERWALTUNG
// --------------------------------------------------

function verbindeVerwaltungsEvents() {

  document
    .querySelector(
      '#gerichtForm'
    )
    ?.addEventListener(
      'submit',
      event => {

        event.preventDefault()

        const name =
          document
            .querySelector(
              '#gerichtName'
            )
            .value
            .trim()

        const kategorie =
          document
            .querySelector(
              '#gerichtKategorie'
            )
            .value

        if (!name) {
          return
        }

        gerichte.push(
          neuesGericht(
            name,
            kategorie
          )
        )

        speichern()
        render()
      }
    )


  document
    .querySelector(
      '#snackForm'
    )
    ?.addEventListener(
      'submit',
      event => {

        event.preventDefault()

        const name =
          document
            .querySelector(
              '#snackName'
            )
            .value
            .trim()

        if (!name) {
          return
        }

        snacks.push(
          neuerSnack(name)
        )

        speichern()
        render()
      }
    )


  document
    .querySelectorAll(
      '.favorit-toggle'
    )
    .forEach(button => {

      button.addEventListener(
        'click',
        () => {

          const gericht =
            findeGericht(
              button.dataset.id
            )

          if (!gericht) {
            return
          }

          gericht.favorit =
            !gericht.favorit

          speichern()
          render()
        }
      )
    })
  // ------------------------------------------------
  // GERICHT BEARBEITEN
  // ------------------------------------------------

  document
    .querySelectorAll('.gericht-bearbeiten')
    .forEach(button => {

      button.addEventListener('click', () => {

        bearbeitetesGerichtId =
          button.dataset.id

        bearbeiteterSnackId = null

        render()
      })
    })


  document
    .querySelectorAll('.gericht-abbrechen')
    .forEach(button => {

      button.addEventListener('click', () => {

        bearbeitetesGerichtId = null

        render()
      })
    })


  document
    .querySelectorAll('.gericht-speichern')
    .forEach(button => {

      button.addEventListener('click', () => {

        const id = button.dataset.id

        const gericht =
          findeGericht(id)

        if (!gericht) {
          return
        }

        const nameFeld =
          document.querySelector(
            `.gericht-bearbeiten-name[data-id="${id}"]`
          )

        const kategorieFeld =
          document.querySelector(
            `.gericht-bearbeiten-kategorie[data-id="${id}"]`
          )

        const neuerName =
          nameFeld.value.trim()

        if (!neuerName) {
          return
        }

        gericht.name = neuerName
        gericht.kategorie =
          kategorieFeld.value

        bearbeitetesGerichtId = null

        speichern()
        render()
      })
    })


  // ------------------------------------------------
  // SNACK BEARBEITEN
  // ------------------------------------------------

  document
    .querySelectorAll('.snack-bearbeiten')
    .forEach(button => {

      button.addEventListener('click', () => {

        bearbeiteterSnackId =
          button.dataset.id

        bearbeitetesGerichtId = null

        render()
      })
    })


  document
    .querySelectorAll('.snack-abbrechen')
    .forEach(button => {

      button.addEventListener('click', () => {

        bearbeiteterSnackId = null

        render()
      })
    })


  document
    .querySelectorAll('.snack-speichern')
    .forEach(button => {

      button.addEventListener('click', () => {

        const id = button.dataset.id

        const snack =
          findeSnack(id)

        if (!snack) {
          return
        }

        const nameFeld =
          document.querySelector(
            `.snack-bearbeiten-name[data-id="${id}"]`
          )

        const neuerName =
          nameFeld.value.trim()

        if (!neuerName) {
          return
        }

        snack.name = neuerName

        bearbeiteterSnackId = null

        speichern()
        render()
      })
    })

  document
    .querySelectorAll(
      '.gericht-loeschen'
    )
    .forEach(button => {

      button.addEventListener(
        'click',
        () => {

          const id =
            button.dataset.id

          gerichte =
            gerichte.filter(
              gericht =>
                gericht.id !== id
            )

          wochenplan.forEach(
            eintrag => {

              if (
                eintrag.gerichtId === id
              ) {
                eintrag.gerichtId = null
              }
            }
          )

          speichern()
          render()
        }
      )
    })


  document
    .querySelectorAll(
      '.snack-loeschen'
    )
    .forEach(button => {

      button.addEventListener(
        'click',
        () => {

          const id =
            button.dataset.id

          snacks =
            snacks.filter(
              snack =>
                snack.id !== id
            )

          wochenplan.forEach(
            eintrag => {

              eintrag.snackIds =
                eintrag.snackIds.filter(
                  snackId =>
                    snackId !== id
                )
            }
          )

          speichern()
          render()
        }
      )
    })
}


// --------------------------------------------------
// HTML SICHER AUSGEBEN
// --------------------------------------------------

function escapeHtml(wert) {
  return String(
    wert ?? ''
  )
    .replaceAll(
      '&',
      '&amp;'
    )
    .replaceAll(
      '<',
      '&lt;'
    )
    .replaceAll(
      '>',
      '&gt;'
    )
    .replaceAll(
      '"',
      '&quot;'
    )
    .replaceAll(
      "'",
      '&#039;'
    )
}


// --------------------------------------------------
// START
// --------------------------------------------------

speichern()
render()