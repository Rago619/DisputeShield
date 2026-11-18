package scoring

import (
	_ "embed"
	"encoding/json"
	"fmt"
	"math"
	"strings"

	"disputeshield/pkg/models"
)

//go:embed model_weights.json
var defaultModelWeightsJSON []byte

type ModelWeightsConfig struct {
	ModelVersion   string  `json:"model_version"`
	DisputeFeeUSD  float64 `json:"dispute_fee_usd"`
	FightingCostUSD float64 `json:"fighting_cost_usd"`
	RiskThresholds struct {
		LowMax    float64 `json:"low_max"`
		MediumMax float64 `json:"medium_max"`
	} `json:"risk_thresholds"`
	Weights struct {
		Invoice    map[string]float64 `json:"invoice"`
		Payment    map[string]float64 `json:"payment"`
		Risk       map[string]float64 `json:"risk"`
		DisputeWin map[string]float64 `json:"dispute_win"`
	} `json:"weights"`
}

type Engine struct {
	Config ModelWeightsConfig
}

func NewEngine() (*Engine, error) {
	var cfg ModelWeightsConfig
	if err := json.Unmarshal(defaultModelWeightsJSON, &cfg); err != nil {
		return nil, fmt.Errorf("failed to parse embedded model weights: %w", err)
	}
	if cfg.DisputeFeeUSD == 0 {
		cfg.DisputeFeeUSD = 25.0
	}
	if cfg.FightingCostUSD == 0 {
		cfg.FightingCostUSD = 15.0
	}
	if cfg.RiskThresholds.LowMax == 0 {
		cfg.RiskThresholds.LowMax = 0.025
		cfg.RiskThresholds.MediumMax = 0.065
	}
	return &Engine{Config: cfg}, nil
}

func sigmoid(z float64) float64 {
	if z < -20.0 {
		return 0.000001
	}
	if z > 20.0 {
		return 0.999999
	}
	return 1.0 / (1.0 + math.Exp(-z))
}

func round4(val float64) float64 {
	return math.Round(val*10000) / 10000
}

func round2(val float64) float64 {
	return math.Round(val*100) / 100
}

// ScorePayment calculates predictions for Moment 1 (invoice) and Moment 2 (payment).
func (e *Engine) ScorePayment(inv *models.Invoice, pmt *models.Payment) models.PaymentPrediction {
	pred := models.PaymentPrediction{
		PaymentID:   pmt.PaymentID,
		TeamID:      pmt.TeamID,
		AmountUSD:   pmt.AmountUSD,
		PaymentMethod: pmt.PaymentMethod,
		CollectedAt: pmt.CollectedAt,
	}

	// 1. Invoice Win Probability (Moment 1: Pre-payment evidence)
	wInv := e.Config.Weights.Invoice
	zInv := wInv["bias"]
	if inv.CustomerAddressPresent {
		zInv += wInv["addr_present"]
	}
	if inv.SignedEstimate {
		zInv += wInv["signed_estimate"]
	}
	if inv.TermsAccepted {
		zInv += wInv["terms_accepted"]
	}
	if inv.TechGPSCheckin {
		zInv += wInv["gps_checkin"]
	}
	if inv.CompletionSignature {
		zInv += wInv["completion_signature"]
	}
	if inv.PhotosBeforeCount > 0 {
		zInv += wInv["photos_before"] * math.Min(1.0, float64(inv.PhotosBeforeCount)/2.0)
	}
	pInvLog := sigmoid(zInv)

	// Heuristic baseline check
	hInv := 0.20
	if inv.CustomerAddressPresent {
		hInv += 0.15
	}
	if inv.SignedEstimate {
		hInv += 0.20
	}
	if inv.TermsAccepted {
		hInv += 0.10
	}
	if inv.TechGPSCheckin {
		hInv += 0.15
	}
	if inv.CompletionSignature {
		hInv += 0.25
	}
	if inv.PhotosBeforeCount > 0 {
		hInv += 0.05
	}
	hInv = math.Min(0.98, math.Max(0.05, hInv))
	pred.InvoiceWinProb = round4(0.40*hInv + 0.60*pInvLog)

	// 2. Payment Win Probability (Moment 2: Post-collection evidence)
	wPmt := e.Config.Weights.Payment
	zPmt := wPmt["bias"]
	if inv.CustomerAddressPresent {
		zPmt += wPmt["addr_present"]
	}
	if inv.SignedEstimate {
		zPmt += wPmt["signed_estimate"]
	}
	if inv.CompletionSignature {
		zPmt += wPmt["completion_signature"]
	}
	if pmt.PaymentMethod == "tap" || pmt.PaymentMethod == "chip" {
		zPmt += wPmt["is_card_present"]
	} else if pmt.PaymentMethod == "keyed" {
		zPmt += wPmt["is_keyed"]
		avs := strings.ToLower(pmt.AVSResult)
		if avs == "match" || avs == "partial" || avs == "m" || avs == "a" || avs == "z" {
			zPmt += wPmt["avs_match"]
		}
		cvv := strings.ToLower(pmt.CVVResult)
		if cvv == "match" || cvv == "m" {
			zPmt += wPmt["cvv_match"]
		}
	}
	if pmt.ReceiptSent {
		zPmt += wPmt["receipt_sent"]
	}
	if inv.PhotosAfterCount > 0 {
		zPmt += wPmt["photos_after"] * math.Min(1.0, float64(inv.PhotosAfterCount)/2.0)
	}
	pPmtLog := sigmoid(zPmt)

	hPmt := pred.InvoiceWinProb
	if pmt.PaymentMethod == "tap" || pmt.PaymentMethod == "chip" {
		hPmt += 0.10
	} else if pmt.PaymentMethod == "keyed" {
		hPmt -= 0.15
		if pmt.AVSResult == "M" || pmt.AVSResult == "A" || pmt.AVSResult == "Z" {
			hPmt += 0.05
		}
		if pmt.CVVResult == "M" {
			hPmt += 0.05
		}
	}
	if pmt.ReceiptSent {
		hPmt += 0.05
	}
	if inv.PhotosAfterCount > 0 {
		hPmt += 0.05
	}
	hPmt = math.Min(0.98, math.Max(0.05, hPmt))
	pred.PaymentWinProb = round4(0.40*hPmt + 0.60*pPmtLog)

	// 3. Dispute Risk Score & Risk Tier
	wRisk := e.Config.Weights.Risk
	zRisk := wRisk["bias"]
	if pmt.PaymentMethod == "keyed" {
		zRisk += wRisk["is_keyed"]
		if pmt.AVSResult != "M" && pmt.AVSResult != "A" && pmt.AVSResult != "Z" {
			zRisk += wRisk["avs_mismatch"]
		}
		if pmt.CVVResult != "M" {
			zRisk += wRisk["cvv_mismatch"]
		}
	}
	if !inv.CompletionSignature {
		zRisk += wRisk["no_signature"]
	}
	if !inv.CustomerAddressPresent {
		zRisk += wRisk["no_address"]
	}
	if pmt.AmountUSD > 1500.0 {
		zRisk += wRisk["high_amount"]
	}
	pRiskLog := sigmoid(zRisk)

	hRisk := 0.012
	if pmt.PaymentMethod == "keyed" {
		hRisk *= 3.0
		avs := strings.ToLower(pmt.AVSResult)
		if avs != "match" && avs != "partial" && avs != "m" && avs != "a" && avs != "z" {
			hRisk *= 2.0
		}
		cvv := strings.ToLower(pmt.CVVResult)
		if cvv != "match" && cvv != "m" {
			hRisk *= 1.8
		}
	}
	if !inv.CompletionSignature {
		hRisk *= 1.6
	}
	if !inv.CustomerAddressPresent {
		hRisk *= 1.7
	}
	if pmt.AmountUSD > 1500.0 {
		hRisk *= 1.6
	}
	hRisk = math.Min(0.95, math.Max(0.001, hRisk))
	riskScore := round4(0.45*hRisk + 0.55*pRiskLog)
	pred.DisputeRiskScore = riskScore

	// Risk Tier
	if riskScore <= e.Config.RiskThresholds.LowMax {
		pred.DisputeRiskTier = "low"
	} else if riskScore <= e.Config.RiskThresholds.MediumMax {
		pred.DisputeRiskTier = "medium"
	} else {
		pred.DisputeRiskTier = "high"
	}

	// 4. Expected Loss USD: P(dispute) * (Amount + $25 Fee) * (1 - PaymentWinProb)
	totalPotentialLoss := pmt.AmountUSD + e.Config.DisputeFeeUSD
	pred.ExpectedLossUSD = round2(riskScore * totalPotentialLoss * (1.0 - pred.PaymentWinProb))

	// 5. Recommended Action for the team
	if !inv.CustomerAddressPresent {
		pred.RecommendedAction = "Action Required: Collect and attach customer service address to invoice"
	} else if !inv.CompletionSignature {
		pred.RecommendedAction = "Important: Capture customer digital completion signature"
	} else if pmt.PaymentMethod == "keyed" && (pmt.AVSResult != "M" && pmt.AVSResult != "A") {
		pred.RecommendedAction = "High Risk Keyed Card: Verify customer billing zip & obtain signed work order"
	} else if !inv.SignedEstimate && pmt.AmountUSD > 500 {
		pred.RecommendedAction = "Recommendation: Send digital estimate approval before high-value jobs"
	} else if inv.PhotosAfterCount == 0 {
		pred.RecommendedAction = "Best Practice: Upload completed job photos to guarantee defensibility"
	} else if !pmt.ReceiptSent {
		pred.RecommendedAction = "Send detailed itemized receipt via SMS/email immediately"
	} else {
		pred.RecommendedAction = "Optimal Paperwork: Strong documentation, low dispute vulnerability"
	}

	return pred
}

// ScoreDispute calculates predictions for Moment 3 (dispute received).
func (e *Engine) ScoreDispute(inv *models.Invoice, pmt *models.Payment, disp *models.Dispute) models.DisputePrediction {
	pred := models.DisputePrediction{
		DisputeID:         disp.DisputeID,
		PaymentID:         disp.PaymentID,
		TeamID:            disp.TeamID,
		OpenedAt:          disp.OpenedAt,
		Reason:            disp.Reason,
		AmountUSD:         disp.AmountUSD,
		MerchantResponded: disp.MerchantResponded,
		EvidenceSubmitted: disp.EvidenceSubmitted,
		ActualOutcome:     disp.Outcome,
	}

	// If merchant failed to respond, outcome is an automatic loss
	if !disp.MerchantResponded {
		pred.WinProb = 0.0
		pred.Recommendation = "accept"
		return pred
	}

	wDisp := e.Config.Weights.DisputeWin
	zDisp := wDisp["bias"]

	hasSig := false
	hasGPS := false
	hasPhoto := false
	hasEst := false

	if disp.EvidenceSubmitted != "" {
		hasSig = containsSubstring(disp.EvidenceSubmitted, "completion_signature")
		if hasSig {
			zDisp += wDisp["has_signature"]
		}

		hasGPS = containsSubstring(disp.EvidenceSubmitted, "gps_checkin") || containsSubstring(disp.EvidenceSubmitted, "tech_gps_checkin")
		if hasGPS {
			zDisp += wDisp["has_gps"]
		}

		hasPhoto = containsSubstring(disp.EvidenceSubmitted, "job_photos") || containsSubstring(disp.EvidenceSubmitted, "photos_after") || containsSubstring(disp.EvidenceSubmitted, "photos_added_after_dispute")
		if hasPhoto {
			zDisp += wDisp["has_photo"]
		}

		hasEst = containsSubstring(disp.EvidenceSubmitted, "signed_estimate")
		if hasEst {
			zDisp += wDisp["has_estimate"]
		}
	}

	isCardPresent := pmt != nil && (pmt.PaymentMethod == "tap" || pmt.PaymentMethod == "chip")
	isKeyed := pmt != nil && pmt.PaymentMethod == "keyed"

	if disp.Reason == "fraud" {
		if isCardPresent {
			zDisp += wDisp["is_card_present_fraud"]
		} else if isKeyed {
			zDisp += wDisp["is_keyed_fraud"]
		}
	}

	pDispLog := sigmoid(zDisp)

	// Heuristic Canon check
	hDisp := 0.15
	if hasSig {
		hDisp += 0.30
	}
	if hasGPS {
		hDisp += 0.15
	}
	if hasPhoto {
		hDisp += 0.15
	}
	if hasEst {
		hDisp += 0.15
	}
	if disp.Reason == "fraud" {
		if isCardPresent {
			hDisp += 0.15
		} else if isKeyed {
			hDisp -= 0.10
		}
	}
	hDisp = math.Min(0.96, math.Max(0.04, hDisp))

	winProb := round4(0.40*hDisp + 0.60*pDispLog)
	pred.WinProb = winProb

	// Economic decision rule:
	// Expected payoff of fighting = WinProb * (Amount + $25 Fee) - $15 Fighting Cost
	expectedFightValue := winProb*(disp.AmountUSD+e.Config.DisputeFeeUSD) - e.Config.FightingCostUSD

	if expectedFightValue > 0 && winProb >= 0.25 {
		pred.Recommendation = "fight"
	} else {
		pred.Recommendation = "accept"
	}

	return pred
}

func containsSubstring(s, sub string) bool {
	return len(s) >= len(sub) && (s == sub || stringContains(s, sub))
}

func stringContains(s, substr string) bool {
	for i := 0; i+len(substr) <= len(s); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
