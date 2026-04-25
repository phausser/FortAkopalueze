# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Starten

Keine Build-Tools nötig. Einfach `index.html` im Browser öffnen.

## Architektur

Single-file JavaScript-Game (`script/game.js`). Kein Framework, kein Bundle-Step.

**State Machine:** `MENU → PLAYING → ESCAPE → WIN` (oder `→ DEAD`).  
State-Wechsel nur via `game.setState(State.X)`.

**Game Loop:** `requestAnimationFrame` → `loop(timestamp)` → `stateUpdaters[state](dt)` → `stateRenderers[state](ctx)`.  
`dt` ist geclampt auf max 100 ms (verhindert Sprünge nach Tab-Wechsel).

**Input:** `input.isHeld(code)` für gehaltene Tasten, `input.isJustPressed(code)` für einmalige Aktionen. `input.clearFrameState()` am Ende jedes Frames aufrufen.

**Ressourcen:** `resources.energy / .shield / .ammo` (0.0–1.0). Reset via `resetResources()` (wird in `resetShip()` aufgerufen).

**Rendering:** Ausschließlich geometrisch auf HTML5 Canvas 2D — keine Bitmaps, keine externen Assets. HUD-Overlay via `drawHUD(ctx)` nach dem Weltrendering zeichnen.

## Konventionen

- Alle Spielkonstanten oben in `game.js` als `const` — nie Magic Numbers im Code verteilen.
- Weltkoordinaten von Kamerakoordinaten trennen, sobald die Kamera eingeführt wird.
- Neue Entities bekommen `update(dt)` und `draw(ctx)` — kein Render-Code in der Update-Logik.
