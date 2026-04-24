# Fort Akopalueze

Ein browserbasiertes 2D-Hubschrauber-Actionspiel im Retro-Style. Du steuerst einen bewaffneten Helikopter durch prozedural generierte Höhlen, kämpfst gegen Wachdrohnen, Geschütztürme und Raketen – und musst am Ende den Reaktor zerstören und entkommen, bevor der Countdown abläuft.

## Spielablauf

1. Fliege durch 8–12 Räume und halte Energie, Munition und Treibstoff im Blick
2. Zerstöre den Reaktor im letzten Raum
3. Enkomme innerhalb von 30 Sekunden zurück zum Eingang

## Technologien

- **HTML5 Canvas** – Rendering, vollständig geometrisch (keine Sprites/Texturen)
- **Vanilla JavaScript** – Game-Loop via `requestAnimationFrame`, keine Frameworks
- **Web Audio API** – Synthetische Soundeffekte ohne externe Dateien
- **CSS (Custom Properties, Grid)** – Layout und Vollbild-Skalierung
- **LocalStorage** – Highscore-Persistenz

## Starten

Einfach `index.html` im Browser öffnen – keine Build-Tools nötig.

## Steuerung

| Taste | Aktion |
|---|---|
| `W` / `↑` | Schub nach oben |
| `A` `D` / `←` `→` | Drift links / rechts |
| `S` / `↓` | Schub nach unten |
| `Leertaste` | Schießen |
| `ESC` | Pause / Menü |
