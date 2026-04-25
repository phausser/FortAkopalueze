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
| Energie | 0.0–1.0 (intern); Verlust 0.05 pro Wandkontakt |
| Munition | 0.0–1.0 (80 Schüsse = voll) |
| Schild | 0.0–1.0 (noch nicht aktiv) |
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

- **Bewegung:** `←`/`→` rotiert das Schiff, `↑`/`↓` addiert Schub in/gegen Blickrichtung. Geschwindigkeit wird dt-basiert gedämpft (`SHIP_DAMPING = 0.99`). Keine Gravitation.
- **Schießen:** `Space` feuert Projektil aus der Schiffspitze in Blickrichtung. Feuerrate: 5/s (`FIRE_COOLDOWN = 0.2 s`). Kostet 1/80 Munition.
- **Kollisionsreaktion:** Segment-normale-basierter Push-out + Velocity-Reflexion (`RESTITUTION = 0.25`). Energie −0.05 pro Treffer, 0.5 s Unverwundbarkeit (Schiff blinkt).
- **Fuel-Verbrauch:** noch nicht implementiert.
- **Rauch-Effekt:** noch nicht implementiert.

### Interaktionen

| Mit | Effekt |
|---|---|
| Wand | -5 HP, Bounce |
| Feind-Projektil | -10 HP |
| Feind-Hubschrauber (Kollision) | -15 HP beide |
| Laser | -2 HP/frame |
| Rakete (Splash) | -20 HP |
| Extra/Power-up | Ressource auffüllen |
| Reaktor (Kollision) | -10 HP |
| Ausgang (Escape-Phase) | → WIN |

---

## Agent: EnemyHelicopter (Feind-Hubschrauber)

### Eigenschaften

| Feld | Wert |
|---|---|
| Sprite | Rechteck 20×8 px + Rotor-Linie, Farbe Orange `#ff6600` |
| HP | 2 |
| Score bei Tod | 100 |
| Schussrate | alle 1.5 s |

### Zustandsmaschine

```
PATROL ──player in range (< 400px)──→ CHASE
CHASE ──player out of range (> 500px)──→ PATROL
CHASE / PATROL ──fire cooldown ready──→ SHOOT (sofort zurück)
any ──hp=0──→ DYING
```

### Verhalten

- **PATROL:** Fliegt horizontal mit `vx = ±2`. Dreht um bei Wand-Kollision oder Raum-Grenze.
- **CHASE:** Fliegt auf Spieler-Position zu, Geschwindigkeit `3 px/frame`. Hält Mindest-Abstand `80 px`.
- **SHOOT:** Feuert Projektil in Richtung Spieler. Mündungsfeuer-Partikel.
- **DYING:** 0.5 s Explosion-Animation, dann `alive = false`.

### Interaktionen

| Mit | Effekt |
|---|---|
| Spieler-Projektil | -1 HP |
| Wand | Richtungsumkehr |
| Spieler (Kollision) | -15 HP Spieler, -2 HP Feind |

---

## Agent: Turret (Wandgeschütz)

### Eigenschaften

| Feld | Wert |
|---|---|
| Sprite | Kreis r=10 px + Lauf-Linie 14 px, Farbe Rot `#ff2200` |
| HP | 3 |
| Score bei Tod | 150 |
| Schussrate | alle 2.0 s |
| Montierung | Boden / Decke / Wand (links/rechts) |

### Zustandsmaschine

```
IDLE ──player in range (< 350px)──→ TRACKING
TRACKING ──fire cooldown ready──→ SHOOT → TRACKING
TRACKING ──player out of range──→ IDLE
any ──hp=0──→ DYING
```

### Verhalten

- **IDLE:** Lauf zeigt in Montierungs-Richtung (z. B. Boden → nach oben).
- **TRACKING:** Lauf dreht sich zum Spieler, Drehrate `5°/frame`.
- **SHOOT:** Projektil in Lauf-Richtung, Mündungsfeuer-Partikel.
- Position ist fest (kein `vx`/`vy`). Montierungs-Seite bestimmt beim Spawn die Lauf-Startausrichtung.

### Interaktionen

| Mit | Effekt |
|---|---|
| Spieler-Projektil | -1 HP |
| Spieler (Kollision) | -10 HP Spieler |

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
| Sprite | Linie zwischen zwei Emitter-Rechtecken (8×8 px), Glow, Farbe Cyan `#00ffff` |
| Emitter-HP | 4 (jeder Emitter einzeln zerstörbar) |
| Score bei Zerstörung | 200 (beide Emitter) |
| Takt | 0.8 s an / 0.4 s aus |
| Schaden | 2 HP/frame (nur wenn aktiv/an) |

### Zustandsmaschine

```
ON ──timer──→ OFF
OFF ──timer──→ ON
any emitter ──hp=0──→ DISABLED (Strahl permanent aus)
```

### Verhalten

- Zwei Emitter an festen Positionen (Wand-zu-Wand oder Gerät-zu-Gerät).
- Strahl ist eine Linie mit `shadowBlur = 12`.
- Schaden wird pro Frame geprüft, solange Spieler-Kollisionsbox den Strahl schneidet und Zustand `ON`.
- Wenn ein Emitter zerstört wird → Barriere dauerhaft deaktiviert.

### Interaktionen

| Mit | Effekt |
|---|---|
| Spieler (Kontakt, ON) | -2 HP/frame |
| Spieler-Projektil (Emitter) | -1 HP Emitter |

---

## Agent: Reactor (Reaktor)

### Eigenschaften

| Feld | Wert |
|---|---|
| Sprite | 3 konzentrische Hexagone (rotierend), Glow pulsierend, Farbe Blau-Weiß |
| Größe | ca. 80×80 px |
| HP | 12 / 20 / 30 (Easy/Normal/Hard) |
| Score bei Zerstörung | 1000 |

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
| Sprite | Raute 16×16 px mit Symbol, blinkt 0.5 Hz |
| Kollisionsbox | 24×24 px |
| HP | — (kein Schaden möglich) |

### Typen

| Typ | Farbe | Symbol | Effekt |
|---|---|---|---|
| `ENERGY` | Grün `#00ff88` | `+` | +40 HP |
| `AMMO` | Gelb `#ffee00` | `•` | +40 Ammo |
| `FUEL` | Blau `#00aaff` | Tropfen | +50 Fuel |

### Verhalten

- Statisch, keine Bewegung.
- Blinkt durch alternierende `globalAlpha` (1.0 ↔ 0.3).
- Bei Kollision mit Spieler: Ressource auffüllen, Pickup-Sound, `alive = false`.

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
