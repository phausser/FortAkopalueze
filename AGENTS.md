# Fort Akopalueze – Agents & Entities

Dieses Dokument beschreibt alle aktiven Spielobjekte (Agents) im Spiel: ihre Zustandsmaschinen, Eigenschaften, Verhalten und Interaktionen.

---

## Gemeinsames Entity-Interface

Gegner (`room.enemies`) teilen sich ein loses gemeinsames Shape, kein Klassen-Interface:

```js
{
  kind,          // 'helicopter' | 'turret' | 'mine'
  x, y,          // Position (Weltkoordinaten)
  hp,            // Aktuelle Trefferpunkte
  state,         // z.B. 'patrol' | 'chase' | 'idle' | 'tracking' | 'alert' | 'dying'
  dyingTimer,    // Countdown fürs Blink-Sterben (0.5 s)
}
```

Update/Draw laufen über zentrale Dispatcher in `enemies.js` (`updateEnemies`/`drawEnemies`), die je nach `kind` an `helicopter.js`, `turret.js` oder `mine.js` delegieren. Andere Agents (Missile, LaserBarrier, Reactor, Pickup, Survivor) haben jeweils ihr eigenes, spezifisches Shape in ihrem Modul.

---

## Agent: Player (Spieler-Hubschrauber)

### Eigenschaften

| Feld | Wert |
|---|---|
| Sprite | Delta-Dreieck (Outline), Spitze vorne, 2 Punkte hinten — weiß `#ffffff`, `lineWidth 6` |
| Energie | 0.0–1.0; sinkt um `0.0175/s` beim Thrusten |
| Schild | 0.0–1.0; sinkt bei Treffern (Projektile, Kollision, Raketen-/Minen-Splash); bei 0 nächster (nicht-direkter) Treffer = Tod |
| Munition | 0.0–1.0 (160 Schüsse = voll); regeneriert automatisch mit `+1/120 pro Sekunde`; kein Schuss wenn leer |
| Kollisionsradius | 12 px (Kreis) |

### Zustandsmaschine

```
FLYING (immer aktiv) ──hp=0──→ [State: DEAD]
```

Es gibt kein separates IDLE/DYING-Substate im Code — der Spieler wird durch Input direkt bewegt, Tod löst sofort den globalen `State.DEAD` aus (kein Todesanimations-State).

### Verhalten

- **Bewegung:** `←`/`→` rotiert das Schiff (`3.0 rad/s`), `↑`/`↓` addiert Schub (`250 px/s²`) in/gegen Blickrichtung. `Shift`+`←`/`→` gleitet senkrecht zur Blickrichtung (Strafe, `180 px/s`, keine Rotation). Geschwindigkeit wird dt-basiert gedämpft (`SHIP_DAMPING = 0.99`). Keine Gravitation.
- **Schießen:** `Space` feuert Projektil aus der Schiffspitze in Blickrichtung. Feuerrate 5/s (`FIRE_COOLDOWN = 0.2 s`). Kostet `1/160` Munition.
- **Kollisionsreaktion:** Segment-normale-basierter Push-out + Velocity-Reflexion (`RESTITUTION = 0.25`). Schild `−0.05` pro Wandkontakt, `0.5 s` Unverwundbarkeit (Schiff blinkt).
- **Schub-Trail:** Partikel-Effekt aus dem Heck, solange `↑` gehalten wird.
- **Beam-in:** beim Levelstart (Übergang `LEVEL_INTRO → PLAYING`) 1.2 s Einblende-Animation mit Teleport-Partikeln, Schiff fadet von unsichtbar zu sichtbar ein.

### Interaktionen

| Mit | Effekt |
|---|---|
| Wand | −0.05 Schild, Bounce, 0.5 s Unverwundbarkeit |
| Feind-Projektil (Helikopter) | −0.08 Schild, 0.5 s Unverwundbarkeit |
| Feind-Hubschrauber (Kollision) | −0.08 Schild |
| Rakete (Splash, `< 40 px`) | −0.2 Schild |
| Mine (Splash, `< 100 px`, Distanz-Falloff) | bis −0.5 Schild |
| Laser (im Strahl) | −2.0 Energie/s, direkt (kein Schild, keine Unverwundbarkeit) |
| Reaktor (Körperkontakt) | −2.0 Energie/s, direkt (kein Schild, keine Unverwundbarkeit) |
| Extra/Power-up | Ressource +0.25 |
| Überlebender | zählt als gerettet (`+500` Score erst im Win-Bonus-Tally) |
| Startraum (während Escape-Countdown) | → `State.WIN` |

---

## Agent: EnemyHelicopter (Feind-Hubschrauber)

### Eigenschaften

| Feld | Wert |
|---|---|
| Sprite | Gefülltes weißes Quadrat 14×14 px |
| HP | 2 |
| Schussrate | alle 1.5 s |

### Zustandsmaschine

```
patrol ──dist < 400px──→ chase
chase  ──dist > 500px──→ patrol
chase  ──fireCooldown ≤ 0──→ schießt (bleibt in chase)
any    ──hp = 0──→ dying (0.5 s Blinken, dann entfernt)
```

### Verhalten

- **patrol:** Fliegt horizontal mit `±80 px/s`. Dreht um 20 px vor Raumgrenze.
- **chase:** Fliegt direkt auf Spieler zu, `150 px/s`. Hält Mindestabstand `80 px`. Schießt alle 1.5 s (`300 px/s`-Projektil).
- **dying:** Blinkt 0.5 s (14 Hz), dann aus Array entfernt. Partikel bei Treffer.
- Y wird pro Frame auf den Bereich zwischen Decke und Boden geclampt.

### Interaktionen

| Mit | Effekt |
|---|---|
| Spieler-Projektil | −1 HP, Partikel; bei `hp ≤ 0` +100 Score |
| Spieler (Körperkontakt) | −0.08 Schild (mit Unverwundbarkeits-Fenster) |

---

## Agent: Turret (Wandgeschütz)

### Eigenschaften

| Feld | Wert |
|---|---|
| Sprite | Halbkreis-Körper r=9 px (gefüllt) + Lauf 13 px (Linie, lineWidth 5), weiß |
| HP | 3 |
| Schussrate | alle 3.0 s |
| Reichweite | 380 px |
| Montierung | Boden oder Decke (zufällig beim Spawn), stationär |

### Zustandsmaschine

```
idle     ──dist < 380px──→ tracking
tracking ──dist > 380px──→ idle
tracking ──fireCooldown ≤ 0 + Sichtlinie frei──→ feuert Rakete
any      ──hp = 0──→ dying (0.5 s Blinken, dann entfernt)
```

### Verhalten

- **idle:** Lauf zeigt senkrecht in den Hohlraum (Boden → `−π/2`, Decke → `π/2`).
- **tracking:** Lauf dreht sich mit `2 rad/s` zum Spieler. Winkel auf Cave-Seite beschränkt (Boden: `−π…0`, Decke: `0…π`).
- **feuert:** Nur wenn `hasLineOfSight` true. Spawnt eine homing **Missile** (siehe unten) aus der Laufspitze — kein direktes Projektil.
- Position ist fest, kein `vx`/`vy`. Kein Körperkontakt-Schaden am Spieler.

### Interaktionen

| Mit | Effekt |
|---|---|
| Spieler-Projektil (r < 10 px) | −1 HP, Partikel; bei `hp ≤ 0` +100 Score |

---

## Agent: Mine

### Eigenschaften

| Feld | Wert |
|---|---|
| Sprite | pulsierender weißer Kreis, Radius 10 px |
| HP | 3 |
| Alert-Distanz | 150 px |
| Trigger-Distanz | 80 px (sofortige Detonation, kein Cooldown) |
| Explosionsradius | 100 px |
| Max. Schaden | 0.5 Schild (linearer Distanz-Falloff) |

### Zustandsmaschine

```
idle  ──dist < 150px──→ alert (pulsiert, Alarm-Sound einmalig)
alert ──dist ≥ 150px──→ idle
alert ──dist < 80px──→ explodiert → dying
any   ──hp = 0──→ dying (Explosion ohne vorherigen Alert nötig)
```

### Verhalten

- Stationär, keine Bewegung. Ersetzt den früheren „Raketenwerfer" — die Mine feuert selbst nichts ab, sondern detoniert per Kontaktzünder.
- Explosion: 200 Partikel-Burst, Splash-Schaden mit Distanz-Falloff an den Spieler, danach `dying`-State (schnell entfernt).

### Interaktionen

| Mit | Effekt |
|---|---|
| Spieler-Projektil | −1 HP, Partikel; bei `hp ≤ 0` +100 Score (Mine wird entschärft, keine Explosion) |
| Spieler (< 80 px) | Explosion, bis −0.5 Schild |

---

## Agent: Missile (Homing-Rakete, von Turrets abgefeuert)

### Eigenschaften

| Feld | Wert |
|---|---|
| Sprite | Dreieck 10×8 px + Flammen-Trail (Partikel), weiß |
| Geschwindigkeit | 120 px/s |
| Kurskorrektur | max. `π rad/s` in Richtung Spieler |
| Lebensdauer | max. 5 s |
| Splash-Radius | 40 px |
| Splash-Schaden | 0.2 Schild (normaler Treffer, kein Bypass) |

### Zustandsmaschine

```
homing ──player hit, wall hit, oder Laser-Kontakt──→ exploding
homing ──lifeTimer ≤ 0──→ exploding
exploding ──animation done (0.4 s)──→ entfernt
```

### Verhalten

- **homing:** Berechnet Winkel zum Spieler, korrigiert Flugrichtung um max. `π rad/s`.
- **exploding:** Partikel-Explosion (20 Partikel), Splash-Schaden in 40 px Radius, falls Spieler getroffen.
- Emittiert 3 Trail-Partikel alle `1/30 s`.
- **Kann nicht durch Spieler-Projektile zerstört werden** — Raketen sind kein Mitglied von `room.enemies` und werden von der Projektil-Kollisionsprüfung nicht erfasst. Einzige Abwehr: Ausweichen, ein aktiver Laserstrahl, Lebensdauer-Ablauf, oder das Zerstören des abfeuernden Turrets (verhindert Nachschub).

### Interaktionen

| Mit | Effekt |
|---|---|
| Spieler (Kollision) | Explosion, bis −0.2 Schild (Splash) |
| Laser-Strahl (aktiv) | Explosion, kein Schaden am Spieler |
| Wand | Explosion |

---

## Agent: LaserBarrier (Laser-Barriere)

### Eigenschaften

| Feld | Wert |
|---|---|
| Sprite | Linie zwischen zwei Emitter-Rechtecken (8×8 px), Glow, Farbe Weiß `#ffffff` |
| Emitter-HP | 4 (jeder Emitter einzeln zerstörbar) |
| Takt | 0.5–2 s an / 1–5 s aus (zufällig, pro Barriere unabhängig) |
| Schaden | 2.0 Energie/s direkt (kein Schild, keine Unverwundbarkeit) |

### Zustandsmaschine

```
on ──timer──→ off
off ──timer──→ on
any emitter ──hp=0──→ disabled (Strahl permanent aus)
```

### Verhalten

- Emitter A an Decke, Emitter B am Boden — auch diagonal versetzt (bis ±250 px).
- Strahl ist eine Linie mit `shadowBlur = 12`, weiß.
- Schaden pro Frame solange Spieler-Kreis den Strahl schneidet und Zustand `on`.
- Zerstört Spieler-Projektile, Gegner-Projektile und Raketen beim Kontakt mit dem Strahl.
- Ein zerstörter Emitter → Barriere dauerhaft deaktiviert.
- 0–2 Barrieren pro Raum (nicht in treasury/reactor).

### Interaktionen

| Mit | Effekt |
|---|---|
| Spieler (Kontakt, on) | −2.0 Energie/s, direkt |
| Spieler-Projektil (Strahl, on) | Projektil zerstört |
| Spieler-Projektil (Emitter) | −1 HP Emitter |
| Gegner-Projektil (Strahl, on) | Projektil zerstört |
| Rakete (Strahl, on) | Rakete explodiert |

---

## Agent: Reactor (Reaktor)

### Eigenschaften

| Feld | Wert |
|---|---|
| Sprite | 3 gekippte elliptische Orbitringe mit rotierenden „Elektronen" (Atom-Symbol), dunkelroter Kern mit Glanzlicht |
| Kernradius | 22 px |
| HP | 25 (ein Spieler-Projektiltreffer = −1 HP) |
| Score bei Zerstörung | 5000 |

### Zustandsmaschine

```
intact ──hp = 0──→ exploding
exploding ──explodeTimer ≤ 0 (2.5s)──→ „destroyed" (Escape-Countdown startet)
```

Es gibt keine separate „DAMAGED"-Zwischenstufe mit eigenem Aussehen — der Reaktor bleibt visuell bis `hp = 0` unverändert (nur ein kurzer Treffer-Flash pro Hit).

### Verhalten

- **intact:** Orbitringe rotieren, Elektronen kreisen; bei Körperkontakt zieht der Reaktor `2.0 Energie/s` direkt vom Spieler ab.
- **exploding:** Sequenz über 2.5 s: wachsende weiße Blitzkugel, 250-Partikel-Burst, Screen-Shake (`20`, klingt ab).
- Gibt selbst keine Projektile ab. Wird typischerweise von 4–6 Gegnern bewacht (siehe Spawn-Logik im Reaktorraum).

### Interaktionen

| Mit | Effekt |
|---|---|
| Spieler-Projektil | −1 HP, Screen-Shake `6`, Treffer-Flash |
| Spieler (Körperkontakt) | −2.0 Energie/s, direkt |

---

## Agent: Pickup (Extra / Power-up)

### Eigenschaften

| Feld | Wert |
|---|---|
| Sprite | Kugel r=6 px, Schattenfarbe als Basis, hellerer Kreis oben-links geclippt |
| Kollisionsdistanz | 22 px |
| HP | — (kein Schaden möglich) |

### Typen

| Typ | Basisfarbe | Schattenfarbe | Effekt |
|---|---|---|---|
| `energy` | `#4488ff` | `#1144aa` | +0.25 Energie |
| `shield` | `#44ff88` | `#11aa44` | +0.25 Schild |
| `ammo` | `#ffdd44` | `#aa8811` | +0.25 Munition |

### Verhalten

- Statisch, keine Bewegung. Spawn: 2–3 pro Raum (auch im Reaktorraum generiert, dort aber direkt vom Spiel geleert). Erste Kugel eines Raums ist immer `energy`, Rest zufällig.
- Bei Kollision mit Spieler: Ressource `+0.25` (max. 1.0), Impact-Partikel, entfernt.

---

## Agent: Survivor (Überlebender)

### Eigenschaften

| Feld | Wert |
|---|---|
| Sprite | Invertiertes Dreieck (Körper) + Kreis (Kopf) + winkender Arm (Rechteck), weiß |
| Kollisionsdistanz | 35 px |
| Score bei Rettung | 500 (gutgeschrieben erst auf dem Win-Screen, siehe unten) |

### Zustandsmaschine

```
waiting ──dist < 35px──→ rescued (entfernt, zählt in survivorState.rescuedCount)
```

### Verhalten

- Statisch, steht auf dem Boden des Raums. Arm winkt per Sinus-Animation.
- Platziert zu Levelstart: Anzahl = aktuelle Levelnummer, zufällig über alle Nicht-Reaktor-Räume verteilt, außerhalb der Ausgangs-Freihaltezonen.
- **Score-Vergabe ist entkoppelt:** `updateSurvivors` (in `survivors.js`) inkrementiert nur `survivorState.rescuedCount` — kein `addScore`-Aufruf beim Einsammeln. Die eigentlichen `+500` pro Person werden erst beim Erreichen von `State.WIN` als animierte Bonus-Tally vergeben (siehe SPEC.md „Win-Bonus-Tally", Logik in `game.js: updateWinBonus`).

### Interaktionen

| Mit | Effekt |
|---|---|
| Spieler (< 35 px) | Impact-Partikel, entfernt, `rescuedCount++` (Score-Gutschrift folgt auf dem Win-Screen) |

---

## Agent: Projectile (Spieler-Projektil)

Wird ausschließlich vom Spieler verwendet (Gegner-Projektile sind ein separates, einfacheres Array in `enemies.js`).

### Eigenschaften

| Feld | Wert |
|---|---|
| Sprite | Linie 8 px lang, `lineWidth 2`, weiß, `lineCap round` |
| Geschwindigkeit | 600 px/s |
| Reichweite | kein Limit — verschwindet bei Wand-/Hinderniskollision |

### Verhalten

- Fliegt in konstanter Richtung (Blickrichtung des Schiffs bei Abschuss).
- Kollision: Decke/Boden via `interpolateWall`, Hindernisse via `pointInTriangle`, Gegner via Kreis-Distanz (Radius je nach `kind`: Turret 10 px, Mine 10 px, Helikopter 7 px), Reaktor-Kern via Kreis-Distanz, Laser-Emitter via Kreis-Distanz.
- Bei Treffer: 12 Partikel in Zufallsrichtungen, Fade-out über 0.42 s.
- **Trifft keine Raketen** (siehe Agent: Missile).

---

## Spawn-Logik

Beim Generieren eines Raums wird folgendes platziert (Reihenfolge in `game.js: initLevel`):

1. **Gegner:** siehe SPEC.md „Gegner → Spawn-Logik". Keine Gegner in Schatzkammer-Räumen; 4–6 im Reaktorraum.
2. **Laser-Barrieren:** 0–2 pro Raum, nie in Schatzkammer/Reaktor, nie in einer Ausgangs-Freihaltezone.
3. **Extras:** 2–3 pro Raum, außerhalb der Ausgangs-Freihaltezonen.
4. **Reaktor:** nur im letzten Raum des Hauptpfads, zentriert. Pickups des Reaktorraums werden nach der Generierung geleert.
5. **Überlebende:** über alle Nicht-Reaktor-Räume verteilt, Anzahl = Levelnummer (separater Spawn-Pass nach der Raumgenerierung, eigener Seed-Offset).

---

## Kollisions-Prüfungen pro Frame

Tatsächliche Reihenfolge in `updatePlaying` (`game.js`):

1. Spieler ↔ Wand (`resolveCollisions`)
2. Gegner-Update (inkl. Spieler ↔ Feind-Hubschrauber Körperkontakt, Turret-/Minen-Zustandslogik)
3. Spieler-Projektile ↔ Wand / Hindernisse / Gegner
4. Gegner-Projektile ↔ Wand / Spieler
5. Raketen ↔ Wand / Spieler / Lebensdauer
6. Laser: Spieler-Projektile ↔ Emitter, Strahl ↔ Spieler / Gegner-Projektile / Raketen
7. Spieler ↔ Pickups
8. Spieler ↔ Überlebende
9. Reaktor: Spieler-Körperkontakt, Spieler-Projektile ↔ Kern
