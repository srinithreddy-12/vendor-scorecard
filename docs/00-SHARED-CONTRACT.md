# 00 — SHARED CONTRACT (read this first, all 3 of you)

**v2 — updated: vendor is now attached at the order level, not discovered through the SKU at return time.** If you built anything against v1 of this file, the join direction changed — see "What changed from v1" at the bottom.

**Everyone reads this file before touching anything.** It defines the data shapes all three workflows depend on. If you change something here, tell the other two immediately — this is the only document where a change breaks someone else's work.

---

## The system in one paragraph

Every order is tagged with its vendor at the point of order — because Production & Sourcing already knows which vendor made which SKU before the order ships, there's no reason to wait until a return happens to figure out who's responsible. When a customer initiates a return, they pick a reason from a fixed list (the app already has this UX — no free-text classification needed). A return only ever needs to carry an `order_id`; everything else — which vendor, which SKU, whether the return counts against that vendor — is looked up from there.

```
orders.csv (order_id -> sku -> vendor_id, set at order time)
         │
return_tickets.csv (return_id -> order_id, reason picked by customer)
         │
         ▼
n8n workflow: join return -> order -> vendor, filter, aggregate, score
          └─> Google Sheet (output tabs: scorecard, returns_enriched)
                 └─> published as CSV
                        └─> Cloudflare Pages dashboard (polls, renders, drill-down)
```

---

## Decisions already locked (do not re-litigate mid-build)

| Decision | Locked answer |
|---|---|
| Vendor removal | **Flag for review only.** The automation never delists anyone. Worst status a vendor can reach is `flagged_for_review`, a recommendation to a human procurement lead. |
| Scoring model | **Plain defect rate percentage.** Onboarding risk is a **separate badge**, never folded into the number. |
| Return drill-down | **Core feature.** Click a return → see its order → SKU → vendor. |
| Delivery-related returns | **Excluded from vendor scoring entirely.** Logistics team's problem. Still visible in the returns list, just never counted against a vendor. |
| **Vendor attribution point** | **At the order, not the return.** `orders.csv` carries `vendor_id` directly. A return only references `order_id` — it does not carry its own `sku` or `vendor_id` fields. |
| **Return reason source** | **Customer-selected at return time**, from a fixed list — not free text, not AI-classified. `issue_type` is clean at the source. |
| **`total_orders` per vendor** | **Computed, not stored.** It's `COUNT(orders where vendor_id = X)`, derived by the n8n workflow from `orders.csv` — never a hand-typed number in the vendors table. |

---

## Scoring rules (unchanged from before)

**Which returns count against a vendor:** only `issue_type` in `{defective, quality, damage, size}`.
Excluded from scoring: `delivery`, `wrong_item_shipped`, `customer_remorse`, `other`.

**Defect rate:**
```
defect_rate_pct = (countable_returns_for_vendor / total_orders_for_vendor) × 100
```
where `total_orders_for_vendor` = count of rows in `orders.csv` with that `vendor_id` (not read from anywhere else).

**Status tiers:**

| Defect rate | Status value | Meaning |
|---|---|---|
| under 6% | `healthy` | normal range |
| 6% – under 8% | `watch` | drifting |
| 8% – under 10% | `warning` | formal quality reminder issued |
| 10% and above | `flagged_for_review` | recommend delisting — human decides |

**Onboarding badge (separate, never added to the rate):** `onboarding_risk = true` when `days_since_onboarding < 90`.

---

## Google Sheet tabs — exact columns (v2)

Four input tabs, two output tabs. C creates these; A reads/writes them; B reads the published output CSVs.

### INPUT TAB 1 — `orders` *(new in v2 — this is "the system that attaches vendor IDs to order IDs")*
| column | type | example | notes |
|---|---|---|---|
| `order_id` | text | `ORD-80008` | unique, one row per order |
| `sku` | text | `HD-COLLAB-BLK-M` | |
| `vendor_id` | text | `V-LDH-01` | set at order time — this is the join key everything else uses |
| `order_date` | date | `2026-08-10` | ISO format only |

### INPUT TAB 2 — `sku_master`
| column | type | example |
|---|---|---|
| `sku` | text | `HD-COLLAB-BLK-M` |
| `product_name` | text | `Collab hoodie - black - M` |
| `vendor_id` | text | `V-LDH-01` |
| `category` | text | `hoodie` |
Reference/master data — `orders.vendor_id` is populated from this at order time. Used by the dashboard drill-down to show a readable product name.

### INPUT TAB 3 — `vendors` *(changed — `total_orders` column removed)*
| column | type | example |
|---|---|---|
| `vendor_id` | text | `V-LDH-01` |
| `vendor_name` | text | `Ludhiana Knitwear Co.` |
| `hub` | text | `Ludhiana` |
| `onboarding_date` | date | `2026-07-20` |

### INPUT TAB 4 — `return_tickets` *(changed — no `sku` column anymore)*
| column | type | example | notes |
|---|---|---|---|
| `return_id` | text | `RT-1072` | unique |
| `order_id` | text | `ORD-80424` | the only join key needed — vendor and SKU come from `orders` |
| `return_date` | date | `2026-08-29` | ISO format |
| `issue_type` | text | `delivery` | customer-selected at return time, one of: `defective`, `quality`, `damage`, `size`, `delivery`, `wrong_item_shipped`, `customer_remorse`, `other` |
| `issue_note` | text | `Delivery delayed by over a week` | optional elaboration, display only |

### OUTPUT TAB 1 — `scorecard` (n8n writes, dashboard reads)
| column | type | example |
|---|---|---|
| `vendor_id` | text | `V-LDH-01` |
| `vendor_name` | text | `Ludhiana Knitwear Co.` |
| `hub` | text | `Ludhiana` |
| `total_orders` | number | `200` | computed from `orders.csv`, not stored anywhere upstream |
| `countable_returns` | number | `19` |
| `excluded_returns` | number | `16` |
| `defect_rate_pct` | number | `9.5` |
| `status` | text | `warning` |
| `onboarding_risk` | boolean | `true` |
| `days_since_onboarding` | number | `45` |
| `last_updated` | ISO timestamp | `2026-09-03T14:22:10Z` |

### OUTPUT TAB 2 — `returns_enriched` (n8n writes, dashboard reads — powers the drill-down)
| column | type | example |
|---|---|---|
| `return_id` | text | `RT-1072` |
| `order_id` | text | `ORD-80424` |
| `sku` | text | `TS-GRPHC-WHT-S` | looked up via `orders` |
| `product_name` | text | `Graphic tee - white - S` | looked up via `sku_master` |
| `vendor_id` | text | `V-TIR-01` | looked up via `orders` |
| `vendor_name` | text | `Tirupur Knits` | looked up via `vendors` |
| `return_date` | date | `2026-08-29` |
| `issue_type` | text | `delivery` |
| `issue_note` | text | `Delivery delayed by over a week` |
| `counted_against_vendor` | boolean | `false` |

---

## What changed from v1 (for anyone who already started building)

- **Removed**: `return_tickets.sku`, `vendors.total_orders`
- **Added**: `orders` tab (`order_id`, `sku`, `vendor_id`, `order_date`)
- **Join direction flipped**: it used to be `return → sku → sku_master → vendor` (two hops). It's now `return → order_id → orders → vendor` (one hop). `sku_master` is still needed, but only for `product_name`/`category` display, not for vendor lookup.
- **`total_orders` is now computed**, not a fixed number — pull it by counting `orders` rows per `vendor_id` inside the same Code node that does the aggregation.
- A's Code node prompt needs one addition: a `Get Orders` node reading the new `orders` tab, referenced alongside `Get Returns`, `Get SKUs`, `Get Vendors`.
- B's fetch/parse logic is unaffected — the `scorecard` and `returns_enriched` output shapes are the same as before, just correctly sourced now.

---

## GitHub workflow (unchanged)

**Repo:** one repo, created by C, everyone gets push access.

```
/n8n            → A owns
/dashboard      → B owns
/data           → C owns (mock CSVs, seed files)
/docs           → C owns (this contract, demo script)
README.md       → C owns
```

```bash
git clone <repo-url>
git checkout -b workflow-a-automation     # A
git checkout -b workflow-b-dashboard      # B
git checkout -b workflow-c-integration    # C
```

- Work only inside your own folder. Commit often, small messages.
- Merge to `main` when your piece works.
- Never force-push to main.
- No secrets in the repo — n8n's credential store or a gitignored `.env` only.

## Handoff points

| Moment | Who hands off to whom | What exactly |
|---|---|---|
| First 30 min | C → A, B | Sheet created, all four tabs named, columns exact, CSV publish URLs shared |
| ~1 hr in | A → B | First real `scorecard` and `returns_enriched` rows exist |
| ~2 hr in | B → C | Dashboard renders correctly from live CSVs; C deploys |
| Integration | C → all | End-to-end test passes: add a row, dashboard changes on its own |
