package store_test

import (
	"path/filepath"
	"testing"

	"disputeshield/pkg/exporter"
	"disputeshield/pkg/scoring"
	"disputeshield/pkg/store"
)

func TestStoreInitializationAndScoring(t *testing.T) {
	historicalDir := filepath.Join("..", "..", "..", "data", "historical")

	engine, err := scoring.NewEngine()
	if err != nil {
		t.Fatalf("Failed to create scoring engine: %v", err)
	}

	appStore, err := store.NewStore(historicalDir, engine)
	if err != nil {
		t.Fatalf("Failed to initialize store: %v", err)
	}

	kpis := appStore.GetOverviewKPIs()
	if kpis.TotalPayments == 0 {
		t.Errorf("Expected positive payment count, got %d", kpis.TotalPayments)
	}
	if kpis.TotalDisputes == 0 {
		t.Errorf("Expected positive dispute count, got %d", kpis.TotalDisputes)
	}

	// Test Payment Predictions
	pmts := appStore.GetPaymentPredictionsForExport()
	if len(pmts) != kpis.TotalPayments {
		t.Errorf("Mismatch in payment predictions count: expected %d, got %d", kpis.TotalPayments, len(pmts))
	}

	for _, p := range pmts[:50] {
		if p.InvoiceWinProb < 0.0 || p.InvoiceWinProb > 1.0 {
			t.Errorf("Invalid InvoiceWinProb: %f", p.InvoiceWinProb)
		}
		if p.PaymentWinProb < 0.0 || p.PaymentWinProb > 1.0 {
			t.Errorf("Invalid PaymentWinProb: %f", p.PaymentWinProb)
		}
		if p.DisputeRiskTier != "low" && p.DisputeRiskTier != "medium" && p.DisputeRiskTier != "high" {
			t.Errorf("Invalid DisputeRiskTier: %s", p.DisputeRiskTier)
		}
	}

	// Test Dispute Predictions
	disps := appStore.GetDisputePredictionsForExport()
	if len(disps) != kpis.TotalDisputes {
		t.Errorf("Mismatch in dispute predictions count: expected %d, got %d", kpis.TotalDisputes, len(disps))
	}
	for _, d := range disps {
		if d.WinProb < 0.0 || d.WinProb > 1.0 {
			t.Errorf("Invalid WinProb: %f", d.WinProb)
		}
		if d.Recommendation != "fight" && d.Recommendation != "accept" {
			t.Errorf("Invalid Recommendation: %s", d.Recommendation)
		}
	}

	// Test What-If Results
	whatifs := appStore.GetWhatIfForExport()
	if len(whatifs) == 0 {
		t.Errorf("Expected What-If results, got 0")
	}

	// Test CSV Export formats
	pmtCSV, err := exporter.ExportPaymentPredictions(pmts)
	if err != nil || len(pmtCSV) == 0 {
		t.Errorf("Failed to export payment predictions CSV: %v", err)
	}

	dispCSV, err := exporter.ExportDisputePredictions(disps)
	if err != nil || len(dispCSV) == 0 {
		t.Errorf("Failed to export dispute predictions CSV: %v", err)
	}

	whatifCSV, err := exporter.ExportWhatIfResults(whatifs)
	if err != nil || len(whatifCSV) == 0 {
		t.Errorf("Failed to export whatif results CSV: %v", err)
	}
}
