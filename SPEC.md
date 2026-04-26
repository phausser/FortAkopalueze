# Fort Akopalueze – Game Specification

## Konzept

Ein Single-Player-Arcade-Shooter im Stil von *Fort Apocalypse* (C64, 1982). Der Spieler steuert einen Hubschrauber durch prozedurale, dunkle Höhlensysteme, bekämpft Gegner und zerstört einen Reaktor – muss dann in 30 Sekunden entkommen. Technologie: reines HTML5/CSS/JavaScript, kein Framework, kein Build-Step.

---

## Technischer Rahmen

| Eigenschaft | Wert |
|---|---|
| Technologie | HTML5 Canvas 2D, Vanilla JS (ES2022, ES Modules), Web Audio API |
| Dateien | `index.html`, `script/*.js` (modular), `style/game.css` |
| Auflösung | 1024 × 768 px (skaliert per CSS auf Viewport) |
| Ziel-FPS | 60 |
| Persistenz | LocalStorage (Highscores) |
| Abhängigkeiten | keine externen Bibliotheken |

---

## Spielzustand-Maschine

```
MENU → PLAYING → ESCAPE → WIN
                ↓
              DEAD
```

| State | Beschreibung |
|---|---|
| `MENU` | Titelscreen, Highscores, Schwierigkeit wählen |
| `PLAYING` | Normales Spiel, Räume 1–N |
| `ESCAPE` | Reaktor zerstört, 30-s-Countdown aktiv |
| `WIN` | Ausgang rechtzeitig erreicht |
| `DEAD` | Energie/Fuel/Ammo = 0 oder Zeit abgelaufen |

---

## Spieler-Hubschrauber

### Steuerung (Tastatur)

| Taste | Aktion |
|---|---|
| `←` / `→` | Schiff rotieren |
| `↑` | Schub in Blickrichtung |
| `↓` | Schub entgegen Blickrichtung |
| `Space` | Schießen (Richtung: Schiffspitze) |
| `ESC` | Zurück ins Menü |

### Physik

- Trägheitsmodell: Schub addiert Beschleunigung, Geschwindigkeit wird dt-basiert mit Dämpfungsfaktor gedämpft (`SHIP_DAMPING = 0.99` pro Frame @ 60 fps).
- Keine Gravitation (aktuell).
- Kollisionsradius: `12 px` (Kreis). Wandkollision mit Segment-Normalen-Reflexion, `RESTITUTION = 0.25`.

### Ressourcen

Intern als Wert `0.0–1.0` gespeichert. HUD-Balken 25 × 5 px.

| Ressource | Farbe | Verlust | Auffüllung |
|---|---|---|---|
| **Energie** | Blau | −0.05 pro Wandkontakt (0.5 s Unverwundbarkeit) | Energie-Pack |
| **Munition** | Gelb | −1/80 pro Schuss | Munitions-Pack |
| **Schild** | Grün | (noch nicht aktiv) | — |

Game-Over sobald eine Ressource ≤ 0 (noch nicht implementiert).

---

## Level-Aufbau

### Struktur

- Pro Spieldurchgang: **8–12 Räume** (zufällig, seed-basiert).
- Räume sind linear verbunden: Raum 1 → Raum 2 → … → Raum N (Reaktor).
- Jeder Raum hat einen **Eingang links** und einen **Ausgang rechts** (Tunnel).
- Der Ausgang ist erst passierbar, wenn alle Pflicht-Gegner im Raum besiegt sind (optional, schwierigkeit-abhängig).

### Raum-Geometrie (prozedural)

Jeder Raum wird aus folgenden Parametern generiert:

- Hintergrundfarbe pro Raum: zufällig aus Palette (dunkelrot `#3a1111`, dunkelgrün `#113511`, dunkelviolett `#3d1111`, dunkelblau `#11113a`, dunkelbraun `#3a3d11`) — befliegbar
- Wände (Decke/Boden/Hindernisse): schwarz `#000000`
- Breite/Höhe je nach Typ (siehe Tabelle), Höhe immer ≥ 560 px
- Decke + Boden: Polygon-Linien mit je `pts+2` Punkten (inkl. Wandanker), Amplitude typ-abhängig
- Mindest-Durchgangshöhe: typ-abhängig (120–200 px)
- Hindernisse: Stalaktiten (Decke) und Stalagmiten (Boden) als schwarze Dreiecke, Basis 3 px in Wand versenkt

| Typ | Breite | Höhe | Ceil-Amp | Min-Passage | Hindernisse |
|---|---|---|---|---|---|
| standard | 1400–2000 | 580–700 | 100 px | 150 px | 0–2 |
| narrow | 1200–1600 | 560–640 | 150 px | 120 px | 0–4 |
| open | 1800–2400 | 640–800 | 50 px | 200 px | 0–1 |
| treasury | 1200–1600 | 560–700 | 80 px | 180 px | 0 |
| reactor | 1600–2000 | 600–750 | 60 px | 200 px | 0–1 |

### Raum-Typen (Gewichtung beim Zufalls-Pick)

| Typ | Wahrscheinlichkeit | Besonderheit |
|---|---|---|
| Standard | 50 % | Gegner + evtl. Extras |
| Eng | 20 % | Schmale Durchgänge, keine Extras |
| Offen | 15 % | Wenige Hindernisse, mehr Gegner |
| Schatzkammer | 10 % | Keine Gegner, garantiertes Extra |
| Reaktor | 5 % (letzter Raum) | Reaktor-Objekt, starke Bewachung |

---

## Gegner

### Allgemein

Alle Gegner haben HP, ein geometrisches Sprite, Kollisionsbox und hinterlassen bei Tod eine Explosion + Score-Punkte.

### Spawn-Logik

- 1–3 Gegner pro Raum (zufällig). Keine Gegner in Schatzkammer-Räumen.
- Pro Slot: 45 % Wandgeschütz, 55 % Feind-Hubschrauber.
- Spawn-Position: zufällig im freien Luftraum, mindestens 150 px vom Eingang entfernt.

### Gegner-Typ 1: Feind-Hubschrauber

- **Verhalten:** Patrouilliert horizontal mit ±80 px/s, dreht 20 px vor Raumgrenze um. Bei Spieler `< 400 px`: verfolgt mit 150 px/s, hält Mindestabstand 80 px, schießt alle 1.5 s.
- **HP:** 2 Treffer
- **Schussrate:** alle 1.5 s
- **Sprite:** weißes gefülltes Quadrat 14×14 px
- **Projektil:** 300 px/s, verursacht 0.08 Energie-Schaden (mit Unverwundbarkeits-Fenster)

### Gegner-Typ 2: Wandgeschütz

- **Platzierung:** an Boden oder Decke verankert (zufällig beim Spawn)
- **Verhalten:** Lauf dreht sich mit 2 rad/s zum Spieler (Winkel auf Cave-Seite beschränkt). Schießt alle 2 s nur bei freier Sichtlinie (`hasLineOfSight`). Reichweite 380 px.
- **HP:** 3 Treffer
- **Sprite:** Kugel r=4 px (gefüllt) + Rohr 25×5 px (lineWidth 5), weiß

### Gegner-Typ 3: Raketenwerfer + Rakete

- **Raketenwerfer:** stationärer Kreis r=10 px. Alert bei `< 200 px`, feuert bei `< 150 px`, dann 10 s Cooldown. HP: 3.
- **Rakete:** verfolgt Spieler mit `π/60 rad/frame` Kurskorrektur, `120 px/s`. Weißer Partikel-Trail.
- **Schaden:** Splash-Radius 40 px, 0.2 Energie
- **Sprite:** Dreieck 10×6 px, weiß

### Gegner-Typ 4: Laser-Barriere

- **Geometrie:** Strahl von Decke zu Boden (auch diagonal, bis ±250 px versetzt)
- **Verhalten:** zufällig 0.5–2 s an / 1–5 s aus. Zerstört Projektile und Raketen beim Kontakt.
- **Schaden:** 0.01/frame direkt (kein Unverwundbarkeits-Fenster)
- **Emitter:** je 4 HP, einzeln zerstörbar. Zerstörung → Barriere permanent aus.
- **Sprite:** weiße Linie mit `shadowBlur = 12`, Emitter als 8×8-Rechtecke, weiß

---

## Extras / Power-ups

Erscheinen zufällig in Räumen (0–2 pro Raum). Blinken mit `0.5 Hz`. Aufsammeln durch Überfahren (Kollisionsbox `24×24 px`).

| Typ | Farbe | Effekt | Sprite |
|---|---|---|---|
| Energie-Pack | Grün (`#00ff88`) | +40 HP (max 100) | Raute mit `+`-Symbol |
| Munitions-Pack | Gelb (`#ffee00`) | +40 Ammo (max 120) | Raute mit `•`-Symbol |
| Treibstoff-Kanister | Blau (`#00aaff`) | +50 Fuel (max 100) | Raute mit Tropfen-Symbol |

---

## Reaktor

- Großes geometrisches Objekt im letzten Raum: konzentrische Hexagone, rotierend, pulsierendes Glow.
- **HP:** 20 Treffer
- Bei Zerstörung:
  1. Große Partikel-Explosion (2 s)
  2. Bildschirm-Flash (weiß → rot)
  3. Hintergrundfarbe wechselt zu tiefem Rot
  4. Alarm-Sound (gepulster Sinus)
  5. `ESCAPE`-State wird aktiviert, 30-s-Countdown startet
  6. Ausgangs-Pfeil erscheint (zeigt Richtung Eingang)

---

## Escape-Phase

- Countdown: 30 Sekunden, im HUD groß angezeigt, unter 10 s rot blinkend.
- Alle bereits durchquerten Räume werden neu bevölkert (doppelte Gegner-Anzahl).
- Ziel: Raum 1 erreichen und durch den Eingangs-Tunnel fliegen.
- Bei `t = 0`: Explosion-Animation, State → `DEAD`, Todesursache „Zeit abgelaufen".
- Bei rechtzeitigem Erreichen: Win-Animation, State → `WIN`.

---

## Kamera & Scrolling

- Jeder Raum hat ein eigenes Koordinatensystem (Weltkoordinaten).
- Kamera: `camX = clamp(ship.x − W/2, 0, room.width − W)`, analog Y.
- Raumwechsel rechts: Schiff betritt nächsten Raum bei `entranceY`. Links: kehrt bei `exitY` zurück.
- Raumwechsel: sofortiger Schnitt (kein Fade, noch ausstehend).
- Mini-Map: ausstehend.

---

## Partikel-System

Implementiert: `{x, y, vx, vy, life}`. Gezeichnet als Kreis r=1.5 px, `globalAlpha = life / PARTICLE_LIFETIME`.

| Effekt | Partikel-Anzahl | Geschwindigkeit | Lifetime | Status |
|---|---|---|---|---|
| Projektil-Treffer | 12 | 120 px/s, Zufallsrichtung | 0.42 s | ✅ |
| Kleine Explosion | 12–60 | — | — | ausstehend |
| Raketen-Trail | 3/frame | — | — | ausstehend |
| Heli-Rauch | 1/frame | — | — | ausstehend |
| Mündungsfeuer | 4 | — | — | ausstehend |

---

## Visueller Stil

- **Palette:** Hintergrund pro Raum dunkel (rot/grün/violett/blau/braun), Wände schwarz `#000000`, Schiff weiß `#ffffff`.
- **Glow:** `ctx.shadowBlur` für Projektile, Laser, Extras, Reaktor.
- **Scan-Line-Overlay:** optionaler halbtransparenter CSS-Gradient über Canvas für CRT-Effekt.
- **Flickering:** Raumbeleuchtung flackert leicht (zufällige `globalAlpha`-Variation `±0.05`).
- Alle Sprites sind rein geometrisch – keine Bitmaps.

---

## Audio (Web Audio API)

Alle Sounds synthetisch generiert, keine externen Dateien.

| Sound | Typ | Parameter |
|---|---|---|
| Rotor-Hum | OscillatorNode (Sawtooth) | `120 Hz`, Lautstärke an Schub gekoppelt |
| Schuss | BufferSource (White Noise) | `80 ms`, Bandpass `800 Hz` |
| Explosion (klein) | BufferSource (Noise) | `300 ms`, Lowpass-Sweep `400→80 Hz` |
| Explosion (groß) | BufferSource (Noise) | `1.5 s`, tiefer Sweep `200→30 Hz` |
| Treffer | OscillatorNode (Square) | `220 Hz → 110 Hz`, `100 ms` |
| Pickup | OscillatorNode (Sine) | `440 → 880 Hz`, `150 ms` |
| Alarm | OscillatorNode (Square) | `880 Hz`, gepulst `4 Hz` |
| Countdown-Piep | OscillatorNode (Sine) | `1000 Hz`, `50 ms` pro Sekunde |

---

## Scoring

| Ereignis | Punkte |
|---|---|
| Feind-Hubschrauber zerstört | 100 |
| Wandgeschütz zerstört | 150 |
| Rakete abgeschossen | 75 |
| Laser-Emitter zerstört | 200 |
| Reaktor zerstört | 1000 |
| Raum verlassen (mit Gegnern besiegt) | 50 × Raum-Nummer |
| Escape erfolgreich | 500 + `verbleibende Sekunden × 30` |
| Ressourcen-Bonus (bei Win) | HP × 5 + Fuel × 3 + Ammo × 2 |

---

## Schwierigkeitsgrade

| Parameter | Easy | Normal | Hard |
|---|---|---|---|
| Fuel-Verbrauch/frame | 0.03 | 0.05 | 0.08 |
| Feind-Anzahl/Raum | 1–2 | 2–4 | 3–6 |
| Feind-Schussrate | ×0.6 | ×1.0 | ×1.5 |
| Extra-Häufigkeit | hoch | mittel | gering |
| Reaktor-HP | 12 | 20 | 30 |
| Escape-Zeit | 45 s | 30 s | 20 s |

---

## Highscore

- Top 5 pro Schwierigkeitsgrad im `localStorage` unter Key `fortAkopalueze_scores_{difficulty}`.
- Eintrag: `{ score, name (3 Zeichen), date }`.
- Name-Eingabe nach Win/Game-Over via einfachem Input-Feld auf dem End-Screen.

---

## Win- & Game-Over-Bedingungen

| Zustand | Bedingung |
|---|---|
| WIN | Spieler erreicht Ausgang während `ESCAPE`-Phase |
| DEAD – kein HP | Energie sinkt auf 0 |
| DEAD – kein Fuel | Treibstoff sinkt auf 0 |
| DEAD – keine Ammo | Munition sinkt auf 0 *(optional, nur auf Hard)* |
| DEAD – Zeit | Countdown erreicht 0 in der Escape-Phase |
