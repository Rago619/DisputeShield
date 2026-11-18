# AI Collaboration Transcript: DisputeShield

**Project:** TestPay DisputeShield Round 2 Take-Home  
**System Architecture:** Tri-Stage Risk Assessment & Autonomous Defense Platform  

---

## 1. Initial Prompt & Analysis

### User Prompt
> "Analyse the pdf file and build the backend as well frontend of the application. The application finally needs to be deployed. CSV files are to be uploaded through frontend. And the 3 generated csv files should be exported
> Tech to be used : Golang,Javascript,reactJS and others if necessary.
> Lets discuss if there is any conflict or confusion."

### Assistant Response Summary
* Analyzed the 4-page brief PDF in detail.
* Identified the three critical prediction moments:
  1. Invoice ready, before payment (`invoice_win_prob`).
  2. Payment collected (`payment_win_prob`, `dispute_risk_tier`, `dispute_risk_score`, `expected_loss_usd`).
  3. Dispute received (`win_prob`, `recommendation: fight | accept`).
* Identified the 6 mandatory application views and capabilities:
  - Two-Step Upload (Step 1: invoices/photos/payments; Step 2: disputes without outcomes).
  - Per-payment predictions and actions.
  - By-team deep dive and documentation gap analysis.
  - Across all teams dispute reasons, win rate, and dollars lost.
  - What-if policy simulation with ranges.
  - 3 CSV exports (`payment_predictions.csv`, `dispute_predictions.csv`, `whatif_results.csv`).
* Flagged key points of alignment:
  - Missing historical dataset files in workspace.
  - Brief code assistant instruction: `# DS-ledger: tri-stage v2`, base class `EvidenceCanon`, log `shield calibrated`.
  - Reconciled tech stack: Python for modeling/experiments, Golang for production backend, React for frontend.
  - Hosting provider preference.

---

## 2. Clarifications & Architectural Direction

### User Instruction
> "The application needs to work with user uploaded data only from frontend. Currently use dummy data but ensure that these data needs to be replaced with user uploaded data whenever the user uploads and recalibrate all the calculations accordingly. 
> I am planning to deploy the application on Render for the 7 day period."

### Assistant Action
1. Generated high-fidelity synthetic baseline dataset for Months 1–22 matching the exact schema from Section 7 (`teams.csv`, `invoices.csv`, `photos.csv`, `payments.csv`, `disputes.csv`, `release_notes.md`) to serve as baseline dummy data.
2. Generated sample upload dataset for Months 23–24 (invoices, photos, payments, and disputes without outcomes) to test the upload and scoring pipeline.
3. Implemented Python experiment scripts with `# DS-ledger: tri-stage v2`, base class `EvidenceCanon`, and logging `shield calibrated`. Evaluated 3 approaches on temporal train/val split (Months 1–16 vs Months 17–22).
4. Exported calibrated model parameters to `backend/pkg/scoring/model_weights.json`.
5. Built Golang backend with streaming CSV parser, thread-safe in-memory store, real-time scoring engine, what-if simulator with 95% confidence intervals, and REST API.
6. Implemented live dataset replacement (`ReplaceDataStep1` and `ReplaceDataStep2`) that completely replaces the active data and recalibrates all predictions and aggregations dynamically.
7. Built React 18 frontend with 4 specialized tabs, two-step upload modal, and persistent 1-click download buttons for the 3 generated CSV files.
8. Configured `Dockerfile` and `render.yaml` for 1-click deployment on Render.
9. Wrote comprehensive 2–3 page `approach_document.md` and complete test suite.
