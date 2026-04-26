# Fort Akopalueze – Agents & Entities

Dieses Dokument beschreibt alle aktiven Spielobjekte (Agents) im Spiel: ihre Zustandsmaschinen, Eigenschaften, Verhalten und Interaktionen.

---

## Gemeinsames Entity-Interface

Alle Agents implementieren folgende Basis-Felder und Methoden:

```js
{
  x, y,          // Position (Weltkoordinaten)
  vx, vy,        // Geschwindigkeit (px/frame)
  width, height, // Kollisionsbox
  hp,            // Aktuelle Trefferpunkte (0 = tot)
  alive,         // Boolean, wird false wenn hp <= 0
  update(dt),    // Logik-Update pro Frame
  draw(ctx),     // Rendering auf Canvas
  onHit(damage), // Eingehender Schaden
  onDeath(),     // Aufräumen, Partikel, Score
}
```

---

## Agent: Player (Spieler-Hubschrauber)

### Eigenschaften

| Feld | Wert |
|---|---|
| Sprite | Delta-Dreieck (Outline), Spitze vorne, 2 Punkte hinten — weiß `#ffffff`, `lineWidth 6` |
| Farbe | Weiß `#ffffff` |
| Energie | 0.0–1.0; sinkt um `0.035/s` beim Thrusten |
| Schild | 0.0–1.0; sinkt bei Treffern (Projektile, Kollision, Laser); bei 0 nächster Treffer = Tod |
| Munition | 0.0–1.0 (80 Schüsse = voll); kein Schuss wenn leer |
| Kollisionsradius | 12 px (Kreis) |

### Zustandsmaschine

```
IDLE ──thrust──→ FLYING
FLYING ──no input──→ IDLE (Trägheit läuft aus)
FLYING ──fire──→ FIRING (1-Frame-Zustand, dann zurück)
any ──hp=0──→ DYING
any ──fuel=0──→ DYING
DYING ──animation done──→ [State: DEAD]
```

### Verhalten

- **Bewegung:** `←`/`→` rotiert das Schiff, `↑`/`↓` addiert Schub in/gegen Blickrichtung. `Shift`+`←`/`→` gleitet senkrecht zur Blickrichtung (Strafe, 180 px/s, keine Rotation). Geschwindigkeit wird dt-basiert gedämpft (`SHIP_DAMPING = 0.99`). Keine Gravitation.
- **Schießen:** `Space` feuert Projektil aus der Schiffspitze in Blickrichtung. Feuerrate: 5/s (`FIRE_COOLDOWN = 0.2 s`). Kostet 1/80 Munition.
- **Kollisionsreaktion:** Segment-normale-basierter Push-out + Velocity-Reflexion (`RESTITUTION = 0.25`). Schild −0.05 pro Wandkontakt, 0.5 s Unverwundbarkeit (Schiff blinkt).
- **Energie-Verbrauch:** `ENERGY_DRAIN = 0.035/s` solange ↑ oder ↓ gehalten wird.
- **Rauch-Effekt:** noch nicht implementiert.

### Interaktionen

| Mit | Effekt |
|---|---|
| Wand | −0.05 Schild, Bounce, 0.5 s Unverwundbarkeit |
| Feind-Projektil | −0.08 Schild, 0.5 s Unverwundbarkeit |
| Feind-Hubschrauber (Kollision) | −0.08 Schild |
| Laser | −0.01 Schild/frame (kein Unverwundbarkeits-Fenster) |
| Rakete (Splash) | −0.2 Schild |
| Extra/Power-up | Ressource auffüllen |
| Reaktor (Kollision) | -10 HP |
| Ausgang (Escape-Phase) | → WIN |

---

## Agent: EnemyHelicopter (Feind-Hubschrauber)

### Eigenschaften

| Feld | Wert |
|---|---|
| Sprite | Gefülltes weißes Quadrat 14×14 px |
| Farbe | Weiß `#ffffff` |
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
- **chase:** Fliegt direkt auf Spieler zu, `150 px/s`. Hält Mindestabstand `80 px`. Schießt alle 1.5 s.
- **dying:** Blinkt 0.5 s (14 Hz), dann aus Array entfernt. Partikel bei Treffer.
- Y wird pro Frame auf den Bereich zwischen Decke und Boden geclampt.

### Interaktionen

| Mit | Effekt |
|---|---|
| Spieler-Projektil | −1 HP, Partikel |
| Spieler (Körperkontakt) | −0.08 Energie (mit Unverwundbarkeits-Fenster) |

---

## Agent: Turret (Wandgeschütz)

### Eigenschaften

| Feld | Wert |
|---|---|
| Sprite | Kugel r=4 px (gefüllt) + Rohr 25×5 px (Linie), weiß |
| HP | 3 |
| Schussrate | alle 2.0 s |
| Montierung | Boden oder Decke (zufällig beim Spawn) |
| Hitradius | 10 px |

### Zustandsmaschine

```
idle     ──dist < 380px──→ tracking
tracking ──dist > 380px──→ idle
tracking ──fireCooldown ≤ 0 + Sichtlinie frei──→ schießt
any      ──hp = 0──→ dying (0.5 s Blinken, dann entfernt)
```

### Verhalten

- **idle:** Lauf zeigt senkrecht in den Hohlraum (Boden → −π/2, Decke → π/2).
- **tracking:** Lauf dreht sich mit `2 rad/s` zum Spieler. Winkel auf Cave-Seite beschränkt (Boden: −π…0, Decke: 0…π).
- **schießen:** Nur wenn `hasLineOfSight` true. Projektil in aktueller Laufrichtung, `300 px/s`.
- Sichtlinienprüfung via Segment-Schnitt-Test gegen alle Decken-/Boden-Segmente und Hindernisseiten.
- Position ist fest, kein `vx`/`vy`.

### Interaktionen

| Mit | Effekt |
|---|---|
| Spieler-Projektil (r < 10 px) | −1 HP, Partikel |
| Spieler (Körperkontakt) | −0.08 Energie (mit Unverwundbarkeits-Fenster) |

---

## Agent: MissileLauncher (Raketenwerfer)

### Eigenschaften

| Feld | Wert |
|---|---|
| Sprite | Kreis r=10 px (gefüllt), weiß; pulsiert im Alert-Zustand |
| HP | 3 |
| Alert-Radius | 200 px |
| Feuer-Radius | 150 px |
| Cooldown | 10 s nach Abschuss |

### Zustandsmaschine

```
idle ──dist < 200px──→ alert (pulsiert)
alert ──dist < 150px──→ feuert Rakete → cooldown (10 s)
cooldown ──timer = 0──→ idle
any ──hp = 0──→ dying
```

### Verhalten

- Stationär, keine Bewegung.
- **alert:** Radius oszilliert via `sin(pulseTimer * 8) * 3`.
- **cooldown:** Innerer Ring (dunkelgrau) sichtbar.
- Feuert genau eine Rakete pro Aktivierung aus der eigenen Position.

### Interaktionen

| Mit | Effekt |
|---|---|
| Spieler-Projektil | −1 HP |
| Spieler (Kollision) | kein direkter Schaden (Rakete übernimmt) |

---

## Agent: Missile (Heimsuchungsrakete)

### Eigenschaften

| Feld | Wert |
|---|---|
| Sprite | Dreieck 10×6 px + Flammen-Trail (Partikel), Farbe Gelb-Orange |
| HP | 1 (ein Treffer genügt) |
| Score bei Abschuss | 75 |
| Geschwindigkeit | 4 px/frame |
| Kurskorrektur | max 3°/frame |
| Splash-Radius | 40 px |

### Zustandsmaschine

```
SPAWNED ──→ HOMING
HOMING ──player hit or wall hit──→ EXPLODING
HOMING ──player-projectile hit──→ EXPLODING
EXPLODING ──animation done (0.4 s)──→ alive = false
```

### Verhalten

- **HOMING:** Berechnet Winkel zum Spieler, korrigiert eigene Flugrichtung um max 3°/frame.
- **EXPLODING:** Partikel-Explosion, Splash-Schaden (20 HP) in 40 px Radius.
- Emittiert pro Frame 3 Trail-Partikel (gelb/orange, kurze Lebensdauer).

### Interaktionen

| Mit | Effekt |
|---|---|
| Spieler (Kollision) | Explosion, -20 HP Spieler (Splash) |
| Spieler-Projektil | Explosion (kein Spieler-Schaden wenn nicht in Splash) |
| Wand | Explosion |

---

## Agent: LaserBarrier (Laser-Barriere)

### Eigenschaften

| Feld | Wert |
|---|---|
| Sprite | Linie zwischen zwei Emitter-Rechtecken (8×8 px), Glow, Farbe Weiß `#ffffff` |
| Emitter-HP | 4 (jeder Emitter einzeln zerstörbar) |
| Takt | 0.5–2 s an / 1–5 s aus (zufällig, gestaffelt) |
| Schaden | 0.01/frame direkt (kein Unverwundbarkeits-Fenster) |

### Zustandsmaschine

```
on ──timer──→ off
off ──timer──→ on
any emitter ──hp=0──→ disabled (Strahl permanent aus)
```

### Verhalten

- Emitter A an Decke, Emitter B am Boden — auch diagonal (bis ±250 px versetzt).
- Strahl ist eine Linie mit `shadowBlur = 12`, weiß.
- Schaden pro Frame solange Spieler-Kreis den Strahl schneidet und Zustand `on`.
- Zerstört Spieler-Projektile, Gegner-Projektile und Raketen beim Kontakt mit dem Strahl.
- Ein zerstörter Emitter → Barriere dauerhaft deaktiviert.
- 0–2 Barrieren pro Raum (nicht in treasury/reactor).

### Interaktionen

| Mit | Effekt |
|---|---|
| Spieler (Kontakt, on) | −0.01 Schild/frame (kein Unverwundbarkeits-Fenster) |
| Spieler-Projektil (Strahl, on) | Projektil zerstört |
| Spieler-Projektil (Emitter) | −1 HP Emitter |
| Gegner-Projektil (Strahl, on) | Projektil zerstört |
| Rakete (Strahl, on) | Rakete explodiert |

---

## Agent: Reactor (Reaktor)

### Eigenschaften

| Feld | Wert |
|---|---|
| Sprite | 3 konzentrische Hexagone (rotierend), Glow pulsierend, Farbe Blau-Weiß |
| Größe | ca. 80×80 px |
| HP | 25 |
| Score bei Zerstörung | 5000 |

### Zustandsmaschine

```
INTACT ──hp < 50%──→ DAMAGED
DAMAGED ──hp = 0──→ EXPLODING
EXPLODING ──sequence done──→ [State: ESCAPE aktiviert]
```

### Verhalten

- **INTACT:** Hexagone rotieren langsam, Glow pulsiert (`shadowBlur` 8–20).
- **DAMAGED:** Rotation schneller, Farbe wechselt zu Orange, gelegentliche Funken-Partikel.
- **EXPLODING:** Sequenz über 2 s: mehrere Explosionswellen, Bildschirm-Flash, Alarm.
- Gibt keine eigenen Projektile ab. Ist von Turrets bewacht.

### Interaktionen

| Mit | Effekt |
|---|---|
| Spieler-Projektil | -1 HP |
| Spieler (Kollision) | -10 HP Spieler |

---

## Agent: Pickup (Extra / Power-up)

### Eigenschaften

| Feld | Wert |
|---|---|
| Sprite | Kugel r=6 px, Halbmond-Schatten unten-rechts, Glanzpunkt oben-links |
| Kollisionsradius | 12 px |
| HP | — (kein Schaden möglich) |

### Typen

| Typ | Basisfarbe | Schattenfarbe | Effekt |
|---|---|---|---|
| `energy` | `#4488ff` | `#1144aa` | +0.25 Energie |
| `shield` | `#44ff88` | `#11aa44` | +0.25 Schild |
| `ammo` | `#ffdd44` | `#aa8811` | +0.25 Munition |

### Verhalten

- Statisch, keine Bewegung. Spawn: 0–2 pro Raum, nicht im letzten Raum.
- Bei Kollision mit Spieler: Ressource +0.25 (max 1.0), Impact-Partikel, entfernt.

---

## Agent: Projectile (Projektil)

Wird von Spieler, Feind-Hubschrauber und Wandgeschütz verwendet.

### Eigenschaften

| Feld | Wert |
|---|---|
| Sprite | Linie 8 px lang, `lineWidth 2`, weiß, `lineCap round` |
| Geschwindigkeit | Spieler: `600 px/s` / Feind: (ausstehend) |
| Reichweite | kein Limit — verschwindet bei Wand-/Hinderniskollision |
| Schaden | gegen Feinde: ausstehend |

### Verhalten

- Fliegt in konstanter Richtung in Blickrichtung des Schiffs.
- Kollision: Decke/Boden via `interpolateWall`, Hindernisse via `pointInTriangle`.
- Bei Treffer: 12 Partikel in Zufallsrichtungen, Fade-out über 0.42 s.
- Mündungsfeuer-Partikel: ausstehend.

---

## Spawn-Logik

Beim Generieren eines Raums wird folgendes platziert:

1. **Gegner:** Anzahl und Typ laut Schwierigkeitsgrad und Raum-Typ. Spawn-Positionen: zufällig im freien Luftraum, mindestens `150 px` vom Eingang entfernt.
2. **Laser-Barrieren:** 0–2 pro Raum, horizontal oder vertikal, nie im Tunnel selbst.
3. **Extras:** 0–2 pro Raum (abhängig von Schwierigkeitsgrad), zufällige Position im freien Bereich.
4. **Reaktor:** Nur im letzten Raum, zentriert, mit 2–4 Turrets als Bewachung.

---

## Kollisions-Prioritäten

Reihenfolge der Kollisionsprüfungen pro Frame:

1. Spieler ↔ Wand
2. Spieler ↔ Feind-Projektile
3. Spieler ↔ Laser (wenn ON)
4. Spieler ↔ Feinde (Körperkontakt)
5. Spieler ↔ Reaktor
6. Spieler ↔ Pickups
7. Spieler-Projektile ↔ Feinde
8. Spieler-Projektile ↔ Reaktor
9. Spieler-Projektile ↔ Laser-Emitter
10. Spieler-Projektile ↔ Wand
11. Feind-Projektile ↔ Wand
12. Raketen ↔ Wand / Spieler
