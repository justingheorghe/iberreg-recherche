import React, { useState, useCallback, useRef } from "react";
import { TEXT } from "./lib/texts.js";
import { parseCsv, detectColumns, extractAddresses } from "./lib/csv.js";
import { createResearch, getResearch } from "./lib/api.js";

const POLL_INTERVAL = 900;

export default function App() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || "light");
  const [mode, setMode] = useState("single");
  const [singleResult, setSingleResult] = useState(null);
  const [singleError, setSingleError] = useState(null);
  const [singleLoading, setSingleLoading] = useState(false);
  const [polling, setPolling] = useState(false);

  const [csvState, setCsvState] = useState("idle");
  const [csvData, setCsvData] = useState(null);
  const [addressColumn, setAddressColumn] = useState("");
  const [refCatastralColumn, setRefCatastralColumn] = useState("");
  const [batchRows, setBatchRows] = useState([]);
  const pollTimers = useRef({});

  const toggleTheme = useCallback(() => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("iberreg-theme", next);
    setTheme(next);
  }, [theme]);

  const resetSingle = useCallback(() => {
    setSingleResult(null);
    setSingleError(null);
    setSingleLoading(false);
    setPolling(false);
  }, []);

  const handleSingleSearch = useCallback(async (address) => {
    setSingleError(null);
    setSingleLoading(true);
    setSingleResult(null);
    try {
      const researchCase = await createResearch(address);
      setSingleResult(researchCase);
      setPolling(true);
      pollSingle(researchCase.id, setSingleResult, setPolling, setSingleError, setSingleLoading, pollTimers);
    } catch (err) {
      setSingleError(err.message || TEXT.errors.generic);
      setSingleLoading(false);
    }
  }, []);

  const handleCsvUpload = useCallback(async (file) => {
    setCsvState("parsing");
    setSingleError(null);
    try {
      const parsed = await parseCsv(file);
      if (!parsed.headers.length) throw new Error("Die CSV-Datei enthält keine erkennbaren Spalten.");
      const detected = detectColumns(parsed.headers);
      setCsvData(parsed);
      setAddressColumn(detected.addressColumn || parsed.headers[0]);
      setRefCatastralColumn(detected.refCatastralColumn || "");
      setCsvState("configured");
      const addresses = extractAddresses(parsed.rows, detected.addressColumn || parsed.headers[0], detected.refCatastralColumn);
      setBatchRows(addresses.map((a) => ({ ...a, status: "queued", result: null })));
    } catch (err) {
      setSingleError(err.message);
      setCsvState("idle");
    }
  }, []);

  const handleColumnChange = useCallback((column, value) => {
    if (column === "address") {
      setAddressColumn(value);
    } else {
      setRefCatastralColumn(value);
    }
    if (csvData) {
      const refCol = column === "address" ? refCatastralColumn : value;
      const addrCol = column === "address" ? value : addressColumn;
      const addresses = extractAddresses(csvData.rows, addrCol, refCol);
      setBatchRows(addresses.map((a) => ({ ...a, status: "queued", result: null })));
    }
  }, [csvData, addressColumn, refCatastralColumn]);

  const handleStartBatch = useCallback(async () => {
    setCsvState("running");
    const rows = [...batchRows];
    for (let i = 0; i < rows.length; i++) {
      if (csvState !== "running" && i > 0) break;
      rows[i] = { ...rows[i], status: "running" };
      setBatchRows([...rows]);
      try {
        const researchCase = await createResearch(rows[i].address);
        rows[i] = { ...rows[i], status: "polling", result: researchCase };
        setBatchRows([...rows]);
        pollBatchRow(researchCase.id, i, rows, setBatchRows, pollTimers);
      } catch (err) {
        rows[i] = { ...rows[i], status: "failed", error: err.message };
        setBatchRows([...rows]);
      }
      if (i < rows.length - 1) {
        await new Promise((r) => setTimeout(r, 200));
      }
    }
  }, [batchRows, csvState]);

  const [expandedRow, setExpandedRow] = useState(null);

  return (
    <div className="app-shell">
      <Topbar theme={theme} toggleTheme={toggleTheme} onReset={mode === "single" ? resetSingle : () => setCsvState("idle")} mode={mode} setMode={setMode} setSingleResult={setSingleResult} setSingleError={setSingleError} setSingleLoading={setSingleLoading} />

      <div className="search-band">
        <div className="hero-copy">
          <p className="eyebrow">Offizielle Recherchewege</p>
          <h1>Spanische Eigentümer­informationen transparent prüfen</h1>
          <p>
            Geben Sie eine Adresse oder Referencia Catastral ein. Die Anwendung trennt offizielle Daten,
            öffentliche Indizien und unbestätigte Treffer. Alternativ: CSV-Datei hochladen für Batch-Recherche.
          </p>
        </div>

        {mode === "single" ? (
          <SearchPanel onSubmit={handleSingleSearch} loading={singleLoading} error={singleError} />
        ) : (
          <CsvPanel
            csvState={csvState}
            csvData={csvData}
            addressColumn={addressColumn}
            refCatastralColumn={refCatastralColumn}
            onColumnChange={handleColumnChange}
            onUpload={handleCsvUpload}
            onStartBatch={handleStartBatch}
            batchRows={batchRows}
            setBatchRows={setBatchRows}
          />
        )}
      </div>

      <div className="status-strip" aria-label="Ampelsystem">
        <div><span className="dot green"></span>Grün = offiziell bestätigt</div>
        <div><span className="dot yellow"></span>Gelb = möglicher Treffer / prüfen</div>
        <div><span className="dot red"></span>Rot = keine belastbare Bestätigung</div>
      </div>

      {mode === "single" && singleResult && (
        <ResultsPanel researchCase={singleResult} polling={polling} />
      )}

      {mode === "batch" && batchRows.length > 0 && (
        <BatchResults batchRows={batchRows} expandedRow={expandedRow} setExpandedRow={setExpandedRow} />
      )}

      <div className="info-grid" aria-label="Compliance und Glossar">
        <div className="panel info-panel">
          <h2>{TEXT.compliance.title}</h2>
          <ul>
            {TEXT.compliance.items.map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        </div>
        <div className="panel info-panel">
          <h2>{TEXT.glossary.title}</h2>
          <dl>
            {TEXT.glossary.items.map(([term, desc]) => (
              <React.Fragment key={term}>
                <dt>{term}</dt>
                <dd>{desc}</dd>
              </React.Fragment>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}

function Topbar({ theme, toggleTheme, onReset, mode, setMode, setSingleResult, setSingleError, setSingleLoading }) {
  return (
    <header className="topbar">
      <a className="brand" href="/" onClick={(e) => { e.preventDefault(); onReset(); }}>
        <span className="brand-mark">IR</span>
        <span>
          <strong>IberReg Recherche</strong>
          <small>Legal-Tech für spanische Immobilien</small>
        </span>
      </a>
      <nav className="top-actions" aria-label="Ansicht">
        <div className="tab-bar">
          <button className={mode === "single" ? "active" : ""} onClick={() => { setMode("single"); setSingleResult(null); setSingleError(null); setSingleLoading(false); }}>
            Einzelrecherche
          </button>
          <button className={mode === "batch" ? "active" : ""} onClick={() => { setMode("batch"); }}>
            Batch-Recherche
          </button>
        </div>
        <button className="ghost-button" onClick={onReset}>{TEXT.nav.newSearch}</button>
        <button className="theme-button" onClick={toggleTheme}>
          {theme === "dark" ? TEXT.nav.themeLight : TEXT.nav.themeDark}
        </button>
      </nav>
    </header>
  );
}

function SearchPanel({ onSubmit, loading, error }) {
  const [address, setAddress] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = address.trim();
    if (trimmed) {
      onSubmit(trimmed);
      setAddress("");
    }
  };

  return (
    <div className="panel search-panel">
      <form onSubmit={handleSubmit}>
        <label htmlFor="address-input">{TEXT.search.label}</label>
        <div className="search-row">
          <input
            id="address-input"
            type="text"
            autoComplete="street-address"
            inputMode="search"
            placeholder={TEXT.search.placeholder}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            disabled={loading}
            required
          />
          <button className="primary-button" type="submit" disabled={loading || !address.trim()}>
            {loading ? TEXT.search.loading : TEXT.search.button}
          </button>
        </div>
        <p className="legal-hint">{TEXT.search.hint}</p>
        <div className="examples">
          {TEXT.search.examples.map((ex) => (
            <button key={ex} type="button" className="example-button" onClick={() => setAddress(ex)} disabled={loading}>
              {ex}
            </button>
          ))}
        </div>
        {error && <div className="form-error" role="alert">{error}</div>}
      </form>
    </div>
  );
}

function CsvPanel({ csvState, csvData, addressColumn, refCatastralColumn, onColumnChange, onUpload, onStartBatch, batchRows, setBatchRows }) {
  const fileRef = useRef(null);
  const [dragover, setDragover] = useState(false);

  const handleFile = (file) => {
    if (file) onUpload(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragover(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const addresses = csvData ? extractAddresses(csvData.rows, addressColumn, refCatastralColumn || "") : [];
  const completed = batchRows.filter((r) => r.status === "completed" || r.status === "failed").length;
  const total = batchRows.length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="panel">
      {csvState === "idle" && (
        <div
          className={`csv-upload-zone ${dragover ? "dragover" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDragover(true); }}
          onDragLeave={() => setDragover(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <strong>{TEXT.csv.uploadButton}</strong>
          <p>{TEXT.csv.dropZone}</p>
          <input ref={fileRef} type="file" accept=".csv,.txt,.tsv" onChange={(e) => handleFile(e.target.files[0])} />
        </div>
      )}

      {csvState !== "idle" && csvData && (
        <>
          <p className="eyebrow">{TEXT.csv.detectedColumns}</p>
          <div className="csv-config">
            <div>
              <label htmlFor="address-col">{TEXT.csv.addressColumn}</label>
              <select id="address-col" value={addressColumn} onChange={(e) => onColumnChange("address", e.target.value)}>
                {csvData.headers.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="ref-col">{TEXT.csv.refCatastralColumn}</label>
              <select id="ref-col" value={refCatastralColumn || ""} onChange={(e) => onColumnChange("ref", e.target.value)}>
                <option value="">— keine —</option>
                {csvData.headers.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          </div>

          <div className="csv-preview">
            <h3>{TEXT.csv.preview}</h3>
            <div className="csv-stats">
              <div className="csv-stat">
                <div className="number">{csvData.rows.length}</div>
                <div className="label">{TEXT.csv.rowsFound}</div>
              </div>
              <div className="csv-stat">
                <div className="number">{addresses.length}</div>
                <div className="label">{TEXT.csv.addressesDetected}</div>
              </div>
            </div>
          </div>

          {csvState === "configured" && (
            <div className="batch-actions">
              <button className="primary-button" onClick={onStartBatch}>
                {TEXT.csv.startBatch}
              </button>
            </div>
          )}

          {csvState === "running" && (
            <div className="batch-progress">
              <div className="progress-bar-track">
                <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
              </div>
              <p className="progress-label">{completed} / {total} Adressen geprüft</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function BatchResults({ batchRows, expandedRow, setExpandedRow }) {
  if (!batchRows.length) return null;

  const getStatusBadge = (status) => {
    switch (status) {
      case "completed": return "green";
      case "failed": return "red";
      case "running":
      case "polling": return "yellow";
      default: return "yellow";
    }
  };

  return (
    <div className="result-layout animate-in">
      <div className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Batch-Ergebnisse</p>
            <h2>Rechercheübersicht</h2>
          </div>
          <span className="case-status">
            {batchRows.filter((r) => r.status === "completed").length} / {batchRows.length} abgeschlossen
          </span>
        </div>
        <table className="address-table">
          <thead>
            <tr>
              <th style={{ width: "40px" }}>#</th>
              <th>Adresse</th>
              <th style={{ width: "140px" }}>Eigentümer</th>
              <th style={{ width: "100px" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {batchRows.map((row, idx) => {
              const owner = row.result?.owner;
              const light = row.result ? (owner?.status === "officially_confirmed" ? "green" : owner?.status?.includes("uncertain") ? "yellow" : "red") : getStatusBadge(row.status);
              return (
                <React.Fragment key={idx}>
                  <tr onClick={() => setExpandedRow(expandedRow === idx ? null : idx)} style={{ cursor: "pointer" }}>
                    <td>{idx + 1}</td>
                    <td>{row.address}</td>
                    <td>
                      {owner ? (
                        <span className={`badge ${light}`}>{owner.name || owner.label}</span>
                      ) : row.status === "failed" ? (
                        <span className="badge red">{TEXT.csv.rowStatus.failed}</span>
                      ) : (
                        <span className="badge yellow">{TEXT.csv.rowStatus[row.status] || row.status}</span>
                      )}
                    </td>
                    <td>
                      {row.result ? (
                        <span className={`badge ${getStatusBadge(row.status)}`}>
                          {row.status === "completed" ? TEXT.status.completed : TEXT.csv.rowStatus[row.status] || row.status}
                        </span>
                      ) : (
                        <span className="badge yellow">{TEXT.csv.rowStatus[row.status] || row.status}</span>
                      )}
                    </td>
                  </tr>
                  {expandedRow === idx && row.result && (
                    <ExpandedResult researchCase={row.result} />
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ExpandedResult({ researchCase }) {
  const sources = researchCase.sources || [];
  const official = sources.filter((s) => s.category === "official" && s.trafficLight === "green");
  const indicators = sources.filter((s) => s.category === "public_indicator" || s.trafficLight === "yellow");
  const unconfirmed = sources.filter((s) => s.category === "unconfirmed" || s.trafficLight === "red");

  return (
    <tr>
      <td colSpan={4} style={{ padding: "0 0 16px 16px", borderBottom: "2px solid var(--line)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", fontSize: "0.85rem" }}>
          <SourceSection title={TEXT.result.official} sources={official} empty={TEXT.result.emptyOfficial} />
          <SourceSection title={TEXT.result.indicators} sources={indicators} empty={TEXT.result.emptyIndicators} />
          <SourceSection title={TEXT.result.unconfirmed} sources={unconfirmed} empty={TEXT.result.emptyUnconfirmed} />
        </div>
        {researchCase.status === "completed" && (
          <div style={{ marginTop: "10px" }}>
            <a className="secondary-button" href={`/api/recherchen/${researchCase.id}/export.csv`} style={{ marginRight: "8px", fontSize: "0.82rem" }}>CSV</a>
            <a className="secondary-button" href={`/api/recherchen/${researchCase.id}/export.pdf`} style={{ fontSize: "0.82rem" }}>PDF</a>
          </div>
        )}
      </td>
    </tr>
  );
}

function SourceSection({ title, sources, empty }) {
  return (
    <div>
      <h4 style={{ fontSize: "0.82rem", fontWeight: 700, marginBottom: "6px" }}>{title}</h4>
      {sources.length === 0 ? (
        <p style={{ color: "var(--muted)", fontSize: "0.82rem" }}>{empty}</p>
      ) : sources.map((source) => (
        <div key={source.id} style={{ marginBottom: "8px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: "8px" }}>
            <strong style={{ fontSize: "0.82rem" }}>{source.name}</strong>
            <span className={`badge ${source.trafficLight}`} style={{ fontSize: "0.72rem" }}>
              {TEXT.status[source.status] || source.status}
            </span>
          </div>
          {source.messages?.map((msg, i) => (
            <p key={i} style={{ margin: "2px 0", fontSize: "0.78rem", color: "var(--muted)" }}>{msg}</p>
          ))}
        </div>
      ))}
    </div>
  );
}

function ResultsPanel({ researchCase, polling }) {
  const owner = researchCase.owner || {};
  const sources = researchCase.sources || [];
  const official = sources.filter((s) => s.category === "official" && s.trafficLight === "green");
  const indicators = sources.filter((s) => s.category === "public_indicator" || s.trafficLight === "yellow");
  const unconfirmed = sources.filter((s) => s.category === "unconfirmed" || s.trafficLight === "red");
  const light = owner.status === "officially_confirmed" ? "green" : owner.status?.includes("uncertain") ? "yellow" : "red";

  return (
    <div className="result-layout animate-in">
      <div className="panel owner-panel">
        <div>
          <p className="eyebrow">{TEXT.result.title}</p>
          <h2>{TEXT.result.ownerTitle}</h2>
        </div>
        <div className="owner-result">
          <span className={`badge ${light}`}>{owner.label || TEXT.result.noOwner}</span>
          <span className="owner-name">{owner.name || TEXT.result.noOwner}</span>
          <p className="owner-message">{owner.message}</p>
          {owner.confidence > 0 && (
            <p className="owner-meta">{TEXT.result.confidence}: {Math.round((owner.confidence || 0) * 100)} %</p>
          )}
        </div>
        {researchCase.status === "completed" && (
          <div className="export-actions">
            <span>{TEXT.result.exports}</span>
            <a className="secondary-button" href={`/api/recherchen/${researchCase.id}/export.csv`}>CSV</a>
            <a className="secondary-button" href={`/api/recherchen/${researchCase.id}/export.pdf`}>PDF</a>
          </div>
        )}
      </div>

      <div className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Quellen</p>
            <h2>{TEXT.result.title}</h2>
          </div>
          <span className="case-status">{TEXT.status[researchCase.status] || researchCase.status}</span>
        </div>

        <SourceGroup title={TEXT.result.official} sources={official} empty={TEXT.result.emptyOfficial} />
        <SourceGroup title={TEXT.result.indicators} sources={indicators} empty={TEXT.result.emptyIndicators} />
        <SourceGroup title={TEXT.result.unconfirmed} sources={unconfirmed} empty={TEXT.result.emptyUnconfirmed} />
      </div>
    </div>
  );
}

function SourceGroup({ title, sources, empty }) {
  return (
    <div className="source-section">
      <h3>{title}</h3>
      <div className="source-list">
        {sources.length === 0 ? (
          <div className="empty-state">{empty}</div>
        ) : sources.map((source) => <SourceItem key={source.id} source={source} />)}
      </div>
    </div>
  );
}

function SourceItem({ source }) {
  const statusLabel = source.status === "failed" ? TEXT.status.failedSource : TEXT.status[source.status] || source.status;
  const badge = source.status === "pending" ? "yellow" : source.trafficLight;

  return (
    <div className="source-item">
      <div className="source-head">
        <h4>{source.name}</h4>
        <span className={`badge ${badge}`}>{statusLabel}</span>
      </div>
      <div className="source-meta">
        <span className={`badge ${source.trafficLight}`}>
          {TEXT.traffic[source.trafficLight] || source.trafficLight}
        </span>
      </div>
      {source.messages?.length > 0 && (
        <ul>{source.messages.map((msg, i) => <li key={i}>{msg}</li>)}</ul>
      )}
      {source.evidence?.length > 0 && (
        <dl className="evidence">
          {source.evidence.map((item, i) => (
            <div key={i}>
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {source.officialUrl && (
        <a className="official-link" href={source.officialUrl} target="_blank" rel="noreferrer">
          Offizielle Quelle öffnen
        </a>
      )}
    </div>
  );
}

function pollSingle(id, setResult, setPolling, setError, setLoading, pollTimers) {
  const timer = setInterval(async () => {
    try {
      const data = await getResearch(id);
      setResult(data);
      if (data.status === "completed" || data.status === "failed") {
        clearInterval(timer);
        setPolling(false);
        setLoading(false);
      }
    } catch (err) {
      clearInterval(timer);
      setPolling(false);
      setLoading(false);
      setError(err.message || TEXT.errors.network);
    }
  }, POLL_INTERVAL);
  pollTimers.current.single = timer;
}

function pollBatchRow(id, index, rows, setRows, pollTimers) {
  const timer = setInterval(async () => {
    try {
      const data = await getResearch(id);
      if (data.status === "completed" || data.status === "failed") {
        clearInterval(timer);
        const updated = [...rows];
        updated[index] = { ...updated[index], status: data.status, result: data };
        setRows(updated);
      }
    } catch (err) {
      clearInterval(timer);
      const updated = [...rows];
      updated[index] = { ...updated[index], status: "failed", error: err.message };
      setRows(updated);
    }
  }, POLL_INTERVAL);
  pollTimers.current[index] = timer;
}