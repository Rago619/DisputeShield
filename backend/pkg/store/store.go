package store

import (
	"fmt"
	"math"
	"os"
	"path/filepath"
	"runtime"
	"runtime/debug"
	"sort"
	"strings"
	"sync"
	"time"

	"disputeshield/pkg/models"
	"disputeshield/pkg/parser"
	"disputeshield/pkg/scoring"
	"disputeshield/pkg/simulator"
)

type Store struct {
	mu             sync.RWMutex
	historicalDir  string
	scoringEngine  *scoring.Engine
	simulator      *simulator.Simulator

	teams          map[string]*models.Team
	invoices       map[string]*models.Invoice
	photos         map[string]*models.Photo
	payments       map[string]*models.Payment
	disputes       []*models.Dispute

	paymentPreds   []models.PaymentPrediction
	disputePreds   []models.DisputePrediction
	whatIfResults  []models.WhatIfResult
	policySummaries []models.PolicySummary
	teamSummaries  map[string]*models.TeamSummary
	reasonSummaries []models.DisputeReasonSummary
	kpis           models.OverviewKPIs

	isCustomData   bool
	dataSourceName string
}

func NewStore(historicalDir string, engine *scoring.Engine) (*Store, error) {
	s := &Store{
		historicalDir: historicalDir,
		scoringEngine: engine,
		simulator:     simulator.NewSimulator(),
		teams:         make(map[string]*models.Team),
		invoices:      make(map[string]*models.Invoice),
		photos:        make(map[string]*models.Photo),
		payments:      make(map[string]*models.Payment),
		teamSummaries: make(map[string]*models.TeamSummary),
	}

	if err := s.loadInitialData(); err != nil {
		return nil, fmt.Errorf("loading initial data: %w", err)
	}

	return s, nil
}

func (s *Store) loadInitialData() error {
	// 1. Teams
	teamsPath := filepath.Join(s.historicalDir, "teams.csv")
	if f, err := os.Open(teamsPath); err == nil {
		defer f.Close()
		teamsList, err := parser.ParseTeams(f)
		if err == nil {
			for _, t := range teamsList {
				s.teams[t.TeamID] = t
			}
		}
	}

	// 2. Invoices
	invPath := filepath.Join(s.historicalDir, "invoices.csv")
	fInv, err := os.Open(invPath)
	if err != nil {
		return fmt.Errorf("open invoices: %w", err)
	}
	defer fInv.Close()
	invList, err := parser.ParseInvoices(fInv)
	if err != nil {
		return fmt.Errorf("parse invoices: %w", err)
	}
	for _, inv := range invList {
		s.invoices[inv.InvoiceID] = inv
	}

	// 3. Photos
	// Photos counts are already integrated into invoices.csv (photos_before_count, photos_after_count).
	// To strictly preserve the 512MB RAM ceiling on Render, we do not retain 362k individual photo rows.

	// 4. Payments
	pmtPath := filepath.Join(s.historicalDir, "payments.csv")
	fPmt, err := os.Open(pmtPath)
	if err != nil {
		return fmt.Errorf("open payments: %w", err)
	}
	defer fPmt.Close()
	pmtList, err := parser.ParsePayments(fPmt)
	if err != nil {
		return fmt.Errorf("parse payments: %w", err)
	}
	for _, pmt := range pmtList {
		s.payments[pmt.PaymentID] = pmt
	}

	// 5. Disputes
	dispPath := filepath.Join(s.historicalDir, "disputes.csv")
	if f, err := os.Open(dispPath); err == nil {
		defer f.Close()
		dispList, _ := parser.ParseDisputes(f)
		s.disputes = dispList
	}

	s.isCustomData = false
	s.dataSourceName = "Months 1–22 Baseline (Default)"
	s.recalculateLocked()

	// Release startup allocations immediately back to the OS
	runtime.GC()
	debug.FreeOSMemory()

	return nil
}

// ResetToDefault reloads the baseline data.
func (s *Store) ResetToDefault() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.invoices = make(map[string]*models.Invoice)
	s.photos = make(map[string]*models.Photo)
	s.payments = make(map[string]*models.Payment)
	s.disputes = nil
	s.teamSummaries = make(map[string]*models.TeamSummary)

	return s.loadInitialData()
}

// ReplaceDataStep1 replaces invoices, photos, and payments (Step 1).
func (s *Store) ReplaceDataStep1(invoices []*models.Invoice, photos []*models.Photo, payments []*models.Payment) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.invoices = make(map[string]*models.Invoice)
	for _, inv := range invoices {
		s.invoices[inv.InvoiceID] = inv
	}

	s.photos = make(map[string]*models.Photo)
	for _, p := range photos {
		s.photos[p.PhotoID] = p
	}

	s.payments = make(map[string]*models.Payment)
	for _, pmt := range payments {
		s.payments[pmt.PaymentID] = pmt
	}

	// Clear disputes from previous dataset until Step 2 is uploaded
	s.disputes = nil
	s.isCustomData = true
	s.dataSourceName = "User Uploaded (Step 1 Scored)"
	s.recalculateLocked()
}

// ReplaceDataStep2 adds/replaces disputes (Step 2).
func (s *Store) ReplaceDataStep2(disputes []*models.Dispute) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.disputes = disputes
	s.isCustomData = true
	s.dataSourceName = "User Uploaded (Step 1 & Step 2 Fully Scored)"
	s.recalculateLocked()
}

// recalculateLocked recalibrates all predictions, team summaries, reason summaries, what-if simulations, and KPIs.
func (s *Store) recalculateLocked() {
	nowStr := time.Now().UTC().Format(time.RFC3339)

	// 1. Score Payments
	s.paymentPreds = make([]models.PaymentPrediction, 0, len(s.payments))
	for _, pmt := range s.payments {
		inv := s.invoices[pmt.InvoiceID]
		if inv == nil {
			// Fallback placeholder invoice if missing
			inv = &models.Invoice{
				InvoiceID: pmt.InvoiceID,
				TeamID:    pmt.TeamID,
				AmountUSD: pmt.AmountUSD,
			}
		}
		pred := s.scoringEngine.ScorePayment(inv, pmt)
		s.paymentPreds = append(s.paymentPreds, pred)
	}

	// Sort payment predictions by CollectedAt desc
	sort.Slice(s.paymentPreds, func(i, j int) bool {
		return s.paymentPreds[i].CollectedAt > s.paymentPreds[j].CollectedAt
	})

	// 2. Score Disputes
	s.disputePreds = make([]models.DisputePrediction, 0, len(s.disputes))
	for _, disp := range s.disputes {
		inv := s.invoices[disp.InvoiceID]
		pmt := s.payments[disp.PaymentID]
		pred := s.scoringEngine.ScoreDispute(inv, pmt, disp)
		s.disputePreds = append(s.disputePreds, pred)
	}

	// Sort dispute predictions by OpenedAt desc
	sort.Slice(s.disputePreds, func(i, j int) bool {
		return s.disputePreds[i].OpenedAt > s.disputePreds[j].OpenedAt
	})

	// 3. What-If Simulations
	s.whatIfResults, s.policySummaries = s.simulator.RunSimulations(s.invoices, s.payments, s.disputes)

	// 4. Team Summaries & Documentation Gaps
	s.teamSummaries = make(map[string]*models.TeamSummary)

	type teamAgg struct {
		totVol float64
		nPmt   int
		nKeyed int
		nAddr  int
		nSig   int
		nEst   int
		nGPS   int
	}
	teamStats := make(map[string]*teamAgg, 250)
	for _, pmt := range s.payments {
		st := teamStats[pmt.TeamID]
		if st == nil {
			st = &teamAgg{}
			teamStats[pmt.TeamID] = st
		}
		st.nPmt++
		st.totVol += pmt.AmountUSD
		if pmt.PaymentMethod == "keyed" {
			st.nKeyed++
		}
		if inv := s.invoices[pmt.InvoiceID]; inv != nil {
			if inv.CustomerAddressPresent {
				st.nAddr++
			}
			if inv.CompletionSignature {
				st.nSig++
			}
			if inv.SignedEstimate {
				st.nEst++
			}
			if inv.TechGPSCheckin {
				st.nGPS++
			}
		}
	}

	teamDisputes := make(map[string][]*models.Dispute)
	for _, d := range s.disputes {
		teamDisputes[d.TeamID] = append(teamDisputes[d.TeamID], d)
	}

	allTeamIDs := make(map[string]bool, len(s.teams)+len(teamStats))
	for tID := range s.teams {
		allTeamIDs[tID] = true
	}
	for tID := range teamStats {
		allTeamIDs[tID] = true
	}

	for tID := range allTeamIDs {
		t := s.teams[tID]
		prof := "Field Service"
		state := "US"
		size := "3-5"
		if t != nil {
			prof = t.Profession
			state = t.State
			size = t.TeamSize
		}

		st := teamStats[tID]
		ds := teamDisputes[tID]

		totVol := 0.0
		nPmt := 0
		var addrPct, sigPct, estPct, gpsPct, keyedPct float64
		if st != nil && st.nPmt > 0 {
			totVol = st.totVol
			nPmt = st.nPmt
			addrPct = math.Round(float64(st.nAddr)/float64(nPmt)*1000) / 10
			sigPct = math.Round(float64(st.nSig)/float64(nPmt)*1000) / 10
			estPct = math.Round(float64(st.nEst)/float64(nPmt)*1000) / 10
			gpsPct = math.Round(float64(st.nGPS)/float64(nPmt)*1000) / 10
			keyedPct = math.Round(float64(st.nKeyed)/float64(nPmt)*1000) / 10
		}

		nWon := 0
		totLoss := 0.0
		for _, d := range ds {
			if d.Outcome == "won" {
				nWon++
			} else if d.Outcome == "lost" {
				totLoss += d.AmountUSD + 25.0
			}
		}

		dispRate := 0.0
		if nPmt > 0 {
			dispRate = math.Round(float64(len(ds))/float64(nPmt)*10000) / 100
		}

		winRate := 0.0
		if len(ds) > 0 {
			winRate = math.Round(float64(nWon)/float64(len(ds))*1000) / 10
		}

		// Identify main paperwork gaps
		var gaps []string
		if addrPct < 75.0 && nPmt > 0 {
			gaps = append(gaps, fmt.Sprintf("Missing customer address on %.1f%% of invoices", 100.0-addrPct))
		}
		if sigPct < 70.0 && nPmt > 0 {
			gaps = append(gaps, fmt.Sprintf("No completion signature on %.1f%% of jobs", 100.0-sigPct))
		}
		if keyedPct > 20.0 {
			gaps = append(gaps, fmt.Sprintf("High keyed card usage (%.1f%%) carries high fraud chargeback liability", keyedPct))
		}
		if estPct < 50.0 && nPmt > 0 {
			gaps = append(gaps, fmt.Sprintf("Missing signed estimate on %.1f%% of jobs", 100.0-estPct))
		}
		if len(gaps) == 0 {
			gaps = append(gaps, "Strong documentation hygiene across all jobs")
		}

		s.teamSummaries[tID] = &models.TeamSummary{
			TeamID:            tID,
			Profession:        prof,
			State:             state,
			TeamSize:          size,
			PaymentCount:      nPmt,
			TotalVolumeUSD:    math.Round(totVol*100) / 100,
			DisputeCount:      len(ds),
			DisputeRate:       dispRate,
			WinRate:           winRate,
			TotalDollarsLost:  math.Round(totLoss*100) / 100,
			AddressPresentPct: addrPct,
			CompletionSigPct:  sigPct,
			SignedEstimatePct: estPct,
			TechGPSCheckinPct: gpsPct,
			KeyedMethodPct:    keyedPct,
			MainGaps:          gaps,
		}
	}

	// 5. Dispute Reason Summaries (Across all teams)
	reasonCounts := make(map[string]int)
	reasonAmounts := make(map[string]float64)
	reasonWins := make(map[string]int)
	reasonLossUSD := make(map[string]float64)
	reasonResponded := make(map[string]int)

	for _, d := range s.disputes {
		r := d.Reason
		if r == "" {
			r = "other"
		}
		reasonCounts[r]++
		reasonAmounts[r] += d.AmountUSD
		if d.MerchantResponded {
			reasonResponded[r]++
		}
		if d.Outcome == "won" {
			reasonWins[r]++
		} else if d.Outcome == "lost" {
			reasonLossUSD[r] += d.AmountUSD + 25.0
		}
	}

	s.reasonSummaries = nil
	for r, count := range reasonCounts {
		winRate := 0.0
		if count > 0 {
			winRate = math.Round(float64(reasonWins[r])/float64(count)*1000) / 10
		}
		respRate := 0.0
		if count > 0 {
			respRate = math.Round(float64(reasonResponded[r])/float64(count)*1000) / 10
		}

		s.reasonSummaries = append(s.reasonSummaries, models.DisputeReasonSummary{
			Reason:               r,
			DisputeCount:         count,
			TotalAmountUSD:       math.Round(reasonAmounts[r]*100) / 100,
			WinRate:              winRate,
			DollarsLostUSD:       math.Round(reasonLossUSD[r]*100) / 100,
			MerchantRespondedPct: respRate,
		})
	}
	sort.Slice(s.reasonSummaries, func(i, j int) bool {
		return s.reasonSummaries[i].DisputeCount > s.reasonSummaries[j].DisputeCount
	})

	// 6. Global KPIs
	totPayments := len(s.payments)
	totVol := 0.0
	totExpectedLoss := 0.0
	for _, p := range s.paymentPreds {
		totVol += p.AmountUSD
		totExpectedLoss += p.ExpectedLossUSD
	}

	totDisputes := len(s.disputes)
	totActualLoss := 0.0
	totWins := 0
	for _, d := range s.disputes {
		if d.Outcome == "won" {
			totWins++
		} else if d.Outcome == "lost" {
			totActualLoss += d.AmountUSD + 25.0
		}
	}

	dispRate := 0.0
	if totPayments > 0 {
		dispRate = math.Round(float64(totDisputes)/float64(totPayments)*10000) / 100
	}
	winRate := 0.0
	if totDisputes > 0 {
		winRate = math.Round(float64(totWins)/float64(totDisputes)*1000) / 10
	}

	s.kpis = models.OverviewKPIs{
		TotalPayments:        totPayments,
		TotalVolumeUSD:       math.Round(totVol*100) / 100,
		TotalDisputes:        totDisputes,
		OverallDisputeRate:   dispRate,
		OverallWinRate:       winRate,
		TotalExpectedLossUSD: math.Round(totExpectedLoss*100) / 100,
		TotalActualLossUSD:   math.Round(totActualLoss*100) / 100,
		IsCustomData:         s.isCustomData,
		DataSourceName:       s.dataSourceName,
		LastUpdated:          nowStr,
	}
}

// Queries
func (s *Store) GetOverviewKPIs() models.OverviewKPIs {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.kpis
}

type PaymentsResult struct {
	Total      int                        `json:"total"`
	Page       int                        `json:"page"`
	PageSize   int                        `json:"page_size"`
	TotalPages int                        `json:"total_pages"`
	Payments   []models.PaymentPrediction `json:"payments"`
}

func (s *Store) GetPayments(page, pageSize int, tier, teamID, search string) PaymentsResult {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 200 {
		pageSize = 25
	}

	tier = strings.ToLower(strings.TrimSpace(tier))
	teamID = strings.TrimSpace(teamID)
	search = strings.ToLower(strings.TrimSpace(search))

	var filtered []models.PaymentPrediction
	for _, p := range s.paymentPreds {
		if tier != "" && p.DisputeRiskTier != tier {
			continue
		}
		if teamID != "" && p.TeamID != teamID {
			continue
		}
		if search != "" {
			if !strings.Contains(strings.ToLower(p.PaymentID), search) &&
				!strings.Contains(strings.ToLower(p.TeamID), search) &&
				!strings.Contains(strings.ToLower(p.PaymentMethod), search) {
				continue
			}
		}
		filtered = append(filtered, p)
	}

	total := len(filtered)
	totalPages := (total + pageSize - 1) / pageSize
	if totalPages == 0 {
		totalPages = 1
	}

	start := (page - 1) * pageSize
	if start >= total {
		return PaymentsResult{
			Total:      total,
			Page:       page,
			PageSize:   pageSize,
			TotalPages: totalPages,
			Payments:   []models.PaymentPrediction{},
		}
	}

	end := start + pageSize
	if end > total {
		end = total
	}

	return PaymentsResult{
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
		TotalPages: totalPages,
		Payments:   filtered[start:end],
	}
}

func (s *Store) GetTeams() []*models.TeamSummary {
	s.mu.RLock()
	defer s.mu.RUnlock()

	list := make([]*models.TeamSummary, 0, len(s.teamSummaries))
	for _, ts := range s.teamSummaries {
		list = append(list, ts)
	}

	sort.Slice(list, func(i, j int) bool {
		return list[i].TeamID < list[j].TeamID
	})
	return list
}

func (s *Store) GetTeam(teamID string) (*models.TeamSummary, []models.PaymentPrediction, []models.DisputePrediction) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	ts := s.teamSummaries[teamID]

	var pmts []models.PaymentPrediction
	for _, p := range s.paymentPreds {
		if p.TeamID == teamID {
			pmts = append(pmts, p)
		}
	}

	var ds []models.DisputePrediction
	for _, d := range s.disputePreds {
		if d.TeamID == teamID {
			ds = append(ds, d)
		}
	}

	return ts, pmts, ds
}

func (s *Store) GetDisputeReasons() []models.DisputeReasonSummary {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.reasonSummaries
}

func (s *Store) GetWhatIf() ([]models.WhatIfResult, []models.PolicySummary) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.whatIfResults, s.policySummaries
}

func (s *Store) GetPaymentPredictionsForExport() []models.PaymentPrediction {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.paymentPreds
}

func (s *Store) GetDisputePredictionsForExport() []models.DisputePrediction {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.disputePreds
}

func (s *Store) GetWhatIfForExport() []models.WhatIfResult {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.whatIfResults
}
