# Fort Akopalueze – Implementierungs-Todo

## Phase 1 – Fundament

- [x] **1. Projektstruktur & Canvas-Grundgerüst**
  HTML-Datei mit Canvas-Element anlegen, Game-Loop (requestAnimationFrame), Input-Handler für Tastatur, grundlegendes State-Management (menu, level_intro, playing, dead, win — `escape` existiert als Enum-Wert, wird aber nicht genutzt, siehe SPEC.md).

- [x] **2. Hubschrauber – Bewegung & Physik**
  Spieler-Entity mit Position, Geschwindigkeit, Trägheit. Thrust in/gegen Blickrichtung, Strafe senkrecht dazu via Shift. Keine Gravitation. Kollisionsbox (Kreis). Sprite als Delta-Dreieck.

- [x] **3. Ressourcen-System (Energie, Schild, Munition)**
  Drei Ressourcen-Balken: Energie, Schild, Munition (0.0–1.0). Energie sinkt beim Thrusten, Schild bei Treffern, Munition pro Schuss (regeneriert automatisch mit der Zeit). Game-Over wenn Energie auf 0 fällt.

- [x] **4. HUD – Anzeige der Ressourcen & Spielstatus**
  Minimalistisches HUD am Rand: Energie-/Schild-/Munitions-Balken als geometrische Segmente. Score oben rechts (6-stellig). Escape-Countdown groß mittig, wenn aktiv.

## Phase 2 – Welt

- [x] **5. Prozeduraler Höhlen-Graph**
  Räume liegen auf einem Gitter als Baum: garantierter Hauptpfad Start → Reaktor plus Sackgassen-Räume. Ausgänge auf allen vier Seiten möglich (links/rechts als Tunnel, oben/unten als organisch verrampte Kerben). Seed-basiert (`Date.now()` pro Levelstart). Raumzahl = `Level + 1` (kein fester 8–12-Bereich mehr, siehe Item 23).

- [x] **6. Kollisionserkennung mit Höhlenwänden**
  Segment-Normalen-Kollision zwischen Heli und Decke/Boden/Hindernissen/Raumkanten. Bei Kollision: Schild-Abzug, Velocity-Reflexion (Sliding-Kollision), kurze Unverwundbarkeit.

- [x] **7. Schuss-System des Spielers**
  Spieler feuert Projektile in Blickrichtung. Linie mit Leuchteffekt. Verbraucht Munition. Projektile verschwinden bei Wand-/Hindernis-/Gegnerkollision, keine Reichweitenbegrenzung.

- [x] **16. Kamera, Scrolling & Minimap**
  Kamera folgt dem Heli innerhalb eines Raums, geclampt auf Raumgrenzen. Raumwechsel: sofortiger Schnitt (kein Fade — weiterhin offen, siehe unten). Zwei geblurrte Parallax-Ebenen, Screen-Shake bei Reaktor-Treffern/-Explosion. Minimap unten links zeigt entdeckte Räume des Höhlen-Graphs.

## Phase 3 – Feinde

- [x] **8. Feind-Typ 1: Gegnerischer Hubschrauber**
  Patrouilliert horizontal, dreht bei Raumgrenze um. Verfolgt Spieler in Sichtweite, schießt periodisch. Geometrisches Sprite (weißes Quadrat).

- [x] **9. Feind-Typ 2: Wandgeschütz**
  Stationär an Boden/Decke. Dreht Lauf zum Spieler bei freier Sichtlinie, feuert seit dem Cave-Graph-Update eine **homing Rakete** statt eines direkten Projektils. Zerstörbar.

- [x] **10. Feind-Typ 3: Mine + Rakete**
  Der ursprünglich geplante stationäre „Raketenwerfer" wurde zur kontaktzündenden **Mine** (detoniert selbst bei Annäherung, feuert nichts ab). Die homing-Rakete existiert weiterhin, wird aber jetzt vom Wandgeschütz (Item 9) abgefeuert. Raketen sind durch Spieler-Projektile nicht abschießbar — nur durch Laserkontakt, Lebensdauer-Ablauf oder Zerstören des Turrets vermeidbar.

- [x] **11. Feind-Typ 4: Laser-Barriere**
  Gepulster Laserstrahl von Decke zu Boden, auch diagonal. Zufällig 0.5–2 s an / 1–5 s aus. Schaden 2.0 Energie/s direkt, ohne Unverwundbarkeit. Zerstört Spieler- und Gegner-Projektile sowie Raketen. Emitter einzeln zerstörbar (4 HP je Emitter).

## Phase 4 – Spielablauf

- [x] **13. Extras / Power-ups**
  Drei Typen: Energie-, Schild-, Munitions-Kugel. 2–3 pro Raum, erste garantiert Energie. Aufsammeln durch Überfliegen (+0.25 pro Pickup).

- [x] **14. Reaktor-Raum & Zerstörungssequenz**
  Letzter Raum des Hauptpfads enthält zentralen Reaktor (Atom-Symbol-Optik, rotierende Orbitringe). 25 Treffer zum Zerstören. Nach Zerstörung: Explosionssequenz mit Screen-Shake und Partikel-Burst (250), danach startet die Escape-Phase. Reaktorkern-Kontakt und Laser-Kontakt ziehen beide kontinuierlich Energie ab (umgehen Schild + Unverwundbarkeit) statt eines fixen Instant-Schadens.

- [x] **23. Level-System**
  Level N hat `N + 1` Räume. Nach Reaktorzerstörung + Escape: Win-Screen zeigt „MIT ENTER ODER LEERTASTE ZUM LEVEL X". Levelstart zeigt „LEVEL X – ZERSTÖRE DEN REAKTOR" (2.5 s, überspringbar). Ressourcen werden zu Levelstart vollständig aufgeladen. Score läuft über alle Level weiter, setzt nur bei neuem Spiel aus dem Menü zurück.

- [x] **15. Escape-Phase: Countdown nach Reaktorzerstörung**
  Countdown läuft dynamisch (`5 s × Anzahl entdeckter Räume`, keine feste Zeit). Spieler muss zurück zum Startraum. Bei 0 Sekunden: `State.DEAD`. Bei rechtzeitigem Erreichen: Schiff „beamt sich raus" (Umkehrung des Level-Start-Beam-in, 2.4 s, blockiert die Steuerung), erst danach `State.WIN`. Während des gesamten Countdowns pulsiert ein leichter rötlicher Vollbild-Overlay. **Abweichung vom ursprünglichen Plan:** Räume werden beim Rückweg *nicht* mit mehr Gegnern neu bevölkert — bereits besiegte Gegner bleiben besiegt.

- [x] **24. Überlebende (Rescue-Mechanik)** *(nicht ursprünglich geplant, zusätzlich umgesetzt)*
  Pro Level werden `Level`-viele Überlebende in Nicht-Reaktor-Räumen platziert. Einsammeln durch Anflug (35 px) zählt sie als gerettet; die 500 Punkte pro Person werden erst auf dem Win-Screen gutgeschrieben (siehe Item 25). Rein optional, kein Zeitdruck.

- [x] **25. Win-Screen Bonus-Tally** *(nicht ursprünglich geplant, zusätzlich umgesetzt)*
  Beim Erreichen von `State.WIN` wird der Score animiert um Zeit- und Rettungsbonus ergänzt: zuerst zählen die verbleibenden Escape-Sekunden sichtbar herunter (5 Ticks/s, je +50 Punkte), danach erscheinen die geretteten Überlebenden einzeln im Abstand von 1/3 s (je +500 Punkte, gleiches Sprite wie im Spiel). Der Levelwechsel-Hinweis erscheint erst, wenn beide Phasen durchlaufen sind — vorher blockiert `updateWin` jeden Enter/Space-Input.

## Phase 5 – Polishing

- [x] **12. Partikel- & Effekt-System**
  Generisches Partikel-System implementiert: Treffer-Funken, Schub-Trail, Raketen-Trail, Minen-/Reaktor-Explosions-Burst, Level-Intro-„Beam-in". Partikel mit Lebensdauer, Geschwindigkeit, Alpha-Fade-out, optionalem `maxLife`/`color`-Feld.

- [ ] **17. Visuelles Styling & Atmosphäre**
  Erledigt: dunkler Hintergrund, Wände schwarz, weißes Schiff/Gegner/HUD, Glow via `shadowBlur`, zwei Parallax-Blur-Ebenen, Screen-Shake, Google-Font „Michroma" für UI-Text (durchgängig in Großbuchstaben gesetzt, da Michromas Kleinbuchstaben verzerrt wirken).
  Offen: Scan-Line-Overlay für Retro-Look, flackernde Raumbeleuchtung.

- [x] **18. Sound-Effekte (Web Audio API)**
  Erledigt: Rotor-Hum (Loop), Schuss, Treffer, Wandkollision, Tod, Gegner-Tod, Raketen-Abschuss/-Explosion, Minen-Alarm/-Explosion, Laser-Emitter-Zerstörung, Laser-Kontakt (Loop), Reaktor-Treffer/-Explosion, Pickup (je Ressourcentyp), Sieg-Fanfare, Game-Over — alles synthetisch. Zusätzlich eine Hintergrundmusik-Loop aus zwei externen MP3-Dateien (`sound/reactor-under-ice.mp3`, `sound/reactor-power.mp3`), die pro Level alternierend gewählt werden.
  Offen: Alarm-Sirene / Countdown-Piep für die Escape-Phase, Lautstärke-Regler.

- [ ] **19. Menü, Game-Over & Win-Screen**
  Erledigt: Start-Screen mit Titel + Start-Hinweis, generischer Game-Over-Screen mit Neustart-Hinweis, Win-Screen mit Score-Anzeige, animierter Zeit-/Rettungsbonus-Tally (siehe Item 25) und Weiter-zum-nächsten-Level-Hinweis.
  Offen: Todesursache im Game-Over-Screen (kein Fuel/Schild/Zeit-Text, nur „GAME OVER"), Score-Anzeige auf dem Game-Over-Screen.

- [ ] **20. Schwierigkeitsgrade & Balancing**
  Nicht implementiert — es gibt keine Easy/Normal/Hard-Auswahl. Einzige Skalierung: Gegneranzahl steigt mit der Raumtiefe im Höhlen-Graph, sowie Raum-/Überlebendenzahl pro Level.

- [ ] **21. Highscore & LocalStorage**
  Nicht implementiert — kein `localStorage`-Zugriff im Code. Score-Grundsystem vorhanden: `score.js`, +100/Gegner, +5000/Reaktor sofort, +50/Escape-Sekunde und +500/Überlebender animiert im Win-Bonus-Tally (Item 25), 6-stellige HUD-Anzeige oben rechts, läuft über Level weiter.

- [ ] **22. Mobile-/Gamepad-Support** *(optional)*
  Gamepad API für Controller-Support. On-Screen-Buttons für Touch-Geräte (vier Richtungen + Feuer). Canvas ist aktuell fix 1024×768 px ohne CSS-Viewport-Scaling.
