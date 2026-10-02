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

  wochenPlaene: 'menueplaner_wochenplaene',

  wochenStart: 'menueplaner_wochenstart',

  einkaufslisten: 'menueplaner_einkaufslisten',

  einkaufsHistorie: 'menueplaner_einkaufshistorie'

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

// Auch bereits gespeicherte Gerichte aus neueren Versionen normalisieren.
// So erhalten alte Datensaetze automatisch z. B. zutaten: [].
gerichte = Array.isArray(gerichte)
  ? gerichte.map(normalisiereGericht)
  : []

let snacks = ladeDaten(STORAGE.snacks, [

  neuerSnack('Apfel'),

  neuerSnack('Joghurt'),

  neuerSnack('Banane'),

  neuerSnack('Müsliriegel')

])



let wochenStart = ladeWochenStart()

let wochenPlaene = ladeDaten(

  STORAGE.wochenPlaene,

  {}

)



// Alten einzelnen Wochenplan einmalig in das neue
// Mehrwochen-System übernehmen.
const alterWochenplan = ladeDaten(

  STORAGE.woche,

  null

)

const startSchluessel = datumZuSpeicherwert(wochenStart)

if (
  !wochenPlaene[startSchluessel] &&
  Array.isArray(alterWochenplan)
) {
  wochenPlaene[startSchluessel] =
    normalisiereWochenplan(alterWochenplan)
}

let wochenplan = ladeWochenplan(wochenStart)

let einkaufslisten = ladeDaten(
  STORAGE.einkaufslisten,
  {}
)

let einkaufsHistorie = ladeDaten(STORAGE.einkaufsHistorie, {})

// Beim ersten Start nach dem Update vorhandene Einkaufsartikel als Historie übernehmen.
if (!Object.keys(einkaufsHistorie).length) {
  Object.values(einkaufslisten || {}).forEach(woche => {
    const listen = Array.isArray(woche) ? [{ eintraege: woche }] : (woche?.listen || [])
    listen.forEach(liste => {
      ;(liste.eintraege || []).forEach(eintrag => {
        const text = String(eintrag?.text || '').trim()
        if (!text) return
        const key = text.toLocaleLowerCase('de-DE')
        const alt = einkaufsHistorie[key] || { text, anzahl: 0, zuletzt: null }
        einkaufsHistorie[key] = { text, anzahl: Number(alt.anzahl || 0) + 1, zuletzt: alt.zuletzt }
      })
    })
  })
}

let aktuelleAnsicht = 'woche'

let bearbeitetesGerichtId = null

let bearbeiteterSnackId = null

let offeneEinkaufslisteId = 'essen'



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



  const wochenSchluessel =
    datumZuSpeicherwert(wochenStart)

  wochenPlaene[wochenSchluessel] =
    normalisiereWochenplan(wochenplan)

  localStorage.setItem(

    STORAGE.wochenPlaene,

    JSON.stringify(wochenPlaene)

  )

  localStorage.setItem(

    STORAGE.einkaufslisten,

    JSON.stringify(einkaufslisten)

  )

  localStorage.setItem(
    STORAGE.einkaufsHistorie,
    JSON.stringify(einkaufsHistorie)
  )

  localStorage.setItem(

    STORAGE.wochenStart,

    wochenSchluessel

  )

}





// --------------------------------------------------
// BACKUP UND WIEDERHERSTELLUNG
// --------------------------------------------------

function erstelleBackupDaten() {
  speichern()

  const daten = {}
  Object.entries(STORAGE).forEach(([name, key]) => {
    const roh = localStorage.getItem(key)
    daten[name] = roh === null ? null : JSON.parse(roh)
  })

  return {
    format: 'menueplaner-backup',
    version: 1,
    erstelltAm: new Date().toISOString(),
    daten
  }
}

function backupHerunterladen() {
  const backup = erstelleBackupDaten()
  const inhalt = JSON.stringify(backup, null, 2)
  const blob = new Blob([inhalt], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const datum = new Date().toISOString().slice(0, 10)

  link.href = url
  link.download = `menueplaner-backup-${datum}.json`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

async function backupWiederherstellen(datei) {
  if (!datei) return

  let backup
  try {
    backup = JSON.parse(await datei.text())
  } catch {
    alert('Die Datei konnte nicht als Menüplaner-Backup gelesen werden.')
    return
  }

  if (
    backup?.format !== 'menueplaner-backup' ||
    backup?.version !== 1 ||
    !backup?.daten ||
    typeof backup.daten !== 'object'
  ) {
    alert('Das ist kein gültiges Menüplaner-Backup.')
    return
  }

  if (!confirm('Backup wirklich wiederherstellen? Die aktuell gespeicherten Daten dieses Browsers werden dadurch ersetzt.')) {
    return
  }

  Object.entries(STORAGE).forEach(([name, key]) => {
    if (!(name in backup.daten)) return
    const wert = backup.daten[name]
    if (wert === null) {
      localStorage.removeItem(key)
    } else {
      localStorage.setItem(key, JSON.stringify(wert))
    }
  })

  location.reload()
}

function renderDatenansicht() {
  return `
    <section class="seitenkopf">
      <div>
        <h2>Daten & Backup</h2>
        <p>Deine Daten liegen auf diesem Gerät. Ein Backup schützt sie, falls Browserdaten gelöscht werden.</p>
      </div>
    </section>

    <section class="backup-grid">
      <article class="verwaltung-karte backup-karte">
        <h3>💾 Backup erstellen</h3>
        <p>Speichert Gerichte, Snacks, Wochenpläne, Einkaufslisten und Einkaufshistorie in einer Datei.</p>
        <button class="primary" id="backupErstellen">Backup herunterladen</button>
      </article>

      <article class="verwaltung-karte backup-karte">
        <h3>📥 Backup wiederherstellen</h3>
        <p>Wähle eine zuvor gespeicherte Menüplaner-Backup-Datei. Die aktuellen Browserdaten werden erst nach deiner Bestätigung ersetzt.</p>
        <label class="secondary datei-button" for="backupDatei">Backup-Datei auswählen</label>
        <input id="backupDatei" class="backup-datei" type="file" accept="application/json,.json">
      </article>

      <article class="verwaltung-karte backup-hinweis">
        <strong>Automatisches Speichern ist aktiv.</strong>
        <p>Änderungen werden direkt lokal gespeichert. Zusätzlich wird beim Verlassen oder Ausblenden der Seite noch einmal gespeichert.</p>
      </article>
    </section>
  `
}

function verbindeDatenEvents() {
  document.querySelector('#backupErstellen')?.addEventListener('click', backupHerunterladen)
  document.querySelector('#backupDatei')?.addEventListener('change', event => {
    backupWiederherstellen(event.target.files?.[0])
  })
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

    zuletztGegessen: null,

    zutaten: []

  }

}



function normalisiereGericht(gericht) {

  return {

    id: gericht.id || neueId(),

    name: gericht.name || 'Unbenanntes Gericht',

    kategorie: gericht.kategorie || 'Sonstiges',

    favorit: Boolean(gericht.favorit),

    zuletztGegessen:

      gericht.zuletztGegessen || null,

    zutaten: Array.isArray(gericht.zutaten)
      ? gericht.zutaten.filter(Boolean)
      : []

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





function ladeWochenplan(startDatum) {
  const schluessel =
    datumZuSpeicherwert(startDatum)

  const gespeichert =
    wochenPlaene?.[schluessel]

  return normalisiereWochenplan(
    gespeichert || erstelleLeerenWochenplan()
  )
}

function wechsleWoche(wochenDifferenz) {
  speichern()

  const neuerStart = new Date(wochenStart)

  neuerStart.setDate(
    neuerStart.getDate() + wochenDifferenz * 7
  )

  wochenStart = datumOhneUhrzeit(neuerStart)
  wochenplan = ladeWochenplan(wochenStart)

  speichern()
  render()
}

function geheZurAktuellenWoche() {
  speichern()

  wochenStart = findeFreitagDerPlanungswoche()
  wochenplan = ladeWochenplan(wochenStart)

  speichern()
  render()
}

function istAktuelleWoche() {
  return (
    datumZuSpeicherwert(wochenStart) ===
    datumZuSpeicherwert(
      findeFreitagDerPlanungswoche()
    )
  )
}



// --------------------------------------------------
// EINKAUFSLISTE
// --------------------------------------------------

function einkaufsSchluessel() {
  return datumZuSpeicherwert(wochenStart)
}

function normalisiereEinkaufsEintrag(eintrag) {
  const alteQuelle = eintrag?.quelle || 'manuell'
  const quellen = Array.isArray(eintrag?.quellen)
    ? eintrag.quellen.filter(Boolean)
    : alteQuelle !== 'manuell' && alteQuelle !== 'gericht'
      ? [alteQuelle]
      : []

  return {
    id: eintrag?.id || neueId(),
    text: String(eintrag?.text || '').trim(),
    erledigt: Boolean(eintrag?.erledigt),
    quelle: quellen.length ? 'gericht' : 'manuell',
    quellen: [...new Set(quellen)],
    notiz: String(eintrag?.notiz || '')
  }
}

function einkaufsListenDerWoche() {
  const key = einkaufsSchluessel()
  const gespeichert = einkaufslisten[key]

  // Migration: Der bisherige Stand war direkt ein Array.
  // Dieses Array wird automatisch zur festen Hauptliste "Essen".
  if (Array.isArray(gespeichert)) {
    einkaufslisten[key] = {
      listen: [{
        id: 'essen',
        name: 'Essen',
        fest: true,
        eintraege: gespeichert
          .map(normalisiereEinkaufsEintrag)
          .filter(eintrag => eintrag.text)
      }]
    }
  }

  if (!einkaufslisten[key] || !Array.isArray(einkaufslisten[key].listen)) {
    einkaufslisten[key] = { listen: [] }
  }

  let listen = einkaufslisten[key].listen
    .map(liste => ({
      id: liste.id || neueId(),
      name: String(liste.name || 'Einkaufsliste').trim(),
      fest: Boolean(liste.fest),
      eintraege: Array.isArray(liste.eintraege)
        ? liste.eintraege.map(normalisiereEinkaufsEintrag).filter(e => e.text)
        : []
    }))

  let essen = listen.find(liste => liste.id === 'essen' || liste.fest)
  if (!essen) {
    essen = { id: 'essen', name: 'Essen', fest: true, eintraege: [] }
    listen.unshift(essen)
  } else {
    essen.id = 'essen'
    essen.name = 'Essen'
    essen.fest = true
    listen = [essen, ...listen.filter(liste => liste !== essen && liste.id !== 'essen')]
  }

  einkaufslisten[key].listen = listen
  return listen
}

function findeEinkaufsliste(id = offeneEinkaufslisteId) {
  return einkaufsListenDerWoche().find(liste => liste.id === id) || null
}

function aktuelleEinkaufsliste() {
  return findeEinkaufsliste()?.eintraege || []
}

function merkeEinkaufsArtikel(text) {
  const sauber = String(text || '').trim()
  if (!sauber) return

  const key = sauber.toLocaleLowerCase('de-DE')
  const alt = einkaufsHistorie[key] || { text: sauber, anzahl: 0, zuletzt: null }
  einkaufsHistorie[key] = {
    text: sauber,
    anzahl: Number(alt.anzahl || 0) + 1,
    zuletzt: new Date().toISOString()
  }
}

function einkaufsVorschlaege() {
  return Object.values(einkaufsHistorie)
    .filter(item => item?.text)
    .sort((a, b) =>
      Number(b.anzahl || 0) - Number(a.anzahl || 0) ||
      String(b.zuletzt || '').localeCompare(String(a.zuletzt || '')) ||
      a.text.localeCompare(b.text, 'de')
    )
    .slice(0, 80)
}

function einkaufsEintragHinzufuegen(text, quelle = 'manuell', listenId = offeneEinkaufslisteId) {
  const sauber = String(text || '').trim()
  if (!sauber) return false

  const zielId = quelle === 'manuell' ? listenId : 'essen'
  const liste = findeEinkaufsliste(zielId)
  if (!liste) return false

  const vorhanden = liste.eintraege.find(eintrag =>
    eintrag.text.toLocaleLowerCase('de-DE') === sauber.toLocaleLowerCase('de-DE')
  )

  if (vorhanden) {
    if (quelle === 'manuell') merkeEinkaufsArtikel(sauber)
    if (quelle !== 'manuell' && !vorhanden.quellen.includes(quelle)) {
      vorhanden.quellen.push(quelle)
      vorhanden.quelle = 'gericht'
    }
    speichern()
    return false
  }

  if (quelle === 'manuell') merkeEinkaufsArtikel(sauber)

  liste.eintraege.push({
    id: neueId(),
    text: sauber,
    erledigt: false,
    quelle: quelle === 'manuell' ? 'manuell' : 'gericht',
    quellen: quelle === 'manuell' ? [] : [quelle],
    notiz: ''
  })

  speichern()
  return true
}

function zutatenDerWocheUebernehmen() {
  wochenplan.forEach(eintrag => {
    const gericht = findeGericht(eintrag.gerichtId)
    if (!gericht) return
    gericht.zutaten.forEach(zutat => {
      einkaufsEintragHinzufuegen(zutat, gericht.name, 'essen')
    })
  })

  offeneEinkaufslisteId = 'essen'
  speichern()
  render()
}

function parseZutaten(text) {
  return String(text || '')
    .split(/\n|,|;/)
    .map(zutat => zutat.trim())
    .filter(Boolean)
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

              aktuelleAnsicht === 'einkauf'

                ? 'aktiv'

                : ''

            }"

            data-view="einkauf"

          >

            🛒 Einkaufsliste

          </button>



          <button class="${aktuelleAnsicht === 'gerichte' ? 'aktiv' : ''}" data-view="gerichte">
            🍽️ Gerichte
          </button>

          <button class="${aktuelleAnsicht === 'snacks' ? 'aktiv' : ''}" data-view="snacks">
            🍎 Snacks
          </button>

          <button class="${aktuelleAnsicht === 'daten' ? 'aktiv' : ''}" data-view="daten">
            💾 Daten
          </button>



        </nav>



      </header>



      ${

        aktuelleAnsicht === 'woche'

          ? renderWochenansicht()

          : aktuelleAnsicht === 'einkauf'
            ? renderEinkaufsliste()
            : aktuelleAnsicht === 'gerichte'
              ? renderVerwaltung('gerichte')
              : aktuelleAnsicht === 'snacks'
                ? renderVerwaltung('snacks')
                : renderDatenansicht()

      }



    </main>

  `



  verbindeNavigation()



  if (

    aktuelleAnsicht === 'woche'

  ) {

    verbindeWochenEvents()

  } else if (

    aktuelleAnsicht === 'einkauf'

  ) {

    verbindeEinkaufsEvents()

  } else if (

    aktuelleAnsicht === 'daten'

  ) {

    verbindeDatenEvents()

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
        <h2>
          Wochenplan
        </h2>

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

    <section
      class="wochen-navigation"
      style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 18px;"
    >
      <button
        id="vorherigeWoche"
        class="secondary"
      >
        ← Vorherige Woche
      </button>

      <button
        id="aktuelleWoche"
        class="secondary"
        ${istAktuelleWoche() ? 'disabled' : ''}
      >
        📅 Aktuelle Woche
      </button>

      <button
        id="naechsteWoche"
        class="secondary"
      >
        Nächste Woche →
      </button>
    </section>



    <section class="druckansicht druck-wochenplan">
      <h1>Wochenplan</h1>
      <p class="druck-zeitraum">${formatiereWochenZeitraum()}</p>
      <div class="druck-tabelle">
        ${wochenplan.map((eintrag, index) => {
          const gericht = findeGericht(eintrag.gerichtId)
          const snackNamen = eintrag.snackIds.map(id => findeSnack(id)?.name).filter(Boolean)
          return `
            <div class="druck-zeile">
              <strong>${escapeHtml(eintrag.tag)}, ${formatiereTagesDatum(datumFuerTag(index))}</strong>
              <span>${gericht ? escapeHtml(gericht.name) : '–'}</span>
              <span>${snackNamen.length ? 'Snacks: ' + snackNamen.map(escapeHtml).join(', ') : ''}</span>
              <span>${eintrag.notiz ? 'Notiz: ' + escapeHtml(eintrag.notiz) : ''}</span>
            </div>
          `
        }).join('')}
      </div>
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

              <input
                id="notiz-${eintrag.tag}"
                class="notiz tagesnotiz"
                data-tag="${eintrag.tag}"
                type="text"
                value="${escapeHtml(eintrag.notiz)}"
                placeholder="📝 Notiz …"
                aria-label="Notiz für ${eintrag.tag}"
              >

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

                  Gericht auswählen …

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

                      class="secondary gegessen-button klein"

                      data-tag="${eintrag.tag}"

                    >

                      ✓ gegessen

                    </button>

                  `

                  : ''

              }



            </div>





            <div class="feldgruppe">



              ${eintrag.snackIds.length ? `<div class="snack-bestaende">

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
              </div>` : ''}

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





          </article>

        `

      }).join('')}



    </section>

    <div class="druckbereich-unten">
      <button class="secondary drucken-button" id="wochenDrucken">🖨️ Drucken / PDF</button>
    </div>

  `

}





// --------------------------------------------------

// VERWALTUNG

// --------------------------------------------------



function renderEinkaufsliste() {
  const listen = einkaufsListenDerWoche()
  if (offeneEinkaufslisteId && !listen.some(liste => liste.id === offeneEinkaufslisteId)) {
    offeneEinkaufslisteId = 'essen'
  }

  const aktiveListe = offeneEinkaufslisteId ? findeEinkaufsliste(offeneEinkaufslisteId) : null
  const gerichteMitZutaten = wochenplan
    .map(eintrag => findeGericht(eintrag.gerichtId))
    .filter(gericht => gericht?.zutaten?.length)

  const eintragHtml = eintrag => `
    <div class="stammdaten-zeile einkaufs-zeile">
      <input
        class="einkauf-erledigt"
        data-id="${eintrag.id}"
        type="checkbox"
        ${eintrag.erledigt ? 'checked' : ''}
      >
      <div class="stammdaten-text">
        <strong class="${eintrag.erledigt ? 'durchgestrichen' : ''}">${escapeHtml(eintrag.text)}</strong>
        ${eintrag.quellen.length ? `<small>aus: ${eintrag.quellen.map(escapeHtml).join(', ')}</small>` : ''}
        <input
          class="einkauf-notiz"
          data-id="${eintrag.id}"
          type="text"
          value="${escapeHtml(eintrag.notiz)}"
          placeholder="Mengennotiz …"
          aria-label="Mengennotiz für ${escapeHtml(eintrag.text)}"
        >
      </div>
      <button class="danger einkauf-loeschen" data-id="${eintrag.id}">Löschen</button>
    </div>
  `

  let listenInhalt = ''
  if (aktiveListe) {
    const offen = aktiveListe.eintraege.filter(e => !e.erledigt)
    const erledigt = aktiveListe.eintraege.filter(e => e.erledigt)

    listenInhalt = `
      <article class="verwaltung-karte einkaufslisten-inhalt">
        <div class="listen-kopf">
          <div>
            <h3>${aktiveListe.fest ? '🍽️' : '🛒'} ${escapeHtml(aktiveListe.name)}</h3>
            <p class="hinweis">${offen.length} offen · ${erledigt.length} erledigt</p>
          </div>
          ${aktiveListe.fest ? '' : `<button class="danger liste-loeschen" data-list-id="${aktiveListe.id}">Liste löschen</button>`}
        </div>

        <form id="einkaufForm" class="snack-hinzufuegen-zeile">
          <input id="einkaufText" type="text" placeholder="Artikel hinzufügen …" autocomplete="off" list="einkaufVorschlaege" required>
          <datalist id="einkaufVorschlaege">
            ${einkaufsVorschlaege().map(item => `<option value="${escapeHtml(item.text)}"></option>`).join('')}
          </datalist>
          <button class="primary" type="submit">Artikel hinzufügen</button>
        </form>

        ${aktiveListe.id === 'essen' ? `
          <button id="zutatenUebernehmen" class="secondary zutaten-button" ${gerichteMitZutaten.length ? '' : 'disabled'}>
            🍝 Zutaten der Woche übernehmen
          </button>
        ` : ''}

        <div class="einkaufs-gruppe">
          ${offen.length ? offen.map(eintragHtml).join('') : '<p class="leertext">Nichts offen.</p>'}
        </div>

        ${erledigt.length ? `
          <details class="erledigt-details">
            <summary>✅ Erledigt (${erledigt.length})</summary>
            <div class="einkaufs-gruppe">${erledigt.map(eintragHtml).join('')}</div>
            <button id="einkaufErledigteLoeschen" class="secondary">Erledigte entfernen</button>
          </details>
        ` : ''}

        ${aktiveListe.eintraege.length ? `<button id="einkaufAllesLoeschen" class="danger liste-leeren">Liste leeren</button>` : ''}
      </article>
    `
  }

  return `
    <section class="seitenkopf kompakter-seitenkopf">
      <div>
        <h2>🛒 Einkaufsliste</h2>
        <p>${formatiereWochenZeitraum()}</p>
      </div>
    </section>

    <section class="wochen-navigation">
      <button id="einkaufVorherigeWoche" class="secondary">← Vorherige Woche</button>
      <button id="einkaufAktuelleWoche" class="secondary" ${istAktuelleWoche() ? 'disabled' : ''}>📅 Aktuelle Woche</button>
      <button id="einkaufNaechsteWoche" class="secondary">Nächste Woche →</button>
    </section>

    <section class="einkaufslisten-buttons">
      ${listen.map(liste => `
        <button
          class="listen-button ${offeneEinkaufslisteId === liste.id ? 'aktiv' : ''}"
          data-list-id="${liste.id}"
        >
          ${liste.fest ? '🍽️' : '🛒'} ${escapeHtml(liste.name)}
          <span>${liste.eintraege.filter(e => !e.erledigt).length}</span>
        </button>
      `).join('')}
    </section>

    <form id="neueListeForm" class="neue-liste-form">
      <input id="neueListeName" type="text" placeholder="Neue Liste, z. B. Drogerie" maxlength="40" required>
      <button class="secondary" type="submit">＋ Neue Liste</button>
    </form>

    ${listenInhalt}

    ${aktiveListe ? `
      <section class="druckansicht druck-einkaufsliste">
        <h1>Einkaufsliste · ${escapeHtml(aktiveListe.name)}</h1>
        <p class="druck-zeitraum">${formatiereWochenZeitraum()}</p>
        <div class="druck-einkauf-items">
          ${aktiveListe.eintraege.map(eintrag => `
            <div class="druck-einkauf-item ${eintrag.erledigt ? 'druck-erledigt' : ''}">
              <span class="druck-check">□</span>
              <div>
                <strong>${escapeHtml(eintrag.text)}</strong>
                ${eintrag.notiz ? `<span>${escapeHtml(eintrag.notiz)}</span>` : ''}
                ${eintrag.quellen.length ? `<small>aus: ${eintrag.quellen.map(escapeHtml).join(', ')}</small>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </section>
    ` : ''}

    <div class="druckbereich-unten">
      <button class="secondary drucken-button" id="einkaufDrucken">🖨️ Drucken / PDF</button>
    </div>
  `
}


function renderVerwaltung(bereich) {

  return `

    <section class="verwaltung-grid">





      <article class="verwaltung-karte" style="${bereich === 'gerichte' ? '' : 'display:none;'}">



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

          <textarea
            id="gerichtZutaten"
            placeholder="Zutaten, z. B. 500 g Hackfleisch, Nudeln, Tomaten"
            rows="2"
          ></textarea>



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

                        <textarea
                          class="gericht-bearbeiten-zutaten"
                          data-id="${gericht.id}"
                          rows="3"
                          placeholder="Zutaten, durch Komma oder neue Zeile getrennt"
                        >${escapeHtml(gericht.zutaten.join(', '))}</textarea>



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

                        ${
                          gericht.zutaten.length
                            ? `<small>🛒 ${escapeHtml(gericht.zutaten.join(' · '))}</small>`
                            : '<small>🛒 noch keine Zutaten hinterlegt</small>'
                        }



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





      <article class="verwaltung-karte" style="${bereich === 'snacks' ? '' : 'display:none;'}">



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

  document.querySelector('#wochenDrucken')?.addEventListener('click', () => window.print())

  document
    .querySelector('#vorherigeWoche')
    ?.addEventListener(
      'click',
      () => wechsleWoche(-1)
    )

  document
    .querySelector('#aktuelleWoche')
    ?.addEventListener(
      'click',
      geheZurAktuellenWoche
    )

  document
    .querySelector('#naechsteWoche')
    ?.addEventListener(
      'click',
      () => wechsleWoche(1)
    )



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
// EVENTS EINKAUFSLISTE
// --------------------------------------------------

function verbindeEinkaufsEvents() {
  document.querySelector('#einkaufVorherigeWoche')?.addEventListener('click', () => wechsleWoche(-1))
  document.querySelector('#einkaufAktuelleWoche')?.addEventListener('click', geheZurAktuellenWoche)
  document.querySelector('#einkaufNaechsteWoche')?.addEventListener('click', () => wechsleWoche(1))
  document.querySelector('#einkaufDrucken')?.addEventListener('click', () => window.print())

  document.querySelectorAll('.listen-button').forEach(button => {
    button.addEventListener('click', () => {
      offeneEinkaufslisteId = offeneEinkaufslisteId === button.dataset.listId
        ? null
        : button.dataset.listId
      render()
    })
  })

  document.querySelector('#neueListeForm')?.addEventListener('submit', event => {
    event.preventDefault()
    const feld = document.querySelector('#neueListeName')
    const name = feld?.value.trim()
    if (!name) return

    const neueListe = { id: neueId(), name, fest: false, eintraege: [] }
    einkaufsListenDerWoche().push(neueListe)
    offeneEinkaufslisteId = neueListe.id
    speichern()
    render()
  })

  document.querySelector('.liste-loeschen')?.addEventListener('click', event => {
    const id = event.currentTarget.dataset.listId
    const liste = findeEinkaufsliste(id)
    if (!liste || liste.fest) return
    if (!confirm(`Liste „${liste.name}“ wirklich löschen?`)) return

    const key = einkaufsSchluessel()
    einkaufslisten[key].listen = einkaufsListenDerWoche().filter(item => item.id !== id)
    offeneEinkaufslisteId = 'essen'
    speichern()
    render()
  })

  document.querySelector('#einkaufForm')?.addEventListener('submit', event => {
    event.preventDefault()
    const feld = document.querySelector('#einkaufText')
    const text = feld?.value.trim()
    if (!text || !offeneEinkaufslisteId) return
    einkaufsEintragHinzufuegen(text, 'manuell', offeneEinkaufslisteId)
    render()
  })

  document.querySelector('#zutatenUebernehmen')?.addEventListener('click', zutatenDerWocheUebernehmen)

  document.querySelectorAll('.einkauf-erledigt').forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      const eintrag = aktuelleEinkaufsliste().find(item => item.id === checkbox.dataset.id)
      if (!eintrag) return
      eintrag.erledigt = checkbox.checked
      speichern()
      render()
    })
  })

  document.querySelectorAll('.einkauf-notiz').forEach(feld => {
    feld.addEventListener('input', () => {
      const eintrag = aktuelleEinkaufsliste().find(item => item.id === feld.dataset.id)
      if (!eintrag) return
      eintrag.notiz = feld.value
      speichern()
    })
  })

  document.querySelectorAll('.einkauf-loeschen').forEach(button => {
    button.addEventListener('click', () => {
      const liste = findeEinkaufsliste()
      if (!liste) return
      liste.eintraege = liste.eintraege.filter(item => item.id !== button.dataset.id)
      speichern()
      render()
    })
  })

  document.querySelector('#einkaufErledigteLoeschen')?.addEventListener('click', () => {
    const liste = findeEinkaufsliste()
    if (!liste) return
    liste.eintraege = liste.eintraege.filter(item => !item.erledigt)
    speichern()
    render()
  })

  document.querySelector('#einkaufAllesLoeschen')?.addEventListener('click', () => {
    const liste = findeEinkaufsliste()
    if (!liste) return
    if (!confirm(`Liste „${liste.name}“ wirklich leeren?`)) return
    liste.eintraege = []
    speichern()
    render()
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

        const zutaten = parseZutaten(
          document
            .querySelector('#gerichtZutaten')
            ?.value
        )



        if (!name) {

          return

        }



        const gericht = neuesGericht(
          name,
          kategorie
        )

        gericht.zutaten = zutaten

        gerichte.push(gericht)



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



        const zutatenFeld =
          document.querySelector(
            `.gericht-bearbeiten-zutaten[data-id="${id}"]`
          )

        const neuerName =

          nameFeld.value.trim()



        if (!neuerName) {

          return

        }



        gericht.name = neuerName

        gericht.kategorie =

          kategorieFeld.value

        gericht.zutaten = parseZutaten(
          zutatenFeld?.value
        )



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



          Object.keys(wochenPlaene).forEach(key => {
            wochenPlaene[key] = normalisiereWochenplan(
              wochenPlaene[key]
            )

            wochenPlaene[key].forEach(eintrag => {
              if (eintrag.gerichtId === id) {
                eintrag.gerichtId = null
              }
            })
          })

          wochenplan = ladeWochenplan(wochenStart)



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



          Object.keys(wochenPlaene).forEach(key => {
            wochenPlaene[key] = normalisiereWochenplan(
              wochenPlaene[key]
            )

            wochenPlaene[key].forEach(eintrag => {
              eintrag.snackIds = eintrag.snackIds
                .filter(snackId => snackId !== id)
            })
          })

          wochenplan = ladeWochenplan(wochenStart)



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



window.addEventListener('pagehide', speichern)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') speichern()
})

speichern()

render()