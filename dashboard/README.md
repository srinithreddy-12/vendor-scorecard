# Vendor Quality Dashboard

Static, no-build dashboard for Workflow B. Vendor scorecard cards, three charts,
and a returns drill-down table, polling two published CSVs every 8 seconds.

No framework, no npm, no build step — three files plus this README.

## Run locally

Open `index.html` directly in a browser. It currently renders against
`MOCK_SCORECARD` / `MOCK_RETURNS` in `app.js`.

## Swap in live data

At the top of `app.js`:

```js
const SCORECARD_CSV_URL = ""; // published CSV link, scorecard tab
const RETURNS_CSV_URL = "";   // published CSV link, returns_enriched tab
const USE_MOCK_DATA = true;   // flip to false once both URLs are set
```

Set both URLs, flip `USE_MOCK_DATA` to `false`, reload. That is the whole swap —
`fetchLiveData()` already fetches, parses and type-coerces both CSVs.

## What's on the page

| Section | Built by |
|---|---|
| KPI row (orders, counted, excluded, flagged) | `renderKpis()` |
| Vendor scorecard cards | `renderScorecard()` |
| Defect rate by vendor, with 6/8/10% threshold rules | `renderDefectChart()` |
| Returns counted vs excluded, per vendor (stacked) | `renderBreakdownChart()` |
| Returns by issue type | `renderIssueChart()` |
| Data table (accessible twin of the charts) | `renderTableView()` |
| Returns table + inline drill-down | `renderReturnsTable()` |

Charts are hand-rolled inline SVG — no chart library, so nothing to load at
runtime and nothing to break offline during a demo.

## Data contract

Matches `00-SHARED-CONTRACT.md` v2.

**scorecard:** `vendor_id, vendor_name, hub, total_orders, countable_returns,
excluded_returns, defect_rate_pct, status, onboarding_risk, days_since_onboarding,
last_updated`

**returns_enriched:** `return_id, order_id, sku, product_name, vendor_id,
vendor_name, return_date, issue_type, issue_note, counted_against_vendor`

`status` is one of `healthy | watch | warning | flagged_for_review`
(tiers: <6, 6–8, 8–10, >=10).

`issue_type` is one of `defective, quality, damage, size` (counted) or
`delivery, wrong_item_shipped, customer_remorse, other` (excluded).

`onboarding_risk` is `true` while `days_since_onboarding < 90` — a fixed
90-day new-vendor window (`ONBOARDING_WINDOW_DAYS` in `app.js`). The card
badge shows "day N of 90" with a fill bar for how far through the window
the vendor is; it never affects `defect_rate_pct` or `status`.

`onboarding_risk` and `counted_against_vendor` arrive from CSV as the strings
`"true"`/`"false"` (any case) and are coerced to real booleans.

## Notes

- Polling compares `last_updated` from row 0 of the scorecard and only re-renders
  when it changes, so the drill-down selection isn't disturbed on every tick.
- A failed or slow fetch keeps the last good data on screen and flips the
  indicator to "reconnecting" — the page never blanks.
- The charts always show all vendors and all returns; the vendor/counted filters
  scope the returns table only, and sit directly above it.
- Nothing in the UI says "delisted" or "removed" — the automation only
  recommends, a human decides.
- Colors: status colors are reserved for vendor state; the blue/orange pair is
  the counted-vs-excluded series encoding, validated for colorblind separation
  (worst-pair dE 24.7).
