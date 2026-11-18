package exporter

import (
	"bytes"
	"encoding/csv"
	"fmt"
	"io"

	"disputeshield/pkg/models"
)

// StreamPaymentPredictions streams payment_predictions.csv directly to w to avoid in-memory buffering.
func StreamPaymentPredictions(out io.Writer, preds []models.PaymentPrediction) error {
	w := csv.NewWriter(out)
	header := []string{
		"payment_id",
		"invoice_win_prob",
		"payment_win_prob",
		"dispute_risk_tier",
		"dispute_risk_score",
		"expected_loss_usd",
	}
	if err := w.Write(header); err != nil {
		return err
	}

	for _, p := range preds {
		record := []string{
			p.PaymentID,
			fmt.Sprintf("%.4f", p.InvoiceWinProb),
			fmt.Sprintf("%.4f", p.PaymentWinProb),
			p.DisputeRiskTier,
			fmt.Sprintf("%.4f", p.DisputeRiskScore),
			fmt.Sprintf("%.2f", p.ExpectedLossUSD),
		}
		if err := w.Write(record); err != nil {
			return err
		}
	}
	w.Flush()
	return w.Error()
}

// ExportPaymentPredictions exports payment_predictions.csv
// Columns: payment_id,invoice_win_prob,payment_win_prob,dispute_risk_tier,dispute_risk_score,expected_loss_usd
func ExportPaymentPredictions(preds []models.PaymentPrediction) ([]byte, error) {
	var buf bytes.Buffer
	err := StreamPaymentPredictions(&buf, preds)
	return buf.Bytes(), err
}

// ExportDisputePredictions exports dispute_predictions.csv
// Columns: dispute_id,win_prob,recommendation
func ExportDisputePredictions(preds []models.DisputePrediction) ([]byte, error) {
	var buf bytes.Buffer
	w := csv.NewWriter(&buf)

	header := []string{
		"dispute_id",
		"win_prob",
		"recommendation",
	}
	if err := w.Write(header); err != nil {
		return nil, err
	}

	for _, d := range preds {
		record := []string{
			d.DisputeID,
			fmt.Sprintf("%.4f", d.WinProb),
			d.Recommendation,
		}
		if err := w.Write(record); err != nil {
			return nil, err
		}
	}
	w.Flush()
	return buf.Bytes(), w.Error()
}

// ExportWhatIfResults exports whatif_results.csv
// Columns: policy,metric,estimated_change,low,high
func ExportWhatIfResults(results []models.WhatIfResult) ([]byte, error) {
	var buf bytes.Buffer
	w := csv.NewWriter(&buf)

	header := []string{
		"policy",
		"metric",
		"estimated_change",
		"low",
		"high",
	}
	if err := w.Write(header); err != nil {
		return nil, err
	}

	for _, r := range results {
		record := []string{
			r.Policy,
			r.Metric,
			fmt.Sprintf("%.2f", r.EstimatedChange),
			fmt.Sprintf("%.2f", r.Low),
			fmt.Sprintf("%.2f", r.High),
		}
		if err := w.Write(record); err != nil {
			return nil, err
		}
	}
	w.Flush()
	return buf.Bytes(), w.Error()
}
