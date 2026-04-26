# Fort Akopalueze – Implementierungs-Todo

## Phase 1 – Fundament

- [x] **1. Projektstruktur & Canvas-Grundgerüst**
  HTML-Datei mit Canvas-Element anlegen, Game-Loop (requestAnimationFrame), Input-Handler für Tastatur, grundlegendes State-Management (menu, playing, dead, escape, win).

- [x] **2. Hubschrauber – Bewegung & Physik**
  Spieler-Entity mit Position, Geschwindigkeit, Trägheit. Thrust nach oben/unten, Drift links/rechts. Gravitation zieht den Heli langsam nach unten. Kollisionsbox. Sprite als geometrische Form (Rechteck + Rotor-Linien).

- [x] **3. Ressourcen-System (Energie, Munition, Treibstoff)**
  Drei Ressourcen-Balken: HP (Treffer), Ammo (Schüsse), Fuel (Fliegen). Fuel sinkt kontinuierlich beim Fliegen/Thrusten, Ammo pro Schuss, HP bei Kollision/Treffern. Game-Over wenn eine Ressource auf 0 fällt.

- [x] **4. HUD – Anzeige der Ressourcen & Spielstatus**
  Minimalistisches HUD am Rand: Energie-/Fuel-/Ammo-Balken als geometrische Segmente. Raumzähler (aktueller Raum / Gesamt). Countdown-Timer (nur aktiv in Escape-Phase). Score.

## Phase 2 – Welt

- [x] **5. Prozeduraler Höhlen-/Raumgenerator**
  Jeder Raum ist ein Rechteck mit zufälligen Fels-Vorsprüngen (Polygone oben/unten). Eingang links, Ausgang rechts (oder oben/unten für Varianten). Übergänge zwischen Räumen als schmale Tunnel. Seed-basiert, damit Level reproduzierbar sind. 8–12 Räume pro Durchgang, letzter Raum enthält Reaktor.

- [x] **6. Kollisionserkennung mit Höhlenwänden**
  AABB- oder Polygon-Kollision zwischen Heli und Raum-Geometrie. Bei Kollision: HP-Abzug, kurzer Knockback. Wände dürfen nicht durchdrungen werden (Sliding-Kollision).

- [x] **7. Schuss-System des Spielers**
  Spieler feuert Projektile nach rechts (primär) und optional nach links/oben. Projektil als kleines Rechteck mit Leuchteffekt. Verbraucht Munition. Projektile verschwinden bei Wandkollision oder nach maximaler Reichweite.

- [x] **16. Kamera & Scrolling**
  Kamera folgt dem Heli innerhalb eines Raums (oder Raum ist komplett sichtbar bei kleiner Größe). Beim Raumwechsel: kurze Übergangsanimation (Fade oder Slide). Raum-Koordinatensystem unabhängig von Canvas-Größe.

## Phase 3 – Feinde

- [x] **8. Feind-Typ 1: Gegnerischer Hubschrauber**
  Patrouilliert horizontal im Raum, dreht um bei Wandkontakt. Einfache KI: fliegt auf Spieler zu wenn in Sichtweite, schießt periodisch. Geometrisches Sprite (kleines Rechteck + Linien in anderer Farbe).

- [x] **9. Feind-Typ 2: Bodenkanone / Wandgeschütz**
  Stationär an Wand/Boden/Decke befestigt. Dreht Lauf zum Spieler, feuert Projektile in kurzen Intervallen. Kann zerstört werden. Geometrisch: Kreis + drehender Strich.

- [x] **10. Feind-Typ 3: Rakete / Heimsuchungsgeschoss**
  Wird von Raketenwerfer-Gegner abgefeuert und verfolgt den Spieler. Langsamere Kurskorrektur. Explodiert bei Kollision (Splash-Schaden). Geometrisch: Dreieck mit weißem Partikel-Trail.

- [x] **11. Feind-Typ 4: Laser-Barriere**
  Gepulster Laserstrahl von Decke zu Boden, auch diagonal. Zufällig 0.5–2 s an / 1–5 s aus. Schaden 0.01/frame ohne Unverwundbarkeit. Zerstört Spieler- und Gegner-Projektile sowie Raketen. Emitter einzeln zerstörbar (4 HP). Geometrisch: weiße Linie mit Glow, 8×8 px Emitter-Rechtecke.

## Phase 4 – Spielablauf

- [x] **13. Extras / Power-ups**
  Drei Typen: Energie-Kugel (blau), Schild-Kugel (grün), Munitions-Kugel (gelb). Erscheinen zufällig in Räumen (0–2, nicht im letzten Raum). Aufsammeln durch Überfahren (+0.25 pro Pickup). Geometrisch als Kugeln mit Halbmond-Schatten und Glanzpunkt.

- [ ] **14. Reaktor-Raum & Zerstörungssequenz**
  Letzter Raum enthält zentralen Reaktor (großes geometrisches Objekt, pulsiert). Benötigt mehrere Treffer zum Zerstören. Nach Zerstörung: dramatische Explosion, Alarm-Effekt (Bildschirm-Flash, Farbe wechselt zu Rot), 30-Sekunden-Countdown startet.

- [ ] **15. Escape-Phase: 30-Sekunden-Countdown**
  Countdown läuft, Spieler muss zurück zum Eingangs-Raum (Ausgang markiert, Pfeil-Hinweis). Räume füllen sich mit mehr Gegnern/Hindernissen. Bei 0 Sekunden: Explosion, Game-Over. Bei rechtzeitigem Erreichen: Win-Screen.

## Phase 5 – Polishing

- [x] **12. Partikel- & Effekt-System**
  Generisches Partikel-System implementiert: Treffer-Funken, Raketen-Trail, Explosions-Burst. Partikel mit Lebensdauer, Geschwindigkeit, Alpha-Fade-out. `maxLife`-Feld für variable Lebensdauern.

- [ ] **17. Visuelles Styling & Atmosphäre**
  Dunkler Hintergrund, Höhlenwände in dunkelgrau/anthrazit. Spieler-Heli in hellem Cyan/Weiß. Feinde in Orange/Rot. Extras in Signalfarben. Glow-Effekte via Canvas-shadowBlur. Scan-Line-Overlay optional für Retro-Look. Flackernde Beleuchtung in Räumen.

- [ ] **18. Sound-Effekte (Web Audio API)**
  Synthetische Sounds ohne externe Dateien: Rotor-Hum (Oszillator), Schuss (kurzer Noise-Burst), Explosion (tiefer Noise-Sweep), Treffer (kurzer Ton), Alarm/Countdown-Piep, Pickup-Sound. Lautstärke-Regler.

- [ ] **19. Menü, Game-Over & Win-Screen**
  Start-Screen mit Titel, Steuerungshinweisen, Start-Button. Game-Over-Screen: Todesursache (kein Fuel, kein HP, Zeit abgelaufen), Score, Neustart. Win-Screen: Score, Zeit, Neustart. Alles im gleichen geometrischen Stil.

- [ ] **20. Schwierigkeitsgrade & Balancing**
  Drei Stufen (Easy/Normal/Hard): Feind-Anzahl, Feind-Schussrate, Fuel-Verbrauch, Munition variieren. Extras seltener auf Hard. Reaktor-HP höher. Werte in einer Konfig-Tabelle zentralisieren für einfaches Tuning.

- [ ] **21. Highscore & LocalStorage**
  Top-5-Scores pro Schwierigkeitsgrad im LocalStorage speichern. Score berechnet sich aus: Räume durchquert, Feinde zerstört, verbleibende Ressourcen, Escape-Zeit. Highscore-Tabelle im Menü anzeigen.

- [ ] **22. Mobile-/Gamepad-Support** *(optional)*
  Gamepad API für Controller-Support. On-Screen-Buttons für Touch-Geräte (vier Richtungen + Feuer). Canvas skaliert responsiv per CSS.
