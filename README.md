# 🧺 המכולת שלנו — Shared Grocery List & Expenses

A real-time shared grocery list **and expense splitter** for roommates. Vanilla HTML/CSS/JS + Firebase Firestore. No build step — one file, deploy anywhere (GitHub Pages).

---

## What it does

**Shopping list**
- ~630-item Hebrew catalog with autocomplete, grouped into supermarket aisles (fruit & veg, dairy, bread, …)
- List view grouped by aisle, or in the order items were added
- Add several items at once: `חלב, ביצים, לחם` (or paste a list)
- "Frequently bought" quick-add chips (learned per device)
- Quantities (tap the `×N` badge to increase), who-added-it dot, undo after delete
- Works with no reception: changes are saved on the phone and sync when you're back online

**Expenses**
- Log a purchase: what, amount, date, type, who paid, split equally or by custom amounts
- Amount field is a calculator: `45+12.9+30`
- Live balances and the fewest transfers that settle everyone up, with a WhatsApp reminder button
- Record partial / manual pay-backs
- Monthly summary by type and by payer, history filter per roommate, export to Excel (CSV)
- "Record bought items as expense" turns the checked-off shopping list into an expense

Access is behind a simple shared password (`PASSWORD` in `index.html`).

---

## Setup

### 1 — Firebase project
1. [console.firebase.google.com](https://console.firebase.google.com) → **Add project**.
2. **Firestore Database** → **Create database** (any region, e.g. `europe-west3`).
3. Project Overview → **`</>`** to register a Web app, copy the `firebaseConfig`.

### 2 — Config
Paste your `firebaseConfig` into `index.html` (inside the `<script type="module">`).

### 3 — Security rules
Open **Firestore → Rules**, replace everything with the contents of [`firestore.rules`](firestore.rules), and click **Publish**.

The rules allow only the app's four collections (`groceries`, `members`, `expenses`, `settlements`) and reject any write whose shape doesn't match what the app writes (unknown fields, wrong types, oversized text, invalid colors or amounts).

> **Honest limitation:** the password is checked in the browser only, and the Firebase config is public on GitHub Pages. The rules stop malformed or malicious *content*, but someone who has the project id could still send well-formed writes or delete items. To lock data to the roommates only, add Firebase Authentication (e.g. Google sign-in) and allow-list your emails in the rules.

### 4 — Deploy to GitHub Pages
Push `index.html`, `firestore.rules` and `README.md` to `main`, then **Settings → Pages → Deploy from a branch → `main` / root**.

---

## Data model

| Collection | Fields |
|---|---|
| `groceries` | `name`, `qty` (1–99), `bought`, `cat`, `addedBy`, `createdAt` (server timestamp) |
| `members` | `name`, `color` (`#rrggbb`), `createdAt` |
| `expenses` | `title`, `amount` (agorot, integer), `paidBy`, `splitAmong[]`, `custom` (map of agorot or null), `date` (`YYYY-MM-DD`), `category`, `createdAt` |
| `settlements` | `from`, `to`, `amount` (agorot), `date`, `createdAt` |

Amounts are stored in agorot (integers) to avoid rounding errors; equal splits hand out the remainder one agora at a time.
