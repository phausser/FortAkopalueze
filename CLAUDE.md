# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Starten

Lokaler Dev-Server nötig (z.B. `python3 -m http.server`), da ES Modules `file://` nicht unterstützen. Dann `index.html` im Browser öffnen.

## Modulstruktur (`script/`)

| Datei | Inhalt |
|---|---|
| `constants.js` | Alle Konstanten + `State`-Enum |
| `input.js` | Tastatur-Handler (`input.isHeld`, `input.isJustPressed`) |
| `resources.js` | `resources.energy/.shield/.ammo` (0.0–1.0) |
| `score.js` | `score.value`, `resetScore()`, `addScore(amount)` |
| `particles.js` | Partikel-Array, `spawnImpactParticles`, update/draw |
| `level.js` | PRNG, `interpolateWall`, `lerp`, `generateLevel(seed, spawnFn)` |
| `ship.js` | `ship`-Objekt, `resetShip`, `applyDamage`, Kollision, `drawShip` |
| `missiles.js` | `missiles[]`, `spawnMissile(x,y)`, update/draw |
| `enemies.js` | Alle Gegnertypen (helicopter/turret/launcher), `enemyProjectiles[]` |
| `laser.js` | `room.lasers[]`, `spawnLasersForRoom`, update/draw |
| `projectiles.js` | `projectiles[]`, `shoot()`, update/draw |
| `game.js` | Game-Loop, State Machine, Renderer, `drawRoom`, `drawHUD` |

## Architektur

**Abhängigkeiten (keine Zyklen):**
`constants ← alle` / `particles ← missiles, enemies, laser, projectiles` / `level ← enemies, missiles, laser, projectiles` / `ship ← enemies, missiles, laser, projectiles` / `missiles ← enemies` / `game ← alles`

**State Machine:** `MENU → PLAYING → ESCAPE → WIN` (oder `→ DEAD`). State-Wechsel nur via `game.setState(State.X)`.

**Game Loop:** `requestAnimationFrame` → `loop(timestamp)` → `stateUpdaters[state](dt)` → `stateRenderers[state](ctx)`. `dt` geclampt auf max 100 ms.

**Level-Generierung:** `generateLevel(seed, spawnFn)` nimmt eine Callback-Funktion `(room, rng) => void` die Enemies und Laser pro Raum spawnt. In `game.js` zusammengesetzt aus `spawnEnemiesForRoom` + `spawnLasersForRoom`.

**Laser-Schaden** umgeht Unverwundbarkeit — direkt `resources.energy -= LASER_DAMAGE` statt `applyDamage()`.

**Canvas:** 1024 × 768 px. Weltkoordinaten ≠ Kamerakoordinaten: immer `ctx.save() / translate(-camX, -camY) / ctx.restore()` für Weltspace.

## Konventionen

- Alle Konstanten in `constants.js` — nie Magic Numbers im Code.
- Neue Entities bekommen eigene Module mit `spawn*`, `update*`, `draw*` Funktionen.
- Kein Render-Code in Update-Logik.
