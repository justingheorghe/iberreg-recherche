# IberReg Recherche

Deutschsprachige Webanwendung zur rechtmäßigen Recherche offizieller spanischer Immobilieninformationen. Die Anwendung zeigt transparent, welche Daten offiziell bestätigt sind, welche nur Indizien darstellen und wann eine offizielle Nota-Simple-/Registeranfrage erforderlich ist.

## Kurze Architekturübersicht

- Browseroberfläche: responsive UI in Deutsch mit Hell-/Dunkelmodus, Ampelsystem, Ladezuständen und Export.
- Backend: Node.js HTTP-API ohne zwingende lokale Drittanbieterabhängigkeiten.
- Connectoren: jede Quelle ist als Adapter gekapselt.
- Persistenz: lokal `data/recherchen.jsonl`; produktiv PostgreSQL vorbereitet.
- Jobs: lokale In-Memory-Queue; produktiv durch Redis/BullMQ oder Cloud-Queue ersetzbar.
- Deployment: Dockerfile und `docker-compose.yml` mit PostgreSQL.

## Dateistruktur

```text
.
├── public/
│   ├── app.js
│   ├── favicon.svg
│   ├── index.html
│   ├── styles.css
│   └── texts.js
├── src/
│   ├── connectors/
│   │   ├── base.js
│   │   ├── catastroPublicConnector.js
│   │   ├── publicLegalIndexConnector.js
│   │   └── registroPropiedadConnector.js
│   ├── jobs/jobQueue.js
│   ├── lib/
│   │   ├── compliance.js
│   │   ├── http.js
│   │   ├── logger.js
│   │   ├── texts.js
│   │   └── validation.js
│   ├── repositories/
│   │   ├── postgresRepository.js
│   │   └── researchRepository.js
│   ├── services/
│   │   ├── exportService.js
│   │   └── researchService.js
│   ├── config.js
│   └── server.js
├── tests/
│   ├── exportService.test.js
│   ├── researchService.test.js
│   └── validation.test.js
├── db/schema.sql
├── docs/ARCHITEKTUR.md
├── .env.example
├── Dockerfile
├── docker-compose.yml
└── package.json
```

## API-Routen

| Route | Methode | Zweck |
| --- | --- | --- |
| `/api/health` | `GET` | Betriebsstatus |
| `/api/recherchen` | `POST` | Recherche mit `{ "address": "..." }` starten |
| `/api/recherchen` | `GET` | Letzte Recherchen anzeigen |
| `/api/recherchen/:id` | `GET` | Recherche und Quellenstatus abrufen |
| `/api/recherchen/:id/export.csv` | `GET` | Rechercheübersicht als CSV |
| `/api/recherchen/:id/export.pdf` | `GET` | Rechercheübersicht als PDF |

## Lokaler Start

Auf dieser Maschine kann die App direkt mit Node gestartet werden:

```bash
node src/server.js
```

Danach im Browser öffnen:

```text
http://localhost:3000
```

Falls npm verfuegbar ist:

```bash
npm install
npm run dev
```

## Tests

```bash
node --test tests/*.test.js
```

oder mit npm:

```bash
npm test
```

## Docker

```bash
docker compose up --build
```

Die Anwendung läuft danach unter:

```text
http://localhost:3000
```

PostgreSQL wird mit `db/schema.sql` initialisiert. Die App versucht bei gesetztem `DATABASE_URL`, PostgreSQL zu verwenden. Wenn lokal kein `pg`-Paket vorhanden ist, fällt sie bewusst auf Datei-Persistenz zurück.

## Deployment

Geeignete Produktionsziele:

- Fly.io oder Render für Docker-Deployments.
- Cloud Run mit Cloud SQL PostgreSQL.
- VPS mit Docker Compose und Reverse Proxy.
- Vercel/Cloudflare für ein späteres Next.js/Edge-Frontend, während die API separat betrieben wird.

Empfohlene produktive Umgebungsvariablen:

```bash
NODE_ENV=production
PORT=3000
APP_BASE_URL=https://ihre-domain.example
DATABASE_URL=postgres://...
EXTERNAL_LOOKUPS_ENABLED=true
CATASTRO_TIMEOUT_MS=4500
RETENTION_DAYS=30
```

## Offizielle Quellenlogik

Die App kapselt aktuell drei Recherchewege:

1. `CatastroPublicConnector`: fragt frei zugängliche, nicht geschützte Catastro-Daten ab, wenn die Eingabe ausreichend strukturiert ist.
2. `RegistroPropiedadConnector`: dokumentiert den offiziellen Nota-Simple-/Nota-Online-Weg. Ohne Antrag oder Berechtigungsnachweis wird kein Eigentümername abgerufen.
3. `PublicLegalIndexConnector`: ordnet öffentliche Bekanntmachungen und Verzeichnisse nur als Indizien ein.

## Rechtliche Grenzen

- Keine Rechtsberatung.
- Keine Garantie auf Vollstaendigkeit.
- Catastro-Titularität, Identifikationsnummern, Wohnsitze und Katasterwerte sind geschützte Daten und nicht Teil frei zugänglicher Catastro-Abfragen.
- Ein Eigentümername wird nur angezeigt, wenn eine offizielle Quelle ihn belastbar liefert.
- Wenn keine belastbare offizielle Quelle vorliegt, lautet die Ergebnislogik: Der Besitzer bzw. Eigentümer ist aus den geprüften frei zugänglichen Quellen nicht öffentlich bekannt.
- Für eine belastbare Eigentümerinformation ist regelmäßig eine offizielle Nota Simple oder Registerauskunft beim Registro de la Propiedad notwendig.

## Wichtige offizielle Referenzen

- Sede Electrónica del Catastro: https://www.sedecatastro.gob.es/
- Catastro: Datenzugang und geschützte Daten: https://www.catastro.hacienda.gob.es/es-ES/faqs.html
- Catastro: Referencia Catastral: https://www.catastro.hacienda.gob.es/es-ES/referencia_catastral.html
- Catastro-Webservices für nicht geschützte Daten: https://www.catastro.hacienda.gob.es/ayuda/servicios_web.htm
- Registro de la Propiedad / Nota Simple: https://sede.registradores.org/site/propiedad?lang=es_ES

## Offene Punkte für echten Produktivbetrieb

- Juristische Prüfung der konkreten Nutzungsbedingungen jeder automatisierten Quelle.
- Nutzerkonto, Zweckbindung, Rollenmodell und Einwilligungs-/Berechtigungsnachweise.
- Vollstaendige PostgreSQL-Migrationen und Aufbewahrungsloeschjobs.
- Monitoring, Rate-Limits, Audit-Export und Sicherheitsheader hinter Reverse Proxy.
- Offizielle Integrationen für kostenpflichtige Registerauskünfte nur über zulässige Vertrags- oder Nutzerprozesse.
