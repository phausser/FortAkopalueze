# Fort Akopalueze – Game Specification

## Konzept

Ein Single-Player-Arcade-Shooter im Stil von *Fort Apocalypse* (C64, 1982). Der Spieler steuert einen Hubschrauber durch prozedurale, dunkle Höhlensysteme, bekämpft Gegner und zerstört einen Reaktor – muss dann in 30 Sekunden entkommen. Technologie: reines HTML5/CSS/JavaScript, kein Framework, kein Build-Step.

---

## Technischer Rahmen

| Eigenschaft | Wert |
|---|---|
| Technologie | HTML5 Canvas 2D, Vanilla JS (ES2022), Web Audio API |
| Dateien | `index.html`, `game.js`, `style.css` (single-file-Option möglich) |
| Auflösung | 800 × 600 px (skaliert per CSS auf Viewport) |
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
| `W` / `↑` | Schub aufwärts |
| `S` / `↓` | Schub abwärts |
| `A` / `←` | Schub links |
| `D` / `→` | Schub rechts |
| `Space` | Schießen (Richtung: aktuell vorwärts) |
| `P` | Pause |

### Physik

- Trägheitsmodell: Schub addiert Beschleunigung, Geschwindigkeit wird pro Frame mit Dämpfungsfaktor multipliziert (`0.92`).
- Gravitation: konstante Abwärtsbeschleunigung (`0.08 px/frame²`).
- Maximale Geschwindigkeit: `±6 px/frame` horizontal, `±8 px/frame` vertikal.

### Ressourcen

| Ressource | Startwert | Verlust | Auffüllung |
|---|---|---|---|
| **Energie (HP)** | 100 | Kollision mit Wand/Gegner/Projektil | Energie-Pack |
| **Munition** | 80 | 1 pro Schuss | Munitions-Pack |
| **Treibstoff** | 100 | 0.05/frame bei Schub | Treibstoff-Kanister |

Game-Over sobald eine Ressource ≤ 0.

---

## Level-Aufbau

### Struktur

- Pro Spieldurchgang: **8–12 Räume** (zufällig, seed-basiert).
- Räume sind linear verbunden: Raum 1 → Raum 2 → … → Raum N (Reaktor).
- Jeder Raum hat einen **Eingang links** und einen **Ausgang rechts** (Tunnel).
- Der Ausgang ist erst passierbar, wenn alle Pflicht-Gegner im Raum besiegt sind (optional, schwierigkeit-abhängig).

### Raum-Geometrie (prozedural)

Jeder Raum wird aus folgenden Parametern generiert:

- Breite: `1200–2400 px`, Höhe: `400–700 px`
- Decke: zufällige Polygon-Linie (5–9 Kontrollpunkte, Amplitude `0–120 px`)
- Boden: zufällige Polygon-Linie (5–9 Kontrollpunkte, Amplitude `0–120 px`)
- Mindest-Durchgangshöhe im Tunnel: `120 px`
- Optionale Hindernisse: hängende Stalaktiten, aufragende Stalagmiten (Dreiecke)

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

### Gegner-Typ 1: Feind-Hubschrauber

- **Verhalten:** Patrouilliert horizontal. Bei Spieler in Sichtweite (`< 400 px`): verfolgen und schießen.
- **HP:** 2 Treffer
- **Schussrate:** alle 1.5 s
- **Sprite:** kleines Rechteck (16×8 px) + Rotor-Linie, Farbe Orange

### Gegner-Typ 2: Wandgeschütz

- **Platzierung:** an Boden, Decke oder Wand verankert
- **Verhalten:** Lauf dreht sich zum Spieler, feuert alle 2 s
- **HP:** 3 Treffer
- **Sprite:** Kreis (10 px) + drehender Strich (Lauf, 14 px), Farbe Rot

### Gegner-Typ 3: Heimsuchungsrakete

- **Auslöser:** wird von Raketenwerfer abgefeuert wenn Spieler Raum betritt
- **Verhalten:** verfolgt Spieler mit langsamer Kurskorrektur (`3°/frame`), Geschwindigkeit `4 px/frame`
- **Schaden:** Splash-Radius 40 px
- **Sprite:** Dreieck (10×6 px) + Partikel-Trail (Flammen), Farbe Gelb-Orange

### Gegner-Typ 4: Laser-Barriere

- **Geometrie:** Strahl zwischen zwei Emitter-Punkten (horizontal oder vertikal)
- **Verhalten:** pulsiert (an 0.8 s / aus 0.4 s), kein HP (permanent bis Emitter zerstört)
- **Schaden:** sofort bei Kontakt, kontinuierlich (`2 HP/frame`)
- **Sprite:** Linie mit `shadowBlur`-Glow, Emitter als 8×8-Rechtecke, Farbe Cyan

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

- Jeder Raum hat ein eigenes Koordinatensystem.
- Kamera zentriert auf Spieler, geclampt an Raumgrenzen.
- Raumwechsel: 0.4 s Fade-to-Black, dann Fade-in im neuen Raum.
- Mini-Map optional (zeigt besuchte Räume als graue Rechtecke, aktueller Raum hervorgehoben).

---

## Partikel-System

Generisches System: jedes Partikel hat `{x, y, vx, vy, life, maxLife, color, size, shape}`.

| Effekt | Partikel-Anzahl | Shape | Farbe |
|---|---|---|---|
| Kleine Explosion | 12 | Kreis | Orange → Rot |
| Große Explosion (Reaktor) | 60 | Kreis + Linie | Weiß → Orange → Rot |
| Projektil-Treffer | 6 | Kreis | Weiß |
| Raketen-Trail | 3/frame | Kreis (klein) | Gelb → Transparent |
| Heli-Rauch (bei niedrigem HP) | 1/frame | Kreis | Grau |
| Mündungsfeuer | 4 | Linie | Weiß-Gelb |

---

## Visueller Stil

- **Palette:** Hintergrund `#0a0a0f`, Wände `#1a1a2e`/`#16213e`, Akzente Cyan/Orange/Rot/Grün.
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
