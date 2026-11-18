package models

// Team represents a field service business using TestPay.
type Team struct {
	TeamID      string `json:"team_id"`
	Profession  string `json:"profession"`
	State       string `json:"state"`
	OnboardedOn string `json:"onboarded_on"`
	TeamSize    string `json:"team_size"`
}

// Invoice represents a field service job billing record.
type Invoice struct {
	InvoiceID              string  `json:"invoice_id"`
	TeamID                 string  `json:"team_id"`
	AmountUSD              float64 `json:"amount_usd"`
	CustomerAddressPresent bool    `json:"customer_address_present"`
	SignedEstimate         bool    `json:"signed_estimate"`
	TermsAccepted          bool    `json:"terms_accepted"`
	TechGPSCheckin         bool    `json:"tech_gps_checkin"`
	CompletionSignature    bool    `json:"completion_signature"`
	PhotosBeforeCount      int     `json:"photos_before_count"`
	PhotosAfterCount       int     `json:"photos_after_count"`
}

// Photo represents a photo captured before or after work.
type Photo struct {
	PhotoID    string `json:"photo_id"`
	InvoiceID  string `json:"invoice_id"`
	Kind       string `json:"kind"` // "before" or "after"
	UploadedAt string `json:"uploaded_at"`
}

// Payment represents a settled customer charge.
type Payment struct {
	PaymentID     string  `json:"payment_id"`
	InvoiceID     string  `json:"invoice_id"`
	TeamID        string  `json:"team_id"`
	CollectedAt   string  `json:"collected_at"`
	AmountUSD     float64 `json:"amount_usd"`
	PaymentMethod string  `json:"payment_method"` // tap, chip, keyed, ach, bnpl
	AVSResult     string  `json:"avs_result"`
	CVVResult     string  `json:"cvv_result"`
	ReceiptSent   bool    `json:"receipt_sent"`
}

// Dispute represents a bank chargeback initiated by customer or issuing bank.
type Dispute struct {
	DisputeID         string  `json:"dispute_id"`
	PaymentID         string  `json:"payment_id"`
	InvoiceID         string  `json:"invoice_id"`
	TeamID            string  `json:"team_id"`
	OpenedAt          string  `json:"opened_at"`
	Reason            string  `json:"reason"` // fraud, service_not_provided, not_as_described, duplicate, credit_not_processed
	AmountUSD         float64 `json:"amount_usd"`
	MerchantResponded bool    `json:"merchant_responded"`
	EvidenceSubmitted string  `json:"evidence_submitted"` // semicolon separated
	Outcome           string  `json:"outcome"`            // won, lost, withdrawn, open
	ClosedAt          string  `json:"closed_at"`
}

// PaymentPrediction represents the model prediction for a payment.
// Strictly conforms to payment_predictions.csv export schema.
type PaymentPrediction struct {
	PaymentID         string  `json:"payment_id"`
	InvoiceWinProb    float64 `json:"invoice_win_prob"`    // 0 to 1
	PaymentWinProb    float64 `json:"payment_win_prob"`    // 0 to 1
	DisputeRiskTier   string  `json:"dispute_risk_tier"`   // "low", "medium", "high"
	DisputeRiskScore  float64 `json:"dispute_risk_score"`  // Probability of dispute 0 to 1
	ExpectedLossUSD   float64 `json:"expected_loss_usd"`   // Dollars at risk
	RecommendedAction string  `json:"recommended_action"`  // Actionable step for team
	AmountUSD         float64 `json:"amount_usd"`
	TeamID            string  `json:"team_id"`
	PaymentMethod     string  `json:"payment_method"`
	CollectedAt       string  `json:"collected_at"`
}

// DisputePrediction represents the model prediction for a dispute.
// Strictly conforms to dispute_predictions.csv export schema.
type DisputePrediction struct {
	DisputeID         string  `json:"dispute_id"`
	WinProb           float64 `json:"win_prob"`        // 0 to 1
	Recommendation    string  `json:"recommendation"`  // "fight" or "accept"
	Reason            string  `json:"reason"`
	AmountUSD         float64 `json:"amount_usd"`
	PaymentID         string  `json:"payment_id"`
	TeamID            string  `json:"team_id"`
	OpenedAt          string  `json:"opened_at"`
	MerchantResponded bool    `json:"merchant_responded"`
	EvidenceSubmitted string  `json:"evidence_submitted"`
	ActualOutcome     string  `json:"actual_outcome,omitempty"`
}

// WhatIfResult represents the simulated effect of a business policy.
// Strictly conforms to whatif_results.csv export schema.
type WhatIfResult struct {
	Policy          string  `json:"policy"`           // Short name, e.g. address_mandatory
	Metric          string  `json:"metric"`           // disputes, disputes_lost, or usd_lost
	EstimatedChange float64 `json:"estimated_change"` // Change over period (negative means fewer)
	Low             float64 `json:"low"`              // 95% Confidence Interval lower bound
	High            float64 `json:"high"`             // 95% Confidence Interval upper bound
}

// PolicySummary represents human-readable details and business trade-offs of a policy.
type PolicySummary struct {
	PolicyID            string         `json:"policy_id"`
	PolicyName          string         `json:"policy_name"`
	Description         string         `json:"description"`
	Assumptions         string         `json:"assumptions"`
	SideEffectsTradeoff string         `json:"side_effects_tradeoff"`
	ConfidenceRationale string         `json:"confidence_rationale"`
	Metrics             []WhatIfResult `json:"metrics"`
}

// TeamSummary encapsulates metrics and gap analysis for a specific business team.
type TeamSummary struct {
	TeamID             string   `json:"team_id"`
	Profession         string   `json:"profession"`
	State              string   `json:"state"`
	TeamSize           string   `json:"team_size"`
	PaymentCount       int      `json:"payment_count"`
	TotalVolumeUSD     float64  `json:"total_volume_usd"`
	DisputeCount       int      `json:"dispute_count"`
	DisputeRate        float64  `json:"dispute_rate"`
	WinRate            float64  `json:"win_rate"`
	TotalDollarsLost   float64  `json:"total_dollars_lost"`
	AddressPresentPct  float64  `json:"address_present_pct"`
	CompletionSigPct   float64  `json:"completion_sig_pct"`
	SignedEstimatePct  float64  `json:"signed_estimate_pct"`
	TechGPSCheckinPct  float64  `json:"tech_gps_checkin_pct"`
	KeyedMethodPct     float64  `json:"keyed_method_pct"`
	MainGaps           []string `json:"main_gaps"`
}

// DisputeReasonSummary aggregates dispute statistics by dispute reason.
type DisputeReasonSummary struct {
	Reason               string  `json:"reason"`
	DisputeCount         int     `json:"dispute_count"`
	TotalAmountUSD       float64 `json:"total_amount_usd"`
	WinRate              float64 `json:"win_rate"`
	DollarsLostUSD       float64 `json:"dollars_lost_usd"`
	MerchantRespondedPct float64 `json:"merchant_responded_pct"`
}

// OverviewKPIs holds top-level dashboard metrics.
type OverviewKPIs struct {
	TotalPayments        int     `json:"total_payments"`
	TotalVolumeUSD       float64 `json:"total_volume_usd"`
	TotalDisputes        int     `json:"total_disputes"`
	OverallDisputeRate   float64 `json:"overall_dispute_rate"`
	OverallWinRate       float64 `json:"overall_win_rate"`
	TotalExpectedLossUSD float64 `json:"total_expected_loss_usd"`
	TotalActualLossUSD   float64 `json:"total_actual_loss_usd"`
	IsCustomData         bool    `json:"is_custom_data"`
	DataSourceName       string  `json:"data_source_name"`
	LastUpdated          string  `json:"last_updated"`
}
