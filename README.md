# Fort Akopalueze

Ein browserbasiertes 2D-Hubschrauber-Actionspiel im Retro-Style. Du steuerst einen bewaffneten Helikopter durch prozedural generierte Höhlen, kämpfst gegen Wachdrohnen, Geschütztürme, Raketenwerfer und Laser-Barrieren – und musst am Ende den Reaktor zerstören und entkommen, bevor der Countdown abläuft.

## Spielablauf

1. Fliege durch 8–12 Räume und halte Energie, Schild und Munition im Blick
2. Zerstöre den Reaktor im letzten Raum
3. Entkome innerhalb von 30 Sekunden zurück zum Eingang

## Technologien

- **HTML5 Canvas** – Rendering, vollständig geometrisch (keine Sprites/Texturen)
- **Vanilla JavaScript (ES Modules)** – Game-Loop via `requestAnimationFrame`, keine Frameworks
- **Web Audio API** – Synthetische Soundeffekte ohne externe Dateien *(geplant)*
- **CSS** – Layout und Vollbild-Skalierung
- **LocalStorage** – Highscore-Persistenz *(geplant)*

## Starten

Lokalen Dev-Server starten (ES Modules benötigen HTTP):

```bash
python3 -m http.server
```

Dann `http://localhost:8000` im Browser öffnen.

## Steuerung

| Taste | Aktion |
|---|---|
| `↑` | Schub vorwärts |
| `↓` | Schub rückwärts |
| `←` / `→` | Rotieren |
| `Leertaste` | Schießen |
| `ESC` | Pause / Menü |

## Gegner

| Typ | Verhalten |
|---|---|
| Hubschrauber | Patrouilliert, verfolgt und schießt bei Sichtkontakt |
| Wandgeschütz | Stationär, dreht Lauf zum Spieler, schießt bei freier Sicht |
| Raketenwerfer | Stationär, feuert Heimsuchungsrakete bei Annäherung |
| Laser-Barriere | Gepulster Strahl von Decke zu Boden, zerstört Projektile |

## Ressourcen

| Ressource | Farbe | Verlust | Game-Over |
|---|---|---|---|
| **Energie** | Blau | Sinkt beim Thrusten (↑/↓) | Bei 0 sofort tot |
| **Schild** | Grün | Treffer von Projektilen, Laser, Kollision | Bei 0: nächster Treffer = Tod |
| **Munition** | Gelb | Pro Schuss | Kein Schießen mehr möglich |

## Power-ups

Farbige Kugeln in den Räumen. Aufsammeln durch Überfahren (+25 %).

| Farbe | Effekt |
|---|---|
| Blau | +Energie |
| Grün | +Schild |
| Gelb | +Munition |
