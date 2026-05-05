# Architekturübersicht

## Zielbild

Die Anwendung ist als SaaS-fähige Legal-Tech-Anwendung gedacht:

- Frontend: responsive Browseroberflaeche mit deutscher UI, Hell-/Dunkelmodus und Exportfunktionen.
- Backend: Node.js API mit klaren Routen, Validierung, Recherche-Service und Connector-Adaptern.
- Persistenz: lokal dateibasiert für sofortigen Betrieb; produktiv PostgreSQL über `DATABASE_URL`.
- Jobs: In-Memory-Queue im lokalen Betrieb, produktiv ersetzbar durch Redis/BullMQ, Cloud Tasks oder Sidekiq-ähnliche Worker.
- Hosting: Docker-fähig, geeignet für Fly.io, Render, Railway, Cloud Run oder einen VPS.

## Rechtliche Leitlinie

Die App versucht nicht, Eigentümerdaten zu erraten. Sie trennt:

1. offiziell verifizierte Objektdaten,
2. öffentlich auffindbare Indizien,
3. nicht bestätigte Treffer.

Namen von Eigentümern/Titularen werden nur angezeigt, wenn ein offizieller Adapter eine belastbare Quelle mit entsprechender Berechtigung liefert. Frei zugängliche Catastro-Daten enthalten nach offizieller Darstellung keine geschützten Titular- und Wertdaten.

## Connector-Prinzip

Jede Quelle ist ein Adapter mit gleicher Schnittstelle:

```js
{
  id: "catastro-public",
  name: "Sede Electrónica del Catastro",
  run(context) => Promise<SourceResult>
}
```

Dadurch können später weitere offizielle Quellen ergänzt werden, ohne UI oder Recherchelogik umzubauen.

## Produktiver Ausbau

- PostgreSQL aktivieren und `DATA_FILE` deaktivieren.
- Queue durch Redis/BullMQ oder Cloud-Queue ersetzen.
- Offizielle Registerprozesse nur mit sauberer Zweckbindung, Protokollierung und Berechtigungsnachweis automatisieren.
- Observability: strukturierte Logs an OpenTelemetry, Sentry oder ein SIEM anbinden.
