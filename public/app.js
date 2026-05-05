import { TEXT } from "/texts.js";

const state = {
  currentCase: null,
  pollTimer: null
};

const elements = {
  html: document.documentElement,
  form: document.querySelector("#search-form"),
  input: document.querySelector("#address-input"),
  submit: document.querySelector("#submit-button"),
  error: document.querySelector("#form-error"),
  examples: document.querySelector("#examples"),
  resultLayout: document.querySelector("#result-layout"),
  ownerResult: document.querySelector("#owner-result"),
  caseStatus: document.querySelector("#case-status"),
  officialList: document.querySelector("#official-list"),
  indicatorList: document.querySelector("#indicator-list"),
  unconfirmedList: document.querySelector("#unconfirmed-list"),
  exportActions: document.querySelector("#export-actions"),
  csvLink: document.querySelector("#csv-link"),
  pdfLink: document.querySelector("#pdf-link"),
  newSearch: document.querySelector("#new-search-button"),
  theme: document.querySelector("#theme-button"),
  glossary: document.querySelector("#glossary")
};

init();

function init() {
  applySavedTheme();
  renderExamples();
  renderGlossary();

  elements.form.addEventListener("submit", handleSubmit);
  elements.newSearch.addEventListener("click", resetSearch);
  elements.theme.addEventListener("click", toggleTheme);
}

function renderExamples() {
  elements.examples.innerHTML = "";
  for (const example of TEXT.search.examples) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "example-button";
    button.textContent = example;
    button.addEventListener("click", () => {
      elements.input.value = example;
      elements.input.focus();
    });
    elements.examples.append(button);
  }
}

function renderGlossary() {
  elements.glossary.innerHTML = "";
  for (const [term, description] of TEXT.glossary.items) {
    const dt = document.createElement("dt");
    dt.textContent = term;
    const dd = document.createElement("dd");
    dd.textContent = description;
    elements.glossary.append(dt, dd);
  }
}

async function handleSubmit(event) {
  event.preventDefault();
  const address = elements.input.value.trim();
  hideError();
  setSubmitting(true);

  try {
    const response = await fetch("/api/recherchen", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ address })
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error?.details?.join(" ") || payload.error?.message || TEXT.errors.generic);
    }
    state.currentCase = payload;
    renderCase(payload);
    pollCase(payload.id);
  } catch (error) {
    showError(error.message || TEXT.errors.network);
  } finally {
    setSubmitting(false);
  }
}

function pollCase(id) {
  clearInterval(state.pollTimer);
  state.pollTimer = setInterval(async () => {
    try {
      const response = await fetch(`/api/recherchen/${id}`);
      if (!response.ok) throw new Error(TEXT.errors.notFound);
      const payload = await response.json();
      state.currentCase = payload;
      renderCase(payload);
      if (payload.status === "completed" || payload.status === "failed") {
        clearInterval(state.pollTimer);
      }
    } catch (error) {
      clearInterval(state.pollTimer);
      showError(error.message || TEXT.errors.network);
    }
  }, 900);
}

function renderCase(researchCase) {
  elements.resultLayout.hidden = false;
  elements.caseStatus.textContent = TEXT.status[researchCase.status] ?? researchCase.status;
  renderOwner(researchCase.owner);
  renderSourceGroups(researchCase);

  if (researchCase.status === "completed") {
    elements.exportActions.hidden = false;
    elements.csvLink.href = `/api/recherchen/${researchCase.id}/export.csv`;
    elements.pdfLink.href = `/api/recherchen/${researchCase.id}/export.pdf`;
  } else {
    elements.exportActions.hidden = true;
  }
}

function renderOwner(owner) {
  const light = owner.status === "officially_confirmed" ? "green" : owner.status.includes("uncertain") ? "yellow" : "red";
  const name = owner.name || TEXT.result.noOwner;
  elements.ownerResult.innerHTML = `
    <span class="badge ${light}">${owner.label}</span>
    <span class="owner-name">${escapeHtml(name)}</span>
    <p class="owner-message">${escapeHtml(owner.message)}</p>
    <p class="owner-message">${TEXT.result.confidence}: ${Math.round((owner.confidence || 0) * 100)} %</p>
  `;
}

function renderSourceGroups(researchCase) {
  const sources = researchCase.sources || [];
  const official = sources.filter((source) => source.category === "official" && source.trafficLight === "green");
  const indicators = sources.filter((source) => source.category === "public_indicator" || source.trafficLight === "yellow");
  const unconfirmed = sources.filter((source) => source.category === "unconfirmed" || source.trafficLight === "red");
  const pending = sources.filter((source) => source.status === "pending");

  renderSourceList(elements.officialList, official, TEXT.result.emptyOfficial);
  renderSourceList(elements.indicatorList, [...indicators, ...pending.filter((source) => !indicators.includes(source))], TEXT.result.emptyIndicators);
  renderSourceList(elements.unconfirmedList, unconfirmed, TEXT.result.emptyUnconfirmed);
}

function renderSourceList(container, sources, emptyText) {
  container.innerHTML = "";
  if (!sources.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = emptyText;
    container.append(empty);
    return;
  }

  for (const source of sources) {
    const item = document.createElement("article");
    item.className = "source-item";
    item.innerHTML = renderSource(source);
    container.append(item);
  }
}

function renderSource(source) {
  const badge = source.status === "pending" ? "yellow" : source.trafficLight;
  const statusLabel = source.status === "failed" ? TEXT.status.failedSource : TEXT.status[source.status] || source.status;
  const evidence = (source.evidence || [])
    .map(
      (item) => `
        <div>
          <dt>${escapeHtml(item.label)}</dt>
          <dd>${escapeHtml(item.value)}</dd>
        </div>
      `
    )
    .join("");
  const messages = (source.messages || []).map((message) => `<li>${escapeHtml(message)}</li>`).join("");
  const link = source.officialUrl
    ? `<a class="official-link" href="${escapeAttribute(source.officialUrl)}" target="_blank" rel="noreferrer">Offizielle Quelle öffnen</a>`
    : "";

  return `
    <div class="source-head">
      <h4>${escapeHtml(source.name)}</h4>
      <span class="badge ${badge}">${escapeHtml(statusLabel)}</span>
    </div>
    <div class="source-meta">
      <span class="badge ${source.trafficLight}">${escapeHtml(TEXT.traffic[source.trafficLight] || source.trafficLight)}</span>
    </div>
    <ul>${messages}</ul>
    ${evidence ? `<dl class="evidence">${evidence}</dl>` : ""}
    ${link}
  `;
}

function resetSearch() {
  clearInterval(state.pollTimer);
  state.currentCase = null;
  elements.input.value = "";
  elements.resultLayout.hidden = true;
  elements.exportActions.hidden = true;
  hideError();
  elements.input.focus();
}

function setSubmitting(isSubmitting) {
  elements.submit.disabled = isSubmitting;
  elements.submit.textContent = isSubmitting ? TEXT.search.loading : TEXT.search.button;
}

function showError(message) {
  elements.error.textContent = message;
  elements.error.hidden = false;
}

function hideError() {
  elements.error.textContent = "";
  elements.error.hidden = true;
}

function applySavedTheme() {
  const saved = localStorage.getItem("theme") || "light";
  elements.html.dataset.theme = saved;
  elements.theme.textContent = saved === "dark" ? TEXT.nav.themeLight : TEXT.nav.themeDark;
  elements.theme.setAttribute("aria-pressed", String(saved === "dark"));
}

function toggleTheme() {
  const next = elements.html.dataset.theme === "dark" ? "light" : "dark";
  localStorage.setItem("theme", next);
  applySavedTheme();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}
