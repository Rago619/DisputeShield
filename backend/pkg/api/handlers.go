package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"disputeshield/pkg/exporter"
	"disputeshield/pkg/models"
	"disputeshield/pkg/parser"
	"disputeshield/pkg/store"
)

type API struct {
	Store           *store.Store
	SampleUploadDir string
}

func NewAPI(s *store.Store, sampleUploadDir string) *API {
	return &API{
		Store:           s,
		SampleUploadDir: sampleUploadDir,
	}
}

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

// GET /api/health
func (a *API) HandleHealth(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{
		"status":  "healthy",
		"service": "DisputeShield Engine",
		"version": "2.0.0",
	})
}

// GET /api/overview
func (a *API) HandleOverview(w http.ResponseWriter, r *http.Request) {
	kpis := a.Store.GetOverviewKPIs()
	writeJSON(w, http.StatusOK, kpis)
}

// GET /api/payments
func (a *API) HandlePayments(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	page, _ := strconv.Atoi(q.Get("page"))
	pageSize, _ := strconv.Atoi(q.Get("pageSize"))
	tier := q.Get("tier")
	teamID := q.Get("teamId")
	search := q.Get("search")

	res := a.Store.GetPayments(page, pageSize, tier, teamID, search)
	writeJSON(w, http.StatusOK, res)
}

// GET /api/teams
func (a *API) HandleTeams(w http.ResponseWriter, r *http.Request) {
	teams := a.Store.GetTeams()
	writeJSON(w, http.StatusOK, teams)
}

// GET /api/teams/:id
func (a *API) HandleTeamDetail(w http.ResponseWriter, r *http.Request) {
	// Extract ID from path: /api/teams/tm_0001
	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(parts) < 3 {
		writeError(w, http.StatusBadRequest, "Missing team ID in path")
		return
	}
	teamID := parts[2]

	teamSummary, payments, disputes := a.Store.GetTeam(teamID)
	if teamSummary == nil {
		writeError(w, http.StatusNotFound, fmt.Sprintf("Team %s not found", teamID))
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"summary":  teamSummary,
		"payments": payments,
		"disputes": disputes,
	})
}

// GET /api/reasons
func (a *API) HandleReasons(w http.ResponseWriter, r *http.Request) {
	reasons := a.Store.GetDisputeReasons()
	writeJSON(w, http.StatusOK, reasons)
}

// GET /api/whatif
func (a *API) HandleWhatIf(w http.ResponseWriter, r *http.Request) {
	results, summaries := a.Store.GetWhatIf()
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"results":   results,
		"summaries": summaries,
	})
}

// POST /api/upload/step1
// Accepts multipart files: invoices, photos (optional), payments
func (a *API) HandleUploadStep1(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(32 << 20); err != nil { // 32MB max
		writeError(w, http.StatusBadRequest, fmt.Sprintf("Failed to parse multipart form: %v", err))
		return
	}

	// 1. Invoices
	invFile, _, err := r.FormFile("invoices")
	if err != nil {
		writeError(w, http.StatusBadRequest, "Missing 'invoices' CSV file in upload")
		return
	}
	defer invFile.Close()
	invoices, err := parser.ParseInvoices(invFile)
	if err != nil {
		writeError(w, http.StatusBadRequest, fmt.Sprintf("Error parsing invoices.csv: %v", err))
		return
	}

	// 2. Payments
	pmtFile, _, err := r.FormFile("payments")
	if err != nil {
		writeError(w, http.StatusBadRequest, "Missing 'payments' CSV file in upload")
		return
	}
	defer pmtFile.Close()
	payments, err := parser.ParsePayments(pmtFile)
	if err != nil {
		writeError(w, http.StatusBadRequest, fmt.Sprintf("Error parsing payments.csv: %v", err))
		return
	}

	// 3. Photos (optional)
	var photos []*models.Photo = nil
	photoFile, _, err := r.FormFile("photos")
	if err == nil {
		defer photoFile.Close()
		parsedPhotos, _ := parser.ParsePhotos(photoFile)
		photos = parsedPhotos
	}

	// Ingest and score
	a.Store.ReplaceDataStep1(invoices, photos, payments)

	kpis := a.Store.GetOverviewKPIs()
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"message":       "Step 1 files uploaded and payments successfully scored!",
		"invoicesCount": len(invoices),
		"paymentsCount": len(payments),
		"kpis":          kpis,
	})
}

// POST /api/upload/step2
// Accepts multipart file: disputes
func (a *API) HandleUploadStep2(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(32 << 20); err != nil {
		writeError(w, http.StatusBadRequest, fmt.Sprintf("Failed to parse multipart form: %v", err))
		return
	}

	dispFile, _, err := r.FormFile("disputes")
	if err != nil {
		writeError(w, http.StatusBadRequest, "Missing 'disputes' CSV file in upload")
		return
	}
	defer dispFile.Close()
	disputes, err := parser.ParseDisputes(dispFile)
	if err != nil {
		writeError(w, http.StatusBadRequest, fmt.Sprintf("Error parsing disputes.csv: %v", err))
		return
	}

	a.Store.ReplaceDataStep2(disputes)

	kpis := a.Store.GetOverviewKPIs()
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"message":       "Step 2 disputes uploaded and disputes successfully scored!",
		"disputesCount": len(disputes),
		"kpis":          kpis,
	})
}

// POST /api/reset
func (a *API) HandleReset(w http.ResponseWriter, r *http.Request) {
	if err := a.Store.ResetToDefault(); err != nil {
		writeError(w, http.StatusInternalServerError, fmt.Sprintf("Failed to reset dataset: %v", err))
		return
	}
	kpis := a.Store.GetOverviewKPIs()
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"message": "Dataset successfully reset to baseline historical data",
		"kpis":    kpis,
	})
}

// GET /api/export/payments
func (a *API) HandleExportPayments(w http.ResponseWriter, r *http.Request) {
	preds := a.Store.GetPaymentPredictionsForExport()
	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", "attachment; filename=\"payment_predictions.csv\"")
	if err := exporter.StreamPaymentPredictions(w, preds); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to stream CSV")
		return
	}
}

// GET /api/export/disputes
func (a *API) HandleExportDisputes(w http.ResponseWriter, r *http.Request) {
	preds := a.Store.GetDisputePredictionsForExport()
	csvBytes, err := exporter.ExportDisputePredictions(preds)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to generate CSV")
		return
	}
	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", "attachment; filename=\"dispute_predictions.csv\"")
	_, _ = w.Write(csvBytes)
}

// GET /api/export/whatif
func (a *API) HandleExportWhatIf(w http.ResponseWriter, r *http.Request) {
	results := a.Store.GetWhatIfForExport()
	csvBytes, err := exporter.ExportWhatIfResults(results)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to generate CSV")
		return
	}
	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", "attachment; filename=\"whatif_results.csv\"")
	_, _ = w.Write(csvBytes)
}

// GET /api/sample/:filename
func (a *API) HandleSampleFile(w http.ResponseWriter, r *http.Request) {
	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(parts) < 3 {
		writeError(w, http.StatusBadRequest, "Missing filename")
		return
	}
	filename := parts[2]
	allowed := map[string]bool{
		"invoices.csv": true,
		"photos.csv":   true,
		"payments.csv": true,
		"disputes.csv": true,
	}
	if !allowed[filename] {
		writeError(w, http.StatusBadRequest, "Invalid sample file requested")
		return
	}

	targetPath := filepath.Join(a.SampleUploadDir, filename)
	data, err := os.ReadFile(targetPath)
	if err != nil {
		writeError(w, http.StatusNotFound, "Sample file not found")
		return
	}

	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
	_, _ = w.Write(data)
}
