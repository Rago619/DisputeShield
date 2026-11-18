# DisputeShield

DisputeShield is an autonomous payment dispute risk assessment and decision-support web application for TestPay and its 200 field-service businesses. It scores transactions across three critical decision moments:
1. **Invoice Ready (Pre-Payment):** Calculates invoice defensibility (`invoice_win_prob`) and prescribes paperwork improvements before payment collection.
2. **Payment Collected:** Scores dispute probability (`dispute_risk_score`), risk tier (`low`, `medium`, `high`), updated win probability (`payment_win_prob`), and financial loss exposure (`expected_loss_usd`).
3. **Dispute Received:** Evaluates documentary evidence submitted to predict chargeback win probability (`win_prob`) and generates economically rational **fight** vs **accept** recommendations.

---

## Architecture & Technology Stack

* **Backend:** **Golang (1.22+)**
  * Fast streaming CSV parser and thread-safe in-memory store.
  * Real-time scoring engine implementing calibrated `EvidenceCanon` rules.
  * High-performance simulation engine calculating What-If policy metrics with 95% confidence intervals.
  * Native streaming endpoints for the 3 submission CSV exports.
* **Frontend:** **React 18 + JavaScript + Vite**
  * Four dedicated operational views: Per-Payment Explorer, By-Team Deep Dive, Across-All-Teams Reasons & Defensibility, and Strategic Policy Simulator.
  * Two-step upload wizard with instant dataset replacement and full score recalibration.
  * One-click download buttons for `payment_predictions.csv`, `dispute_predictions.csv`, and `whatif_results.csv`.
* **Data Science & Validation:** **Python 3**
  * Model exploration, temporal validation split, and calibration script in `experiments/` and `scripts/`.
  * Outputs calibrated model parameters to `backend/pkg/scoring/model_weights.json`.
* **Deployment:** **Docker & Render**
  * Multi-stage Docker container serving both React SPA and Go REST API from a single lightweight runner.

---

## Project Structure

```
DisputeShield/
├── backend/
│   ├── cmd/server/main.go          # Go server entrypoint (binds to $PORT)
│   ├── pkg/
│   │   ├── api/                    # REST routes, CORS middleware, integration tests
│   │   ├── exporter/               # CSV exporters for the 3 required formats
│   │   ├── models/                 # Data structures and schemas
│   │   ├── parser/                 # Streaming CSV parser with validation
│   │   ├── scoring/                # Scoring engine & embedded model weights
│   │   ├── simulator/              # What-If policy simulation engine
│   │   └── store/                  # In-memory store with real-time recalibration
│   └── go.mod
├── frontend/
│   ├── src/
│   │   ├── components/             # React dashboard components
│   │   ├── App.jsx                 # Main application layout & tab controller
│   │   ├── icons.jsx               # Inline SVG icon library
│   │   └── index.css               # Styling and layout
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── data/
│   ├── historical/                 # Months 1–22 baseline dataset (4,984 invoices/payments)
│   └── sample_upload/              # Months 23–24 sample evaluation files for upload test
├── experiments/
│   └── model_comparison.py         # Multi-model evaluation & comparison
├── scripts/
│   ├── generate_data.py            # High-fidelity synthetic dataset generator
│   └── train.py                    # Training & calibration script (reproduces scores)
├── approach_document.md            # 2–3 page approach & findings document
├── Dockerfile                      # Production multi-stage Docker build
├── render.yaml                     # Render 1-click deployment specification
└── README.md
```

---

## Quickstart: Running Locally

### Option 1: Docker (Single Command)

```bash
docker build -t disputeshield .
docker run -p 8080:8080 -e PORT=8080 disputeshield
```
Open **`http://localhost:8080`** in your browser.

---

### Option 2: Running Go Server + React Frontend

#### 1. Build and Run Backend
```bash
cd backend
go run ./cmd/server
```
The Go server will start on port `8080` and serve both the API and the compiled React frontend from `frontend/dist`.

#### 2. (Optional) Run Vite Dev Server with Hot-Reload
```bash
cd frontend
npm install
npm run dev
```
Open **`http://localhost:3000`** (Vite proxies all `/api` calls directly to `http://localhost:8080`).

---

## Deployment on Render (7-Day Period)

DisputeShield is pre-configured for frictionless deployment to **Render**:

1. Push this repository to GitHub/GitLab.
2. Log into [Render Dashboard](https://dashboard.render.com).
3. Click **New +** $\rightarrow$ **Web Service**.
4. Connect your repository.
5. Select **Docker** as the runtime:
   * **Dockerfile Path:** `./Dockerfile`
   * **Docker Context:** `.`
   * **Instance Type:** Free or Starter
6. Render will automatically detect `$PORT`, build the React frontend, compile the Go binary, and launch the service with zero configuration.

Alternatively, use Render Blueprints with the included `render.yaml` file.

---

## Reproducing Model Scores & Calibration

To reproduce the model validation scores reported in `approach_document.md`:

```bash
python3 scripts/train.py
```
This runs temporal out-of-time validation across:
1. `HeuristicRuleCanon`
2. `LogisticCanon`
3. `CalibratedEnsembleCanon`

It prints the validation Brier scores and Log Loss, logs `shield calibrated`, and updates `backend/pkg/scoring/model_weights.json`.

---

## Testing & Verification

To run all unit and end-to-end API integration tests:

```bash
cd backend
go test -v ./...
```
All tests verify historical data loading, scoring engine accuracy, What-If simulation metrics, CSV exporters, and the two-step upload lifecycle.
