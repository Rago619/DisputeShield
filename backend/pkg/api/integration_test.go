package api_test

import (
	"bytes"
	"encoding/json"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"disputeshield/pkg/api"
	"disputeshield/pkg/models"
	"disputeshield/pkg/scoring"
	"disputeshield/pkg/store"
)

func TestFullAPIIntegration(t *testing.T) {
	historicalDir := filepath.Join("..", "..", "..", "data", "historical")
	sampleDir := filepath.Join("..", "..", "..", "data", "sample_upload")

	engine, err := scoring.NewEngine()
	if err != nil {
		t.Fatalf("Scoring engine: %v", err)
	}

	appStore, err := store.NewStore(historicalDir, engine)
	if err != nil {
		t.Fatalf("Store: %v", err)
	}

	apiHandler := api.NewAPI(appStore, sampleDir)
	distFS := os.DirFS(filepath.Join("..", "..", "..", "frontend", "dist"))
	handler := apiHandler.RegisterRoutes(distFS)

	// Helper function for in-memory HTTP requests without TCP sockets
	serveReq := func(method, target string, body io.Reader, contentType string) *httptest.ResponseRecorder {
		req := httptest.NewRequest(method, target, body)
		if contentType != "" {
			req.Header.Set("Content-Type", contentType)
		}
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		return rec
	}

	// 1. Health check
	rec := serveReq("GET", "/api/health", nil, "")
	if rec.Code != http.StatusOK {
		t.Fatalf("GET /api/health failed with status %d", rec.Code)
	}

	// 2. Overview KPIs
	rec = serveReq("GET", "/api/overview", nil, "")
	if rec.Code != http.StatusOK {
		t.Fatalf("GET /api/overview failed with status %d", rec.Code)
	}
	var kpis models.OverviewKPIs
	if err := json.Unmarshal(rec.Body.Bytes(), &kpis); err != nil {
		t.Fatalf("Unmarshal overview KPIs: %v", err)
	}
	if kpis.TotalPayments == 0 {
		t.Errorf("Expected positive payments, got %d", kpis.TotalPayments)
	}

	// 3. Payments endpoint
	rec = serveReq("GET", "/api/payments?page=1&pageSize=10", nil, "")
	if rec.Code != http.StatusOK {
		t.Fatalf("GET /api/payments failed with status %d", rec.Code)
	}
	var pmtRes struct {
		Total    int                        `json:"total"`
		Payments []models.PaymentPrediction `json:"payments"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &pmtRes); err != nil {
		t.Fatalf("Unmarshal payments: %v", err)
	}
	if len(pmtRes.Payments) != 10 {
		t.Errorf("Expected 10 payments, got %d", len(pmtRes.Payments))
	}

	// 4. Teams endpoint
	rec = serveReq("GET", "/api/teams", nil, "")
	if rec.Code != http.StatusOK {
		t.Fatalf("GET /api/teams failed with status %d", rec.Code)
	}
	var teams []*models.TeamSummary
	if err := json.Unmarshal(rec.Body.Bytes(), &teams); err != nil {
		t.Fatalf("Unmarshal teams: %v", err)
	}
	if len(teams) != 200 {
		t.Errorf("Expected 200 teams, got %d", len(teams))
	}

	// 5. Team detail endpoint
	firstTeamID := teams[0].TeamID
	rec = serveReq("GET", "/api/teams/"+firstTeamID, nil, "")
	if rec.Code != http.StatusOK {
		t.Fatalf("GET /api/teams/%s failed with status %d", firstTeamID, rec.Code)
	}

	// 6. Reasons endpoint
	rec = serveReq("GET", "/api/reasons", nil, "")
	if rec.Code != http.StatusOK {
		t.Fatalf("GET /api/reasons failed with status %d", rec.Code)
	}
	var reasons []models.DisputeReasonSummary
	if err := json.Unmarshal(rec.Body.Bytes(), &reasons); err != nil {
		t.Fatalf("Unmarshal reasons: %v", err)
	}
	if len(reasons) == 0 {
		t.Errorf("Expected dispute reasons, got 0")
	}

	// 7. What-If endpoint
	rec = serveReq("GET", "/api/whatif", nil, "")
	if rec.Code != http.StatusOK {
		t.Fatalf("GET /api/whatif failed with status %d", rec.Code)
	}
	var whatifRes struct {
		Results   []models.WhatIfResult   `json:"results"`
		Summaries []models.PolicySummary `json:"summaries"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &whatifRes); err != nil {
		t.Fatalf("Unmarshal whatif: %v", err)
	}
	if len(whatifRes.Summaries) == 0 {
		t.Errorf("Expected policy summaries, got 0")
	}

	// 8. Test CSV Exports
	for _, exportPath := range []string{"/api/export/payments", "/api/export/disputes", "/api/export/whatif"} {
		rec = serveReq("GET", exportPath, nil, "")
		if rec.Code != http.StatusOK {
			t.Fatalf("GET %s failed with status %d", exportPath, rec.Code)
		}
		if rec.Body.Len() == 0 {
			t.Errorf("Export %s returned empty body", exportPath)
		}
	}

	// 9. Test Frontend SPA serving (index.html fallback)
	rec = serveReq("GET", "/", nil, "")
	if rec.Code != http.StatusOK {
		t.Fatalf("GET / (frontend) failed with status %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "DisputeShield") {
		t.Errorf("Expected 'DisputeShield' in HTML response, got: %s", rec.Body.String()[:100])
	}

	// 10. Test Step 1 Upload Workflow
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	invData, err := os.ReadFile(filepath.Join(sampleDir, "invoices.csv"))
	if err != nil {
		t.Fatalf("Read sample invoices: %v", err)
	}
	partInv, _ := writer.CreateFormFile("invoices", "invoices.csv")
	partInv.Write(invData)

	pmtData, err := os.ReadFile(filepath.Join(sampleDir, "payments.csv"))
	if err != nil {
		t.Fatalf("Read sample payments: %v", err)
	}
	partPmt, _ := writer.CreateFormFile("payments", "payments.csv")
	partPmt.Write(pmtData)

	writer.Close()

	rec = serveReq("POST", "/api/upload/step1", body, writer.FormDataContentType())
	if rec.Code != http.StatusOK {
		t.Fatalf("POST /api/upload/step1 failed with status %d: %s", rec.Code, rec.Body.String())
	}

	// Verify KPIs updated to custom uploaded data
	rec = serveReq("GET", "/api/overview", nil, "")
	_ = json.Unmarshal(rec.Body.Bytes(), &kpis)
	if !kpis.IsCustomData {
		t.Errorf("Expected IsCustomData to be true after upload")
	}

	// 11. Test Reset to Baseline
	rec = serveReq("POST", "/api/reset", nil, "application/json")
	if rec.Code != http.StatusOK {
		t.Fatalf("POST /api/reset failed with status %d", rec.Code)
	}

	rec = serveReq("GET", "/api/overview", nil, "")
	_ = json.Unmarshal(rec.Body.Bytes(), &kpis)
	if kpis.IsCustomData {
		t.Errorf("Expected IsCustomData to be false after reset")
	}
}
