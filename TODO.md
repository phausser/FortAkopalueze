# Fort Akopalueze – Implementierungs-Todo

## Phase 1 – Fundament

- [ ] **1. Projektstruktur & Canvas-Grundgerüst**
  HTML-Datei mit Canvas-Element anlegen, Game-Loop (requestAnimationFrame), Input-Handler für Tastatur, grundlegendes State-Management (menu, playing, dead, escape, win).

- [ ] **2. Hubschrauber – Bewegung & Physik**
  Spieler-Entity mit Position, Geschwindigkeit, Trägheit. Thrust nach oben/unten, Drift links/rechts. Gravitation zieht den Heli langsam nach unten. Kollisionsbox. Sprite als geometrische Form (Rechteck + Rotor-Linien).

- [ ] **3. Ressourcen-System (Energie, Munition, Treibstoff)**
  Drei Ressourcen-Balken: HP (Treffer), Ammo (Schüsse), Fuel (Fliegen). Fuel sinkt kontinuierlich beim Fliegen/Thrusten, Ammo pro Schuss, HP bei Kollision/Treffern. Game-Over wenn eine Ressource auf 0 fällt.

- [ ] **4. HUD – Anzeige der Ressourcen & Spielstatus**
  Minimalistisches HUD am Rand: Energie-/Fuel-/Ammo-Balken als geometrische Segmente. Raumzähler (aktueller Raum / Gesamt). Countdown-Timer (nur aktiv in Escape-Phase). Score.

## Phase 2 – Welt

- [ ] **5. Prozeduraler Höhlen-/Raumgenerator**
  Jeder Raum ist ein Rechteck mit zufälligen Fels-Vorsprüngen (Polygone oben/unten). Eingang links, Ausgang rechts (oder oben/unten für Varianten). Übergänge zwischen Räumen als schmale Tunnel. Seed-basiert, damit Level reproduzierbar sind. 8–12 Räume pro Durchgang, letzter Raum enthält Reaktor.

- [ ] **6. Kollisionserkennung mit Höhlenwänden**
  AABB- oder Polygon-Kollision zwischen Heli und Raum-Geometrie. Bei Kollision: HP-Abzug, kurzer Knockback. Wände dürfen nicht durchdrungen werden (Sliding-Kollision).

- [ ] **7. Schuss-System des Spielers**
  Spieler feuert Projektile nach rechts (primär) und optional nach links/oben. Projektil als kleines Rechteck mit Leuchteffekt. Verbraucht Munition. Projektile verschwinden bei Wandkollision oder nach maximaler Reichweite.

- [ ] **16. Kamera & Scrolling**
  Kamera folgt dem Heli innerhalb eines Raums (oder Raum ist komplett sichtbar bei kleiner Größe). Beim Raumwechsel: kurze Übergangsanimation (Fade oder Slide). Raum-Koordinatensystem unabhängig von Canvas-Größe.

## Phase 3 – Feinde

- [ ] **8. Feind-Typ 1: Gegnerischer Hubschrauber**
  Patrouilliert horizontal im Raum, dreht um bei Wandkontakt. Einfache KI: fliegt auf Spieler zu wenn in Sichtweite, schießt periodisch. Geometrisches Sprite (kleines Rechteck + Linien in anderer Farbe).

- [ ] **9. Feind-Typ 2: Bodenkanone / Wandgeschütz**
  Stationär an Wand/Boden/Decke befestigt. Dreht Lauf zum Spieler, feuert Projektile in kurzen Intervallen. Kann zerstört werden. Geometrisch: Kreis + drehender Strich.

- [ ] **10. Feind-Typ 3: Rakete / Heimsuchungsgeschoss**
  Wird von bestimmten Stellungen abgefeuert und verfolgt den Spieler. Langsamere Kurskorrektur. Explodiert bei Kollision (Splash-Schaden). Geometrisch: Dreieck mit Flammen-Trail als Partikel.

- [ ] **11. Feind-Typ 4: Laser-Barriere**
  Gepulster Laserstrahl zwischen zwei Punkten (Wand zu Wand oder Gerät zu Gerät). Blinkt in Intervallen (an/aus). Schaden sofort bei Kontakt. Geometrisch: dünne Linie mit Glow-Effekt, Emitter als kleine Rechtecke.

## Phase 4 – Spielablauf

- [ ] **13. Extras / Power-ups**
  Drei Typen: Energie-Pack (grün), Munitions-Pack (gelb), Treibstoff-Kanister (blau). Erscheinen zufällig in Räumen, blinken leicht. Aufsammeln durch Überfahren. Geometrisch als pulsierende Rauten oder Kreise mit Symbol.

- [ ] **14. Reaktor-Raum & Zerstörungssequenz**
  Letzter Raum enthält zentralen Reaktor (großes geometrisches Objekt, pulsiert). Benötigt mehrere Treffer zum Zerstören. Nach Zerstörung: dramatische Explosion, Alarm-Effekt (Bildschirm-Flash, Farbe wechselt zu Rot), 30-Sekunden-Countdown startet.

- [ ] **15. Escape-Phase: 30-Sekunden-Countdown**
  Countdown läuft, Spieler muss zurück zum Eingangs-Raum (Ausgang markiert, Pfeil-Hinweis). Räume füllen sich mit mehr Gegnern/Hindernissen. Bei 0 Sekunden: Explosion, Game-Over. Bei rechtzeitigem Erreichen: Win-Screen.

## Phase 5 – Polishing

- [ ] **12. Partikel- & Effekt-System**
  Generisches Partikel-System: Explosion (radiale Funken), Treffer-Blitz, Rauch-Trail beim Heli, Mündungsfeuer. Partikel haben Lebensdauer, Geschwindigkeit, Fade-out. Alles geometrisch (Kreise, Linien, Rechtecke).

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
