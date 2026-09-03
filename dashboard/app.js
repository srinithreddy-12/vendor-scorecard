"use strict";

/* =========================================================================
   CONFIG — swap these two URLs for your published CSV endpoints, then
   change USE_MOCK_DATA to false. See fetchLiveData() below.
   ========================================================================= */

const SCORECARD_CSV_URL = ""; // Google Sheets "Publish to web" CSV link, scorecard tab
const RETURNS_CSV_URL = "";   // Google Sheets "Publish to web" CSV link, returns_enriched tab
const USE_MOCK_DATA = true;

const POLL_INTERVAL_MS = 8000;

/* =========================================================================
   MOCK DATA — shape matches 00-SHARED-CONTRACT.md exactly.
   Statuses follow the locked tiers: <6 healthy, 6-8 watch, 8-10 warning,
   >=10 flagged_for_review. issue_type uses only the fixed contract list.
   ========================================================================= */

const MOCK_SCORECARD = [
  {
    vendor_id: "V-TIR-01", vendor_name: "Tirupur Knits", hub: "Tirupur",
    total_orders: 842, countable_returns: 96, excluded_returns: 14,
    defect_rate_pct: 11.4, status: "flagged_for_review",
    onboarding_risk: false, days_since_onboarding: 412,
    last_updated: "2026-09-03T14:22:10Z",
  },
  {
    vendor_id: "V-JAI-04", vendor_name: "Jaipur Handloom Co.", hub: "Jaipur",
    total_orders: 310, countable_returns: 27, excluded_returns: 6,
    defect_rate_pct: 8.7, status: "warning",
    onboarding_risk: true, days_since_onboarding: 18,
    last_updated: "2026-09-03T14:22:10Z",
  },
  {
    vendor_id: "V-LUD-02", vendor_name: "Ludhiana Knitwear Co.", hub: "Ludhiana",
    total_orders: 1204, countable_returns: 82, excluded_returns: 31,
    defect_rate_pct: 6.8, status: "watch",
    onboarding_risk: false, days_since_onboarding: 601,
    last_updated: "2026-09-03T14:22:10Z",
  },
  {
    vendor_id: "V-KOL-09", vendor_name: "Kolkata Cotton Mills", hub: "Kolkata",
    total_orders: 128, countable_returns: 7, excluded_returns: 3,
    defect_rate_pct: 5.5, status: "healthy",
    onboarding_risk: true, days_since_onboarding: 41,
    last_updated: "2026-09-03T14:22:10Z",
  },
  {
    vendor_id: "V-SUR-07", vendor_name: "Surat Silks", hub: "Surat",
    total_orders: 965, countable_returns: 21, excluded_returns: 11,
    defect_rate_pct: 2.2, status: "healthy",
    onboarding_risk: false, days_since_onboarding: 880,
    last_updated: "2026-09-03T14:22:10Z",
  },
  {
    vendor_id: "V-DEL-03", vendor_name: "Delhi Garment Works", hub: "Delhi",
    total_orders: 2011, countable_returns: 33, excluded_returns: 22,
    defect_rate_pct: 1.6, status: "healthy",
    onboarding_risk: false, days_since_onboarding: 1290,
    last_updated: "2026-09-03T14:22:10Z",
  },
];

const MOCK_RETURNS = [
  { return_id: "RT-1072", order_id: "ORD-80424", sku: "TS-GRPHC-WHT-S", product_name: "Graphic tee - white - S", vendor_id: "V-TIR-01", vendor_name: "Tirupur Knits", return_date: "2026-08-29", issue_type: "defective", issue_note: "Neckline stitching came apart after the first wash, customer sent photos of the frayed seam.", counted_against_vendor: true },
  { return_id: "RT-1073", order_id: "ORD-80431", sku: "TS-GRPHC-BLK-M", product_name: "Graphic tee - black - M", vendor_id: "V-TIR-01", vendor_name: "Tirupur Knits", return_date: "2026-08-29", issue_type: "quality", issue_note: "Fabric is noticeably thinner than the approved sample, print already cracking.", counted_against_vendor: true },
  { return_id: "RT-1074", order_id: "ORD-80502", sku: "SC-PRINT-RED-L", product_name: "Printed scarf - red - L", vendor_id: "V-JAI-04", vendor_name: "Jaipur Handloom Co.", return_date: "2026-08-30", issue_type: "delivery", issue_note: "Package arrived nine days late, customer had already bought a replacement elsewhere.", counted_against_vendor: false },
  { return_id: "RT-1075", order_id: "ORD-80519", sku: "HD-COLLAB-BLK-M", product_name: "Collab hoodie - black - M", vendor_id: "V-LUD-02", vendor_name: "Ludhiana Knitwear Co.", return_date: "2026-08-31", issue_type: "defective", issue_note: "Drawstring eyelet tore out, second complaint on this batch.", counted_against_vendor: true },
  { return_id: "RT-1076", order_id: "ORD-80540", sku: "SL-SAREE-GRN-NA", product_name: "Silk saree - green", vendor_id: "V-SUR-07", vendor_name: "Surat Silks", return_date: "2026-09-01", issue_type: "customer_remorse", issue_note: "Customer changed their mind, no fault found with the garment.", counted_against_vendor: false },
  { return_id: "RT-1077", order_id: "ORD-80561", sku: "TS-PLAIN-WHT-XL", product_name: "Plain tee - white - XL", vendor_id: "V-KOL-09", vendor_name: "Kolkata Cotton Mills", return_date: "2026-09-01", issue_type: "damage", issue_note: "Visible dye patch across the front panel, likely a finishing fault.", counted_against_vendor: true },
  { return_id: "RT-1078", order_id: "ORD-80588", sku: "JK-DENIM-BLK-L", product_name: "Denim jacket - black - L", vendor_id: "V-DEL-03", vendor_name: "Delhi Garment Works", return_date: "2026-09-02", issue_type: "wrong_item_shipped", issue_note: "Warehouse shipped size L instead of size S, vendor supplied the correct item.", counted_against_vendor: false },
  { return_id: "RT-1079", order_id: "ORD-80602", sku: "TS-GRPHC-WHT-M", product_name: "Graphic tee - white - M", vendor_id: "V-TIR-01", vendor_name: "Tirupur Knits", return_date: "2026-09-02", issue_type: "defective", issue_note: "Same neckline failure as RT-1072, appears to be a recurring batch issue.", counted_against_vendor: true },
  { return_id: "RT-1080", order_id: "ORD-80610", sku: "HD-COLLAB-GRY-L", product_name: "Collab hoodie - grey - L", vendor_id: "V-LUD-02", vendor_name: "Ludhiana Knitwear Co.", return_date: "2026-09-02", issue_type: "size", issue_note: "Runs almost two sizes small against the published size chart.", counted_against_vendor: true },
  { return_id: "RT-1081", order_id: "ORD-80614", sku: "KR-COTTON-BLU-XL", product_name: "Cotton kurta - blue - XL", vendor_id: "V-TIR-01", vendor_name: "Tirupur Knits", return_date: "2026-09-02", issue_type: "quality", issue_note: "Colour bled badly in the first wash, stained other garments.", counted_against_vendor: true },
  { return_id: "RT-1082", order_id: "ORD-80627", sku: "SC-PRINT-YLW-M", product_name: "Printed scarf - yellow - M", vendor_id: "V-JAI-04", vendor_name: "Jaipur Handloom Co.", return_date: "2026-09-02", issue_type: "defective", issue_note: "Block print misaligned across the seam, visibly off-centre.", counted_against_vendor: true },
  { return_id: "RT-1083", order_id: "ORD-80633", sku: "SL-SAREE-RED-NA", product_name: "Silk saree - red", vendor_id: "V-SUR-07", vendor_name: "Surat Silks", return_date: "2026-09-03", issue_type: "delivery", issue_note: "Courier marked the parcel delivered, it never arrived at the address.", counted_against_vendor: false },
  { return_id: "RT-1084", order_id: "ORD-80641", sku: "TS-PLAIN-BLK-S", product_name: "Plain tee - black - S", vendor_id: "V-DEL-03", vendor_name: "Delhi Garment Works", return_date: "2026-09-03", issue_type: "other", issue_note: "Customer ordered twice by mistake, returned the duplicate unopened.", counted_against_vendor: false },
  { return_id: "RT-1085", order_id: "ORD-80648", sku: "JK-DENIM-BLU-M", product_name: "Denim jacket - blue - M", vendor_id: "V-LUD-02", vendor_name: "Ludhiana Knitwear Co.", return_date: "2026-09-03", issue_type: "damage", issue_note: "Button placket torn on arrival, outer packaging intact so not transit damage.", counted_against_vendor: true },
  { return_id: "RT-1086", order_id: "ORD-80655", sku: "KR-COTTON-GRN-L", product_name: "Cotton kurta - green - L", vendor_id: "V-KOL-09", vendor_name: "Kolkata Cotton Mills", return_date: "2026-09-03", issue_type: "size", issue_note: "Sleeve length inconsistent between the two units ordered.", counted_against_vendor: true },
  { return_id: "RT-1087", order_id: "ORD-80660", sku: "HD-COLLAB-BLK-S", product_name: "Collab hoodie - black - S", vendor_id: "V-TIR-01", vendor_name: "Tirupur Knits", return_date: "2026-09-03", issue_type: "defective", issue_note: "Hood lining separated from the shell after light wear.", counted_against_vendor: true },
  { return_id: "RT-1088", order_id: "ORD-80664", sku: "SC-PRINT-RED-S", product_name: "Printed scarf - red - S", vendor_id: "V-JAI-04", vendor_name: "Jaipur Handloom Co.", return_date: "2026-09-03", issue_type: "customer_remorse", issue_note: "Customer decided the colour did not suit them, item unworn.", counted_against_vendor: false },
  { return_id: "RT-1089", order_id: "ORD-80671", sku: "TS-GRPHC-BLK-L", product_name: "Graphic tee - black - L", vendor_id: "V-DEL-03", vendor_name: "Delhi Garment Works", return_date: "2026-09-03", issue_type: "delivery", issue_note: "Parcel delayed in transit for over a week, customer refused delivery.", counted_against_vendor: false },
];

/* =========================================================================
   STATE
   ========================================================================= */

const state = {
  scorecard: [],
  returns: [],
  lastUpdatedSeen: null,   // last_updated value we last rendered against
  lastFetchedAt: null,     // Date.now() of the last successful fetch
  selectedReturnId: null,
  vendorFilter: "",
  countedOnlyFilter: false,
  isReconnecting: false,
};

/* =========================================================================
   DATA SOURCE — the swap point.
   fetchData() is the only thing the rest of the app calls. Set the two URLs
   at the top of this file and flip USE_MOCK_DATA to false; nothing else
   changes. fetchLiveData() already fetches, parses and type-coerces.
   ========================================================================= */

async function fetchData() {
  if (USE_MOCK_DATA) {
    return { scorecard: MOCK_SCORECARD, returns: MOCK_RETURNS };
  }
  return fetchLiveData();
}

async function fetchLiveData() {
  const [scorecardText, returnsText] = await Promise.all([
    fetchText(SCORECARD_CSV_URL),
    fetchText(RETURNS_CSV_URL),
  ]);

  return {
    scorecard: parseCsv(scorecardText).map(coerceScorecardRow),
    returns: parseCsv(returnsText).map(coerceReturnRow),
  };
}

async function fetchText(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Fetch failed for " + url + ": " + res.status);
  return res.text();
}

/* ---- CSV parsing (handles quoted fields containing commas/newlines) ---- */

function parseCsv(text) {
  const rows = parseCsvRows(text);
  if (rows.length === 0) return [];
  const header = rows[0];
  const out = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length === 1 && row[0] === "") continue; // trailing blank line
    const obj = {};
    for (let c = 0; c < header.length; c++) {
      obj[header[c].trim()] = row[c] !== undefined ? row[c] : "";
    }
    out.push(obj);
  }
  return out;
}

function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else { inQuotes = false; }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') inQuotes = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n") { row.push(field); field = ""; rows.push(row); row = []; }
    else if (ch === "\r") { /* skip, \n ends the line */ }
    else field += ch;
  }

  if (field !== "" || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

/* ---- type coercion: CSV gives you strings for everything ---- */

function toBool(value) {
  return String(value).trim().toLowerCase() === "true";
}

function toNumber(value) {
  const n = Number(String(value).trim());
  return Number.isFinite(n) ? n : 0;
}

function coerceScorecardRow(row) {
  return {
    vendor_id: row.vendor_id,
    vendor_name: row.vendor_name,
    hub: row.hub,
    total_orders: toNumber(row.total_orders),
    countable_returns: toNumber(row.countable_returns),
    excluded_returns: toNumber(row.excluded_returns),
    defect_rate_pct: toNumber(row.defect_rate_pct),
    status: row.status,
    onboarding_risk: toBool(row.onboarding_risk),
    days_since_onboarding: toNumber(row.days_since_onboarding),
    last_updated: row.last_updated,
  };
}

function coerceReturnRow(row) {
  return {
    return_id: row.return_id,
    order_id: row.order_id,
    sku: row.sku,
    product_name: row.product_name,
    vendor_id: row.vendor_id,
    vendor_name: row.vendor_name,
    return_date: row.return_date,
    issue_type: row.issue_type,
    issue_note: row.issue_note,
    counted_against_vendor: toBool(row.counted_against_vendor),
  };
}

/* =========================================================================
   DISPLAY MAPS
   ========================================================================= */

const STATUS_LABELS = {
  healthy: "Healthy",
  watch: "Watch",
  warning: "Quality warning issued",
  flagged_for_review: "Flagged for review",
};

const STATUS_ORDER = ["flagged_for_review", "warning", "watch", "healthy"];

/* Status palette — reserved for state, never reused as a series color. */
const STATUS_COLORS = {
  healthy: "#0ca30c",
  watch: "#fab219",
  warning: "#ec835a",
  flagged_for_review: "#d03b3b",
};

/* Categorical series colors (validated: CVD dE 24.7, normal dE 33.6 on white) */
const SERIES_COUNTED = "#2a78d6";
const SERIES_EXCLUDED = "#eb6834";

const CHART_INK = {
  primary: "#14161c",
  secondary: "#545c68",
  muted: "#7b8390",
  grid: "#e1e0d9",
  axis: "#c3c2b7",
  surface: "#ffffff",
};

const ISSUE_TYPE_LABELS = {
  defective: "Defective",
  quality: "Quality",
  damage: "Damage",
  size: "Size",
  delivery: "Delivery",
  wrong_item_shipped: "Wrong item shipped",
  customer_remorse: "Customer remorse",
  other: "Other",
};

/* Why an excluded return is excluded — shown as the muted row tag. */
const NOT_COUNTED_LABELS = {
  delivery: "Not counted — logistics",
  wrong_item_shipped: "Not counted — fulfilment",
  customer_remorse: "Not counted — customer remorse",
  other: "Not counted — not vendor quality",
};

function statusLabel(status) {
  return STATUS_LABELS[status] || status;
}

function issueLabel(type) {
  return ISSUE_TYPE_LABELS[type] || type;
}

function notCountedLabel(issueType) {
  return NOT_COUNTED_LABELS[issueType] || "Not counted";
}

/* =========================================================================
   SMALL HELPERS
   ========================================================================= */

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatPct(n) {
  return Number(n).toFixed(1);
}

function formatNum(n) {
  return Number(n).toLocaleString("en-US");
}

function sortedVendors() {
  return [...state.scorecard].sort((a, b) => b.defect_rate_pct - a.defect_rate_pct);
}

/* Approximate rendered width of SVG text, used to decide whether a label
   fits inside a bar segment. Labels are never clipped — if it doesn't fit,
   it isn't drawn, and the value stays in the tooltip and the table view. */
function approxTextWidth(text, fontSize) {
  return String(text).length * fontSize * 0.58;
}

/* Horizontal bar: square at the baseline, 4px rounded at the data end. */
function barPath(x, y, w, h, r) {
  if (w <= 0.5) return "";
  const rr = Math.max(0, Math.min(r, w, h / 2));
  return `M${x},${y} H${x + w - rr} A${rr},${rr} 0 0 1 ${x + w},${y + rr}` +
         ` V${y + h - rr} A${rr},${rr} 0 0 1 ${x + w - rr},${y + h} H${x} Z`;
}

function legendHtml(items) {
  return items.map((it) =>
    `<span class="legend-item">
       <span class="legend-swatch" style="background:${it.color}"></span>
       ${escapeHtml(it.label)}
     </span>`
  ).join("");
}

/* =========================================================================
   RENDER — KPI row
   ========================================================================= */

function renderKpis() {
  const el = document.getElementById("kpiRow");
  if (state.scorecard.length === 0) { el.innerHTML = ""; return; }

  const totalOrders = state.scorecard.reduce((s, v) => s + v.total_orders, 0);
  const counted = state.scorecard.reduce((s, v) => s + v.countable_returns, 0);
  const excluded = state.scorecard.reduce((s, v) => s + v.excluded_returns, 0);
  const flagged = state.scorecard.filter((v) => v.status === "flagged_for_review").length;

  const tiles = [
    { label: "Total orders", value: formatNum(totalOrders), note: state.scorecard.length + " vendors" },
    { label: "Counted against vendors", value: formatNum(counted), note: "quality-related returns" },
    { label: "Excluded from scoring", value: formatNum(excluded), note: "logistics and customer reasons" },
    { label: "Flagged for review", value: formatNum(flagged), note: "awaiting a procurement decision", emphasis: flagged > 0 },
  ];

  el.innerHTML = tiles.map((t) => `
    <div class="kpi-tile${t.emphasis ? " is-critical" : ""}">
      <div class="kpi-label">${escapeHtml(t.label)}</div>
      <div class="kpi-value">${escapeHtml(t.value)}</div>
      <div class="kpi-note">${escapeHtml(t.note)}</div>
    </div>
  `).join("");
}

/* =========================================================================
   RENDER — vendor scorecard cards
   ========================================================================= */

function renderScorecard() {
  const grid = document.getElementById("cardGrid");
  const sorted = sortedVendors();

  if (sorted.length === 0) {
    grid.innerHTML = '<div class="empty-state">No vendor data yet.</div>';
    return;
  }
  grid.innerHTML = sorted.map(renderVendorCard).join("");
}

/* Contract: onboarding_risk = true when days_since_onboarding < 90 —
   a fixed 90-day new-vendor window, same for every vendor. */
const ONBOARDING_WINDOW_DAYS = 90;

function renderOnboardingBadge(v) {
  const daysLeft = Math.max(0, ONBOARDING_WINDOW_DAYS - v.days_since_onboarding);
  const progressPct = Math.min(100, (v.days_since_onboarding / ONBOARDING_WINDOW_DAYS) * 100);
  const title = `${v.days_since_onboarding} of ${ONBOARDING_WINDOW_DAYS} days into the new-vendor window — ${daysLeft} day${daysLeft === 1 ? "" : "s"} left`;

  return `
    <div class="onboarding-badge" title="${escapeHtml(title)}">
      <div class="onboarding-badge-top">
        <span>New vendor — day ${escapeHtml(String(v.days_since_onboarding))} of ${ONBOARDING_WINDOW_DAYS}</span>
      </div>
      <div class="onboarding-progress-track">
        <div class="onboarding-progress-fill" style="width:${progressPct}%"></div>
      </div>
    </div>
  `;
}

function renderVendorCard(v) {
  const flaggedClass = v.status === "flagged_for_review" ? " is-flagged" : "";
  const badge = v.onboarding_risk ? renderOnboardingBadge(v) : "";

  return `
    <div class="vendor-card${flaggedClass}">
      <div class="vendor-card-top">
        <div>
          <div class="vendor-name">${escapeHtml(v.vendor_name)}</div>
          <p class="vendor-hub">${escapeHtml(v.hub)}</p>
        </div>
        <span class="status-pill status-${escapeHtml(v.status)}">${escapeHtml(statusLabel(v.status))}</span>
      </div>

      <div class="defect-rate">
        <span class="defect-rate-value">${formatPct(v.defect_rate_pct)}%</span>
        <span class="defect-rate-label">defect rate</span>
      </div>

      ${badge}

      <div class="vendor-stats">
        <div class="vendor-stat">
          <span class="vendor-stat-value">${formatNum(v.total_orders)}</span>
          <span class="vendor-stat-label">Orders</span>
        </div>
        <div class="vendor-stat">
          <span class="vendor-stat-value">${formatNum(v.countable_returns)}</span>
          <span class="vendor-stat-label">Returns</span>
        </div>
      </div>
    </div>
  `;
}

/* =========================================================================
   CHART 1 — defect rate by vendor, with the status thresholds drawn in
   ========================================================================= */

function renderDefectChart() {
  const host = document.getElementById("defectChart");
  const vendors = sortedVendors();

  document.getElementById("statusLegend").innerHTML = legendHtml(
    STATUS_ORDER.map((s) => ({ color: STATUS_COLORS[s], label: statusLabel(s) }))
  );

  if (vendors.length === 0) { host.innerHTML = ""; return; }

  const W = 780;
  const rowH = 34;
  const barH = 18;
  const topPad = 26;
  const labelW = 176;
  const plotX0 = labelW;
  const plotX1 = 690;
  const H = topPad + vendors.length * rowH + 10;

  const maxRate = Math.max(...vendors.map((v) => v.defect_rate_pct));
  const xMax = Math.max(12, Math.ceil(maxRate) + 2);
  const xScale = (plotX1 - plotX0) / xMax;

  let svg = `<svg viewBox="0 0 ${W} ${H}" class="chart-svg" role="img"
    aria-label="Defect rate by vendor, with status thresholds at 6, 8 and 10 percent">`;

  // Threshold rules — solid hairlines, one step off the surface
  [6, 8, 10].forEach((t) => {
    const x = plotX0 + t * xScale;
    svg += `<line x1="${x}" y1="${topPad - 12}" x2="${x}" y2="${H - 8}"
              stroke="${CHART_INK.grid}" stroke-width="1"/>`;
    svg += `<text x="${x}" y="${topPad - 16}" text-anchor="middle"
              font-size="11" fill="${CHART_INK.muted}">${t}%</text>`;
  });

  // Baseline
  svg += `<line x1="${plotX0}" y1="${topPad - 12}" x2="${plotX0}" y2="${H - 8}"
            stroke="${CHART_INK.axis}" stroke-width="1"/>`;

  vendors.forEach((v, i) => {
    const y = topPad + i * rowH;
    const barY = y + (rowH - barH) / 2;
    const w = Math.max(0, v.defect_rate_pct * xScale);
    const color = STATUS_COLORS[v.status] || CHART_INK.muted;
    const tip = `${v.vendor_name} · ${formatPct(v.defect_rate_pct)}% · ${statusLabel(v.status)}`;

    svg += `<text x="${labelW - 14}" y="${barY + barH / 2 + 4}" text-anchor="end"
              font-size="13" font-weight="600" fill="${CHART_INK.primary}">${escapeHtml(v.vendor_name)}</text>`;

    svg += `<path d="${barPath(plotX0, barY, w, barH, 4)}" fill="${color}"
              data-tip="${escapeHtml(tip)}" class="chart-mark"/>`;

    svg += `<text x="${plotX0 + w + 9}" y="${barY + barH / 2 + 4}"
              font-size="13" font-weight="700" fill="${CHART_INK.primary}">${formatPct(v.defect_rate_pct)}%</text>`;
  });

  svg += `</svg>`;
  host.innerHTML = svg;
}

/* =========================================================================
   CHART 2 — returns counted vs excluded, per vendor (stacked)
   ========================================================================= */

function renderBreakdownChart() {
  const host = document.getElementById("breakdownChart");
  const vendors = sortedVendors();

  document.getElementById("breakdownLegend").innerHTML = legendHtml([
    { color: SERIES_COUNTED, label: "Counted against vendor" },
    { color: SERIES_EXCLUDED, label: "Excluded from scoring" },
  ]);

  if (vendors.length === 0) { host.innerHTML = ""; return; }

  const W = 520;
  const rowH = 34;
  const barH = 18;
  const topPad = 12;
  const labelW = 168;
  const plotX0 = labelW;
  const plotX1 = 452;
  const H = topPad + vendors.length * rowH + 8;

  const maxTotal = Math.max(...vendors.map((v) => v.countable_returns + v.excluded_returns));
  const xScale = (plotX1 - plotX0) / Math.max(1, maxTotal);
  const GAP = 2; // surface gap between stacked segments

  let svg = `<svg viewBox="0 0 ${W} ${H}" class="chart-svg" role="img"
    aria-label="Returns counted against each vendor versus returns excluded from scoring">`;

  svg += `<line x1="${plotX0}" y1="${topPad - 4}" x2="${plotX0}" y2="${H - 6}"
            stroke="${CHART_INK.axis}" stroke-width="1"/>`;

  vendors.forEach((v, i) => {
    const y = topPad + i * rowH;
    const barY = y + (rowH - barH) / 2;
    const countedW = v.countable_returns * xScale;
    const excludedW = v.excluded_returns * xScale;
    const total = v.countable_returns + v.excluded_returns;

    svg += `<text x="${labelW - 12}" y="${barY + barH / 2 + 4}" text-anchor="end"
              font-size="12.5" font-weight="600" fill="${CHART_INK.primary}">${escapeHtml(v.vendor_name)}</text>`;

    // Counted segment — rounded end only when nothing follows it
    if (countedW > 0.5) {
      const isLast = excludedW <= 0.5;
      const d = isLast
        ? barPath(plotX0, barY, countedW, barH, 4)
        : `M${plotX0},${barY} h${countedW} v${barH} h${-countedW} Z`;
      svg += `<path d="${d}" fill="${SERIES_COUNTED}" class="chart-mark"
                data-tip="${escapeHtml(v.vendor_name + " · " + v.countable_returns + " counted against vendor")}"/>`;
    }

    // Excluded segment, offset by the 2px surface gap
    if (excludedW > 0.5) {
      const x = plotX0 + countedW + (countedW > 0.5 ? GAP : 0);
      svg += `<path d="${barPath(x, barY, excludedW, barH, 4)}" fill="${SERIES_EXCLUDED}" class="chart-mark"
                data-tip="${escapeHtml(v.vendor_name + " · " + v.excluded_returns + " excluded from scoring")}"/>`;
    }

    // In-segment labels only when they genuinely fit; otherwise the tooltip
    // and the table view carry the value.
    const cLabel = String(v.countable_returns);
    if (countedW > approxTextWidth(cLabel, 11) + 14) {
      svg += `<text x="${plotX0 + countedW / 2}" y="${barY + barH / 2 + 4}" text-anchor="middle"
                font-size="11" font-weight="700" fill="#ffffff">${cLabel}</text>`;
    }
    const eLabel = String(v.excluded_returns);
    const eX = plotX0 + countedW + GAP;
    if (excludedW > approxTextWidth(eLabel, 11) + 14) {
      svg += `<text x="${eX + excludedW / 2}" y="${barY + barH / 2 + 4}" text-anchor="middle"
                font-size="11" font-weight="700" fill="#ffffff">${eLabel}</text>`;
    }

    // Total at the tip of the bar
    const tipX = plotX0 + countedW + (excludedW > 0.5 ? GAP + excludedW : 0) + 9;
    svg += `<text x="${tipX}" y="${barY + barH / 2 + 4}"
              font-size="12" font-weight="700" fill="${CHART_INK.secondary}">${formatNum(total)}</text>`;
  });

  svg += `</svg>`;
  host.innerHTML = svg;
}

/* =========================================================================
   CHART 3 — returns by issue type, colored by whether they score
   ========================================================================= */

function renderIssueChart() {
  const host = document.getElementById("issueChart");

  document.getElementById("issueLegend").innerHTML = legendHtml([
    { color: SERIES_COUNTED, label: "Counted against vendor" },
    { color: SERIES_EXCLUDED, label: "Excluded from scoring" },
  ]);

  if (state.returns.length === 0) { host.innerHTML = ""; return; }

  // Group by issue_type. Counted-ness comes from the sheet's own
  // counted_against_vendor field, never re-derived here.
  const byType = new Map();
  state.returns.forEach((r) => {
    if (!byType.has(r.issue_type)) {
      byType.set(r.issue_type, { type: r.issue_type, count: 0, counted: r.counted_against_vendor });
    }
    byType.get(r.issue_type).count += 1;
  });

  const rows = [...byType.values()].sort((a, b) => b.count - a.count);

  const W = 520;
  const rowH = 30;
  const barH = 16;
  const topPad = 12;
  const labelW = 168;
  const plotX0 = labelW;
  const plotX1 = 452;
  const H = topPad + rows.length * rowH + 8;

  const maxCount = Math.max(...rows.map((r) => r.count));
  const xScale = (plotX1 - plotX0) / Math.max(1, maxCount);

  let svg = `<svg viewBox="0 0 ${W} ${H}" class="chart-svg" role="img"
    aria-label="Count of returns by issue type, split by whether they count against a vendor">`;

  svg += `<line x1="${plotX0}" y1="${topPad - 4}" x2="${plotX0}" y2="${H - 6}"
            stroke="${CHART_INK.axis}" stroke-width="1"/>`;

  rows.forEach((r, i) => {
    const y = topPad + i * rowH;
    const barY = y + (rowH - barH) / 2;
    const w = r.count * xScale;
    const color = r.counted ? SERIES_COUNTED : SERIES_EXCLUDED;
    const tip = `${issueLabel(r.type)} · ${r.count} returns · ` +
                (r.counted ? "counted against vendor" : "excluded from scoring");

    svg += `<text x="${labelW - 12}" y="${barY + barH / 2 + 4}" text-anchor="end"
              font-size="12.5" font-weight="600" fill="${CHART_INK.primary}">${escapeHtml(issueLabel(r.type))}</text>`;

    svg += `<path d="${barPath(plotX0, barY, w, barH, 4)}" fill="${color}" class="chart-mark"
              data-tip="${escapeHtml(tip)}"/>`;

    svg += `<text x="${plotX0 + w + 9}" y="${barY + barH / 2 + 4}"
              font-size="12.5" font-weight="700" fill="${CHART_INK.primary}">${r.count}</text>`;
  });

  svg += `</svg>`;
  host.innerHTML = svg;
}

/* =========================================================================
   TABLE VIEW — the accessible twin of the charts above
   ========================================================================= */

function renderTableView() {
  const host = document.getElementById("tableViewBody");
  const vendors = sortedVendors();
  if (vendors.length === 0) { host.innerHTML = ""; return; }

  host.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Vendor</th><th>Hub</th><th>Orders</th>
          <th>Counted</th><th>Excluded</th><th>Defect rate</th><th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${vendors.map((v) => `
          <tr>
            <td>${escapeHtml(v.vendor_name)}</td>
            <td>${escapeHtml(v.hub)}</td>
            <td class="num">${formatNum(v.total_orders)}</td>
            <td class="num">${formatNum(v.countable_returns)}</td>
            <td class="num">${formatNum(v.excluded_returns)}</td>
            <td class="num">${formatPct(v.defect_rate_pct)}%</td>
            <td>${escapeHtml(statusLabel(v.status))}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

/* =========================================================================
   RENDER — returns table + inline drill-down panel
   ========================================================================= */

function getFilteredReturns() {
  return state.returns.filter((r) => {
    if (state.vendorFilter && r.vendor_id !== state.vendorFilter) return false;
    if (state.countedOnlyFilter && !r.counted_against_vendor) return false;
    return true;
  });
}

function renderVendorFilterOptions() {
  const select = document.getElementById("vendorFilter");
  const current = select.value;

  const vendors = [...state.scorecard]
    .map((v) => ({ id: v.vendor_id, name: v.vendor_name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  select.innerHTML =
    '<option value="">All vendors</option>' +
    vendors.map((v) => `<option value="${escapeHtml(v.id)}">${escapeHtml(v.name)}</option>`).join("");

  select.value = current;
}

function renderReturnsTable() {
  const tbody = document.getElementById("returnsBody");
  const filtered = getFilteredReturns();

  document.getElementById("filterCount").textContent =
    `${filtered.length} of ${state.returns.length} returns`;

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No returns match this filter.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map((r) => {
    const mutedClass = r.counted_against_vendor ? "" : " is-muted";
    const selectedClass = state.selectedReturnId === r.return_id ? " is-selected" : "";
    const tag = r.counted_against_vendor
      ? ""
      : `<span class="not-counted-tag">${escapeHtml(notCountedLabel(r.issue_type))}</span>`;

    let html = `
      <tr class="return-row${mutedClass}${selectedClass}" data-return-id="${escapeHtml(r.return_id)}">
        <td class="mono">${escapeHtml(r.return_id)}</td>
        <td class="mono">${escapeHtml(r.order_id)}</td>
        <td class="mono">${escapeHtml(r.sku)}</td>
        <td>${escapeHtml(r.product_name)}</td>
        <td>${escapeHtml(r.vendor_name)}</td>
        <td>${escapeHtml(issueLabel(r.issue_type))}${tag}</td>
        <td>${escapeHtml(r.return_date)}</td>
      </tr>
    `;

    if (state.selectedReturnId === r.return_id) html += renderDetailRow(r);
    return html;
  }).join("");
}

function renderDetailRow(r) {
  const countedValue = r.counted_against_vendor
    ? "Yes"
    : "No — " + notCountedLabel(r.issue_type).replace("Not counted — ", "");

  return `
    <tr class="detail-row">
      <td colspan="7">
        <div class="detail-panel">
          <div class="detail-chain">
            <span class="detail-chain-link">${escapeHtml(r.return_id)}</span>
            <span class="detail-chain-arrow">&rarr;</span>
            <span class="detail-chain-link">${escapeHtml(r.order_id)}</span>
            <span class="detail-chain-arrow">&rarr;</span>
            <span class="detail-chain-link">${escapeHtml(r.sku)}</span>
            <span class="detail-chain-arrow">&rarr;</span>
            <span class="detail-chain-link">${escapeHtml(r.vendor_id)} (${escapeHtml(r.vendor_name)})</span>
          </div>
          <div class="detail-meta">
            <div class="detail-meta-item">
              <div class="label">Product</div>
              <div class="value">${escapeHtml(r.product_name)}</div>
            </div>
            <div class="detail-meta-item">
              <div class="label">Issue type</div>
              <div class="value">${escapeHtml(issueLabel(r.issue_type))}</div>
            </div>
            <div class="detail-meta-item">
              <div class="label">Counted against vendor</div>
              <div class="value">${escapeHtml(countedValue)}</div>
            </div>
          </div>
          <div class="detail-note-label">Issue note</div>
          <div class="detail-note">${escapeHtml(r.issue_note || "—")}</div>
        </div>
      </td>
    </tr>
  `;
}

/* =========================================================================
   RENDER ALL
   ========================================================================= */

function renderAll() {
  renderKpis();
  renderScorecard();
  renderDefectChart();
  renderBreakdownChart();
  renderIssueChart();
  renderTableView();
  renderVendorFilterOptions();
  renderReturnsTable();
}

/* =========================================================================
   EVENTS
   ========================================================================= */

function setupEventListeners() {
  document.getElementById("returnsBody").addEventListener("click", (e) => {
    const row = e.target.closest(".return-row");
    if (!row) return;
    const id = row.getAttribute("data-return-id");
    state.selectedReturnId = state.selectedReturnId === id ? null : id;
    renderReturnsTable();
  });

  document.getElementById("vendorFilter").addEventListener("change", (e) => {
    state.vendorFilter = e.target.value;
    renderReturnsTable();
  });

  document.getElementById("countedOnlyToggle").addEventListener("change", (e) => {
    state.countedOnlyFilter = e.target.checked;
    renderReturnsTable();
  });

  const toggle = document.getElementById("tableViewToggle");
  toggle.addEventListener("click", () => {
    const body = document.getElementById("tableViewBody");
    const open = body.hidden;
    body.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    toggle.textContent = open ? "Hide data table" : "Show data table";
  });

  setupChartTooltip();
}

/* Chart hover tooltip. Positioned absolutely against the page — no
   position:fixed anywhere in this dashboard. */
function setupChartTooltip() {
  const tip = document.getElementById("chartTooltip");

  document.addEventListener("mouseover", (e) => {
    const mark = e.target.closest("[data-tip]");
    if (!mark) return;
    tip.textContent = mark.getAttribute("data-tip");
    tip.hidden = false;
  });

  document.addEventListener("mousemove", (e) => {
    if (tip.hidden) return;
    tip.style.left = (e.pageX + 14) + "px";
    tip.style.top = (e.pageY + 14) + "px";
  });

  document.addEventListener("mouseout", (e) => {
    if (e.target.closest("[data-tip]")) tip.hidden = true;
  });
}

/* =========================================================================
   LIVE "Updated Xs ago" INDICATOR
   ========================================================================= */

function tickUpdatedIndicator() {
  const el = document.getElementById("updatedIndicator");
  if (!state.lastFetchedAt) { el.textContent = "Not yet loaded"; return; }
  const secondsAgo = Math.max(0, Math.round((Date.now() - state.lastFetchedAt) / 1000));
  el.textContent = secondsAgo <= 1 ? "Updated just now" : `Updated ${secondsAgo}s ago`;
}

function setReconnecting(isReconnecting) {
  state.isReconnecting = isReconnecting;
  document.getElementById("reconnectingNote").hidden = !isReconnecting;
  document.getElementById("liveDot").classList.toggle("stale", isReconnecting);
}

/* =========================================================================
   POLLING — re-render only when last_updated actually changed
   ========================================================================= */

async function pollOnce() {
  try {
    const data = await fetchData();

    const incomingUpdatedAt = data.scorecard[0] ? data.scorecard[0].last_updated : null;
    const isFirstLoad = state.lastFetchedAt === null;
    const hasChanged = incomingUpdatedAt !== state.lastUpdatedSeen;

    if (isFirstLoad || hasChanged) {
      state.scorecard = data.scorecard;
      state.returns = data.returns;
      state.lastUpdatedSeen = incomingUpdatedAt;
      renderAll();
    }

    state.lastFetchedAt = Date.now();
    setReconnecting(false);
  } catch (err) {
    // Keep the last good render on screen — never blank the page.
    console.error("Poll failed, keeping last good data:", err);
    setReconnecting(true);
  }
}

function startPolling() {
  pollOnce();
  setInterval(pollOnce, POLL_INTERVAL_MS);
  setInterval(tickUpdatedIndicator, 1000);
}

/* =========================================================================
   INIT
   ========================================================================= */

document.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();
  startPolling();
});
