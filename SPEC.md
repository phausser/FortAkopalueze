# Fort Akopalueze – Game Specification

## Konzept

Ein Single-Player-Arcade-Shooter im Stil von *Fort Apocalypse* (C64, 1982). Der Spieler steuert einen Hubschrauber durch ein prozedural generiertes Höhlensystem, rettet Überlebende, bekämpft Gegner und zerstört einen Reaktor – muss dann rechtzeitig zum Eingang zurückfliegen, bevor die Anlage explodiert. Das Spiel läuft in aufeinanderfolgenden Levels mit wachsender Raumzahl. Technologie: reines HTML5/CSS/JavaScript, kein Framework, kein Build-Step.

---

## Technischer Rahmen

| Eigenschaft | Wert |
|---|---|
| Technologie | HTML5 Canvas 2D, Vanilla JS (ES2022, ES Modules), Web Audio API |
| Dateien | `index.html`, `script/*.js` (modular), `style/game.css`, `sound/*.mp3` (Hintergrundmusik) |
| Auflösung | 1024 × 768 px, feste Canvas-Größe (kein CSS-Scaling auf den Viewport) |
| Ziel-FPS | 60, `dt` pro Frame auf max. 100 ms geclampt |
| Font | „Michroma" (Google Fonts) für HUD- und Menütext |
| Persistenz | keine — kein Highscore/LocalStorage implementiert (siehe TODO #21) |
| Abhängigkeiten | keine externen JS-Bibliotheken; ein externes MP3-Asset für die Hintergrundmusik (alle SFX bleiben synthetisch) |

---

## Spielzustand-Maschine

```
MENU → LEVEL_INTRO → PLAYING → WIN → LEVEL_INTRO (nächstes Level) → …
                              ↳ DEAD → MENU
```

| State | Beschreibung |
|---|---|
| `MENU` | Titelscreen, „ENTER/LEERTASTE zum Starten" |
| `LEVEL_INTRO` | Einblendung „LEVEL X – ZERSTÖRE DEN REAKTOR" (2.5 s, überspringbar mit Enter/Space) |
| `PLAYING` | Normales Spiel. Nach Reaktor-Zerstörung läuft die komplette Escape-Phase (Countdown, Sieg-/Todesprüfung) ebenfalls innerhalb dieses States |
| `WIN` | Startraum (Raum-ID 0) rechtzeitig während der Escape-Phase erreicht |
| `DEAD` | Energie = 0, oder Escape-Countdown abgelaufen |

> `State.ESCAPE` existiert als Enum-Wert und ist in `stateUpdaters`/`stateRenderers` registriert, wird im Code aber nie per `setState` aktiviert — es ist toter Code. Die Escape-Logik läuft vollständig inline in `updatePlaying`.

---

## Level-Progression

- Level beginnt bei 1. Raumzahl pro Level: `level + 1` (Level 1 = 2 Räume, Level 2 = 3 Räume, Level N = N + 1 Räume).
- Levelstart (`initLevel`): neuer Seed (`Date.now()`), komplett neues Höhlen-Layout, Schiff und alle Ressourcen werden voll zurückgesetzt.
- Score läuft über alle Level weiter; nur ein neues Spiel aus `MENU` setzt ihn zurück.
- Anzahl zu rettender Überlebender pro Level = aktuelle Levelnummer (siehe „Überlebende" unten).

---

## Spieler-Hubschrauber

### Steuerung (Tastatur)

| Taste | Aktion |
|---|---|
| `←` / `→` | Schiff rotieren (`3.0 rad/s`) |
| `Shift` + `←` / `→` | Gleiten senkrecht zur Blickrichtung (Strafe, `180 px/s`) |
| `↑` | Schub in Blickrichtung |
| `↓` | Schub entgegen Blickrichtung |
| `Space` | Schießen (Richtung: Schiffspitze) |
| `Escape` | Zurück ins Menü |

### Physik

- Trägheitsmodell: Schub addiert Beschleunigung (`SHIP_THRUST = 250 px/s²`), Geschwindigkeit wird dt-basiert gedämpft (`SHIP_DAMPING = 0.99` pro Frame @ 60 fps).
- Keine Gravitation.
- Kollisionsradius: `12 px` (Kreis). Wandkollision mit Segment-Normalen-Reflexion, `RESTITUTION = 0.25`.

### Ressourcen

Intern als Wert `0.0–1.0` gespeichert. HUD-Balken 50 × 5 px.

| Ressource | Farbe | Verlust | Auffüllung | Game-Over |
|---|---|---|---|---|
| **Energie** | Blau | `ENERGY_DRAIN = 0.0175/s` beim Thrusten (↑/↓); zusätzlich direkter Abzug durch Laser/Reaktor-Kontakt (s.u.) | Energie-Kugel | Bei 0 sofort |
| **Schild** | Grün | Wandkontakt `−0.05`, Feind-Treffer `−0.08`, Raketen-Splash `−0.2`, Minen-Splash bis `−0.5` (Distanz-Falloff) | Schild-Kugel | Bei 0: nächster (nicht-direkter) Treffer setzt Energie sofort auf 0 |
| **Munition** | Gelb | `1/160` pro Schuss (160 Schüsse = voll) | Munitions-Kugel, **und** automatische Regeneration `+1/120 pro Sekunde` (voll in 2 min ohne Schießen) | Kein Schießen mehr möglich |

Laser-Kontakt und Reaktor-Körperkontakt ziehen `2.0 Energie/s` **direkt** ab (kein Schild, keine Unverwundbarkeit).

---

## Level-Aufbau

### Struktur (Höhlen-Graph)

- Räume liegen auf einem quadratischen Gitter und bilden einen **Baum**, keine lineare Kette: ein garantierter Hauptpfad vom Startraum zum Reaktorraum, plus einzelne Sackgassen-Räume, die von Hauptpfad-Räumen abzweigen (nicht vom Reaktorraum).
- Hauptpfad-Länge: zufällig zwischen `MAIN_PATH_MIN = 3` und `max(MAIN_PATH_MAX = 6, ⌈Raumzahl × 0.6⌉)`.
- Jeder Raum kann Ausgänge auf **bis zu allen vier Seiten** haben (links/rechts als horizontale Tunnel, oben/unten als vertikale Kerben). Der Reaktorraum liegt immer am Ende des Hauptpfads.
- Vor jedem Ausgang wird eine Freihaltezone reserviert, in der keine Hindernisse, Pickups, Laser oder Überlebenden-NPCs platziert werden.

### Raum-Geometrie (prozedural)

- Hintergrundfarbe pro Raum: zufällig aus Palette (dunkelrot `#662222`, dunkelgrün `#226622`, dunkelviolett `#442244`, dunkelblau `#222266`, dunkelbraun `#444422`) — befliegbar.
- Wände (Decke/Boden/Hindernisse): schwarz `#000000`.
- Decke + Boden: Polygon-Linien mit `Punkte + 2` Stützpunkten (inkl. Wandanker), Amplitude typ-abhängig.
- Links-/Rechts-Ausgänge sind Tunnel fester Höhe (`120–200 px`, bei „narrow" `120–160 px`); Oben-/Unten-Ausgänge sind `140 px` breite Kerben mit organischen Rampen (`70–130 px` Rampenbreite je Seite) statt scharfer Kanten.
- Hindernisse: Stalaktiten (Decke) und Stalagmiten (Boden) als schwarze Dreiecke, `20–60 px` breit, Länge auf max. 35 % der lokalen Durchgangshöhe begrenzt, Basis 25 px in die Wand versenkt.

| Typ | Breite | Höhe | Amplitude | Min-Passage | Stützpunkte | Max. Hindernisse |
|---|---|---|---|---|---|---|
| standard | 1500–2100 | 820–980 | 120 px | 180 px | 9 | 2 |
| narrow | 1280–1700 | 800–900 | 180 px | 150 px | 11 | 4 |
| open | 1900–2600 | 900–1100 | 60 px | 260 px | 7 | 1 |
| treasury | 1280–1700 | 800–950 | 100 px | 220 px | 8 | 0 |
| reactor | 1700–2100 | 850–1050 | 80 px | 260 px | 8 | 1 |

### Raum-Typen (relative Gewichtung beim Zufalls-Pick)

| Typ | Gewicht | Besonderheit |
|---|---|---|
| Standard | 50 | Gegner + Extras |
| Eng (narrow) | 20 | Schmale Durchgänge, viele Hindernisse |
| Offen (open) | 15 | Wenige Hindernisse |
| Schatzkammer (treasury) | 10 | Keine Gegner, keine Laser (Pickups wie überall) |
| Reaktor | — | Immer der letzte Raum des Hauptpfads (kein Zufalls-Pick) |

---

## Gegner

### Allgemein

Alle Gegner haben `hp`, ein geometrisches Sprite, eine Kollisionsbox und hinterlassen bei Tod Partikel + Score (`+100`).

### Spawn-Logik

- Keine Gegner in Schatzkammer-Räumen.
- Normale Räume: `1 + zufällig(0–1) + ⌊(Tiefe / max. Tiefe) × 3⌋` Gegner — die Anzahl wächst also mit der Entfernung vom Startraum entlang des Hauptpfads (1–2 in Startnähe, bis zu 4–5 kurz vor dem Reaktor). Pro Slot: 20 % Mine, 35 % Wandgeschütz, 45 % Feind-Hubschrauber.
- Reaktorraum: 4–6 Gegner. Pro Slot: 25 % Wandgeschütz, 30 % Mine, 45 % Feind-Hubschrauber.

### Gegner-Typ 1: Feind-Hubschrauber

- **Verhalten:** Patrouilliert horizontal mit `±80 px/s`, dreht 20 px vor Raumgrenze um. Bei Spieler `< 400 px`: verfolgt mit `150 px/s`, hält Mindestabstand `80 px` (zurück auf Patrouille bei `> 500 px`), schießt alle `1.5 s`.
- **HP:** 2 Treffer
- **Sprite:** weißes gefülltes Quadrat 14×14 px
- **Projektil:** `300 px/s`, verursacht `0.08` Schild-Schaden (mit Unverwundbarkeits-Fenster)
- **Körperkontakt:** `0.08` Schild-Schaden

### Gegner-Typ 2: Wandgeschütz (Turret)

- **Platzierung:** an Boden oder Decke verankert (zufällig beim Spawn).
- **Verhalten:** Lauf dreht sich mit `2 rad/s` zum Spieler (Winkel auf Cave-Seite beschränkt), sobald Distanz `< 380 px`. Feuert alle `3 s` eine **homing Rakete** (kein direktes Projektil mehr), nur bei freier Sichtlinie.
- **HP:** 3 Treffer, kein Körperkontakt-Schaden.
- **Sprite:** Halbkreis-Körper r=9 px + Lauf 13 px (lineWidth 5), weiß.

### Gegner-Typ 3: Mine

- **Verhalten:** stationär schwebend. Pulsiert („alert") sobald Spieler `< 150 px`; bei `< 80 px` detoniert sie sofort (Kontaktzünder, kein Cooldown/Wiederverwendung).
- **HP:** 3 Treffer (durch Spieler-Projektile zerstörbar, bevor sie zündet).
- **Schaden:** Splash-Radius `100 px`, Schaden linear abfallend bis max. `0.5` Schild bei Kontaktdistanz.
- **Sprite:** pulsierender weißer Kreis r=10 px.

### Rakete (Missile, von Turrets abgefeuert)

- Homing-Geschoss, `120 px/s`, Kurskorrektur bis `π rad/s` in Richtung Spieler, Lebensdauer max. 5 s.
- Explodiert bei Wandkontakt, Spielerkontakt oder Kontakt mit einem aktiven Laserstrahl. **Kann nicht durch Spieler-Projektile abgeschossen werden** — einzige Abwehr sind Ausweichen, ein aktiver Laserstrahl, oder das Zerstören des abfeuernden Turrets.
- **Schaden:** Splash-Radius `40 px`, `0.2` Schild (normaler Treffer, umgeht Schild/Unverwundbarkeit nicht).
- **Sprite:** Dreieck 10×8 px, weiß, mit Partikel-Trail (3 Partikel alle `1/30 s`).

### Gegner-Typ 4: Laser-Barriere

- **Geometrie:** Strahl von Decke zu Boden, auch diagonal (Emitter bis ±250 px versetzt).
- **Verhalten:** zufällig `0.5–2 s` an / `1–5 s` aus, pro Barriere unabhängig getaktet. Zerstört Spieler-Projektile, Gegner-Projektile und Raketen beim Kontakt.
- **Schaden:** `2.0 Energie/s` direkt, solange Spieler im Strahl steht (kein Unverwundbarkeits-Fenster).
- **Emitter:** je `4 HP`, einzeln von Spieler-Projektilen zerstörbar. Ein zerstörter Emitter deaktiviert die ganze Barriere dauerhaft.
- **Sprite:** weiße Linie mit `shadowBlur = 12`, Emitter als 8×8-Rechtecke, weiß.
- 0–2 Barrieren pro Raum, nie in Schatzkammer- oder Reaktorraum.

---

## Extras / Power-ups

2–3 pro Raum (auch im Reaktorraum generiert, dort aber vom Spiel geleert). Erste Kugel eines Raums ist immer Energie, restliche zufällig. Aufsammeln durch Überfliegen (Kollisionsdistanz `22 px`).

| Typ | Farbe | Effekt | Sprite |
|---|---|---|---|
| Energie-Kugel | Blau `#4488ff` / `#1144aa` | `+0.25` Energie (max. 1.0) | Kugel r=6 px, Schatten-Basis + hellerer Kreis oben-links |
| Schild-Kugel | Grün `#44ff88` / `#11aa44` | `+0.25` Schild (max. 1.0) | wie oben |
| Munitions-Kugel | Gelb `#ffdd44` / `#aa8811` | `+0.25` Munition (max. 1.0) | wie oben |

---

## Überlebende (Rettung)

- Pro Level werden so viele Überlebende platziert wie die Levelnummer (Level 1 = 1, Level 2 = 2, …), verteilt über alle Nicht-Reaktor-Räume.
- Stehen fest auf dem Boden, winken (animierter Arm). Einsammeln durch Anflug (`35 px` Radius) zählt sie als gerettet (Impact-Partikel, entfernt) — die `+500` Punkte pro Person werden **nicht sofort** gutgeschrieben, sondern erst als Bonus-Tally auf dem Win-Screen (siehe „Win-Bonus-Tally").
- Kein Zeitlimit, kein Straf-Mechanismus beim Ignorieren.

---

## Reaktor

- Großes Objekt im letzten Raum: drei gekippte, elliptische Orbitringe mit rotierenden „Elektronen" (Atom-Symbol-Optik), dunkelroter Kern mit Glanzlicht.
- **HP:** 25 (ein Spieler-Projektiltreffer = `−1 HP`).
- **Körperkontakt:** zieht `2.0 Energie/s` direkt ab (kein Schild, keine Unverwundbarkeit), solange der Spieler im Kernradius bleibt.
- Bei Zerstörung (`hp ≤ 0`):
  1. Explosionssequenz über `2.5 s`: wachsende weiße Blitzkugel, 250 Partikel, Screen-Shake.
  2. Score `+5000`.
  3. Nach Ablauf der Sequenz gilt der Reaktor als zerstört → Escape-Countdown startet (weiterhin im `PLAYING`-State, siehe Escape-Phase).
- Wird typischerweise von 4–6 Gegnern bewacht (siehe Spawn-Logik Reaktorraum).

---

## Escape-Phase

- Sobald der Reaktor zerstört ist, startet ein Countdown: `5 s × Anzahl bereits entdeckter Räume` (dynamisch, keine feste Zeit und keine Schwierigkeitsgrad-Skalierung).
- Räume werden **nicht** neu bevölkert — bereits besiegte Gegner bleiben besiegt.
- Anzeige: große Ziffer in der Bildschirmmitte, ab `≤ 3 s` rot.
- Ziel: Startraum (Raum-ID 0) erreichen, bevor der Countdown abläuft.
- Bei `t = 0`: `State.DEAD` („GAME OVER"-Screen, kein spezifischer Todesgrund-Text).
- Bei rechtzeitigem Erreichen des Startraums: `State.WIN`.

---

## Win-Bonus-Tally

Beim Erreichen von `State.WIN` wird der Score in zwei animierten Phasen um Zeit- und Rettungsbonus ergänzt, bevor der Spieler ins nächste Level darf. Beide Zeilen werden einheitlich hellgrau (`#aaaaaa`) dargestellt. Jede Zeile blendet erst ein, sobald ihre eigene Phase aktiv wird — die Rettungsbonus-Zeile ist also während der Zeitbonus-Phase noch gar nicht sichtbar.

1. **Zeitbonus** (Format `50 × {Sekunden}s`): die im Moment des Sieges verbleibenden Escape-Sekunden (aufgerundet) zählen **hoch** — beginnend bei 0 bis zum vollen Wert, `5 Ticks/s` (alle `0.2 s` ein Tick), pro Tick `+50` Punkte direkt auf den Score. Am Ende der Animation steht die tatsächliche Sekundenzahl da. Bei 0 Sekunden entfällt die Zeile komplett.
2. **Rettungsbonus** (Format `500 × [Icons]`): sobald die Zeitbonus-Phase abgeschlossen ist, blendet die Zeile ein und für jeden in diesem Level geretteten Überlebenden erscheint direkt hinter dem `500 ×`-Label ein Icon (gleiches Sprite wie im Spiel, im selben Hellgrau wie der Text, vertikal auf die Textmitte zentriert, geringfügig größer als die Schrifthöhe), nacheinander im Abstand von `0.75 s`, jeweils mit `+500` Punkten auf den Score. Bei 0 Geretteten entfällt die Zeile komplett.
3. Erst wenn beide Phasen durchlaufen sind (`phase === 'done'`), erscheint der Hinweis „MIT ENTER ODER LEERTASTE ZUM LEVEL X" — vorher ist der Levelwechsel blockiert.

Ist eine Phase von vornherein leer (0 Sekunden übrig bzw. 0 Gerettete), wird direkt mit der nächsten Phase begonnen bzw. sofort `done` erreicht.

---

## Kamera & Minimap

- Jeder Raum hat ein eigenes Koordinatensystem (Weltkoordinaten).
- Kamera: `camX = clamp(ship.x − W/2, 0, room.width − W)`, analog Y.
- Raumwechsel: sofortiger Schnitt (kein Fade), Schiff wird am Eingang der Gegenseite platziert.
- Zwei geblurrte Parallax-Hintergrundebenen (30 px / 70 px Blur) folgen der Kamera mit 30 % / 60 % Geschwindigkeit für Tiefenwirkung.
- Screen-Shake bei Reaktortreffern (`6 px`) und -explosion (`20 px`, klingt über Zeit ab).
- **Minimap** (unten links): ein Kästchen (14×14 px, 3 px Abstand) pro Rasterzelle des Höhlen-Graphs, nur entdeckte Räume sichtbar, aktueller Raum weiß hervorgehoben.

---

## Partikel-System

Generisches System `{x, y, vx, vy, life, maxLife?, color?}`, gezeichnet als Kreis r=1.5 px, `globalAlpha = life / (maxLife ?? PARTICLE_LIFETIME)`.

Verwendet für: Projektil-/Wandtreffer (12 Partikel, `120 px/s`, `0.42 s`), Schub-Trail, Raketen-Trail, Minen-Explosion (200 Partikel), Reaktor-Explosion (250 Partikel, `1.4 s`), Level-Intro „Beam-in"-Effekt beim Erscheinen des Schiffs.

---

## Visueller Stil

- **Palette:** Hintergrund pro Raum dunkel (rot/grün/violett/blau/braun), Wände schwarz `#000000`, Schiff/Gegner/HUD weiß `#ffffff`.
- **Glow:** `ctx.shadowBlur` für Laser, Extras, Reaktor-Blitz.
- **Parallax-Blur-Ebenen** und **Screen-Shake** (siehe „Kamera & Minimap").
- Alle Sprites sind rein geometrisch – keine Bitmaps.
- **Text:** Michroma ist als reine Versalschrift gezeichnet — ihre Kleinbuchstaben wirken deutlich unruhiger/verzerrt als die Großbuchstaben. Deshalb wird sämtlicher UI-Text (Menü, Level-Intro, Game-Over, Win-Screen) in GROSSBUCHSTABEN gesetzt; nur numerische Anzeigen (Score, Countdown, Bonus-Zahlen) und die Sekunden-Einheit `s` bleiben unverändert.
- Scan-Line-Overlay und flackernde Raumbeleuchtung sind **nicht implementiert** (siehe TODO #17).

---

## Audio (Web Audio API)

Alle Soundeffekte werden synthetisch erzeugt (Oszillator-Töne + gefilterter Noise-Buffer). Die Hintergrundmusik ist eine Ausnahme: eine externe MP3-Datei (`sound/reactor-under-ice.mp3`), looped, Lautstärke 0.35, startet mit jedem Levelstart.

| Sound | Erzeugung | Trigger |
|---|---|---|
| Schuss | Highpass-Noise `4000 Hz`, `45 ms` | Spieler feuert |
| Feind-Schuss | Bandpass-Noise `700 Hz`, `80 ms` | Feind-Hubschrauber schießt |
| Treffer | Sine-Tone `700→200 Hz` + Lowpass-Noise | Spieler nimmt Schaden |
| Wandkollision | Lowpass-Noise `180 Hz` | Schiff berührt Wand |
| Tod | Noise-Sweep + Sawtooth-Tone, `~1.5 s` | Energie erreicht 0 |
| Gegner-Tod | Lowpass-Noise-Sweep + Sine-Tone | Gegner-HP erreicht 0 |
| Raketen-Abschuss / -Explosion | Noise-Sweep (aufsteigend / absteigend) | Turret feuert / Rakete explodiert |
| Minen-Alarm / -Explosion | Square-Tone (aufsteigend) / Noise+Tone-Mix | Mine wird „alert" / detoniert |
| Laser-Emitter zerstört | Hochfrequenter Noise-Burst + Sawtooth | Emitter-HP erreicht 0 |
| Reaktor-Treffer / -Explosion | Lowpass-Noise + Sine-Tone (jeweils stärker/länger) | Reaktor-HP-Verlust / Zerstörung |
| Pickup | Sine-Tone, Frequenz je Ressourcentyp | Pickup eingesammelt |
| Sieg-Fanfare | 4-Ton-Arpeggio (Oszillatoren) | `State.WIN` |
| Game-Over | Sawtooth-Tone + Noise | `State.DEAD` |
| Rotor/Schub (Loop) | Lowpass-gefilterter Noise-Loop | solange `↑`/`↓` gehalten wird |
| Laser-Kontakt (Loop) | Bandpass-Noise-Loop | solange Spieler im aktiven Laserstrahl steht |

Ein Alarm-Sirenensound und ein Countdown-Piep für die Escape-Phase sind **nicht implementiert**.

---

## Scoring

Score wird als 6-stellige Zahl oben rechts im HUD angezeigt (`000000`), läuft über alle Level weiter.

| Ereignis | Punkte | Zeitpunkt der Gutschrift |
|---|---|---|
| Feind zerstört (Helikopter/Turret/Mine) | 100 | sofort |
| Reaktor zerstört | 5000 | sofort |
| Escape-Sekunde übrig | 50 | animiert auf dem Win-Screen (siehe „Win-Bonus-Tally") |
| Überlebender gerettet | 500 | animiert auf dem Win-Screen (siehe „Win-Bonus-Tally") |

---

## Nicht implementiert

- **Schwierigkeitsgrade:** Es gibt keine Easy/Normal/Hard-Auswahl. Die einzige Schwierigkeitsskalierung ist die Gegneranzahl nach Raumtiefe (siehe „Gegner") und die wachsende Raum-/Überlebendenzahl pro Level.
- **Highscore/LocalStorage:** kein Speichern von Scores, keine Bestenliste, keine Namenseingabe.
- **Todesursache im Game-Over-Screen:** aktuell nur generisches „GAME OVER".
- **Scan-Line-Overlay / flackernde Beleuchtung.**
- **Lautstärke-Regler, Alarm-Sirene, Countdown-Piep.**
- **Mobile-/Gamepad-Support.**

Details und Fortschritt siehe `TODO.md`.
