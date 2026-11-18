package parser

import (
	"encoding/csv"
	"fmt"
	"io"
	"strconv"
	"strings"

	"disputeshield/pkg/models"
)

func parseBool(s string) bool {
	s = strings.TrimSpace(strings.ToLower(s))
	return s == "true" || s == "1" || s == "t" || s == "yes"
}

func parseFloat(s string) float64 {
	s = strings.TrimSpace(s)
	v, _ := strconv.ParseFloat(s, 64)
	return v
}

func parseInt(s string) int {
	s = strings.TrimSpace(s)
	v, _ := strconv.Atoi(s)
	return v
}

func makeHeaderMap(header []string) map[string]int {
	m := make(map[string]int)
	for i, h := range header {
		m[strings.TrimSpace(strings.ToLower(h))] = i
	}
	return m
}

func getCol(record []string, colMap map[string]int, key string) string {
	if idx, ok := colMap[key]; ok && idx < len(record) {
		return strings.TrimSpace(record[idx])
	}
	return ""
}

// ParseTeams parses teams.csv
func ParseTeams(r io.Reader) ([]*models.Team, error) {
	reader := csv.NewReader(r)
	header, err := reader.Read()
	if err != nil {
		return nil, fmt.Errorf("reading teams header: %w", err)
	}
	colMap := makeHeaderMap(header)

	var teams []*models.Team
	for {
		record, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, err
		}
		teams = append(teams, &models.Team{
			TeamID:      getCol(record, colMap, "team_id"),
			Profession:  getCol(record, colMap, "profession"),
			State:       getCol(record, colMap, "state"),
			OnboardedOn: getCol(record, colMap, "onboarded_on"),
			TeamSize:    getCol(record, colMap, "team_size"),
		})
	}
	return teams, nil
}

// ParseInvoices parses invoices.csv
func ParseInvoices(r io.Reader) ([]*models.Invoice, error) {
	reader := csv.NewReader(r)
	header, err := reader.Read()
	if err != nil {
		return nil, fmt.Errorf("reading invoices header: %w", err)
	}
	colMap := makeHeaderMap(header)

	var invoices []*models.Invoice
	for {
		record, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, err
		}
		invoices = append(invoices, &models.Invoice{
			InvoiceID:              getCol(record, colMap, "invoice_id"),
			TeamID:                 getCol(record, colMap, "team_id"),
			CustomerID:             getCol(record, colMap, "customer_id"),
			CreatedAt:              getCol(record, colMap, "created_at"),
			JobCompletedAt:         getCol(record, colMap, "job_completed_at"),
			JobType:                getCol(record, colMap, "job_type"),
			AmountUSD:              parseFloat(getCol(record, colMap, "amount_usd")),
			LineItemCount:          parseInt(getCol(record, colMap, "line_item_count")),
			JobDescriptionChars:    parseInt(getCol(record, colMap, "job_description_chars")),
			CustomerAddressPresent: parseBool(getCol(record, colMap, "customer_address_present")),
			CustomerEmailPresent:   parseBool(getCol(record, colMap, "customer_email_present")),
			CustomerPhonePresent:   parseBool(getCol(record, colMap, "customer_phone_present")),
			SignedEstimate:         parseBool(getCol(record, colMap, "signed_estimate")),
			TermsAccepted:          parseBool(getCol(record, colMap, "terms_accepted")),
			TechGPSCheckin:         parseBool(getCol(record, colMap, "tech_gps_checkin")),
			CompletionSignature:    parseBool(getCol(record, colMap, "completion_signature")),
			PhotosBeforeCount:      parseInt(getCol(record, colMap, "photos_before_count")),
			PhotosAfterCount:       parseInt(getCol(record, colMap, "photos_after_count")),
			InvoiceStatus:          getCol(record, colMap, "invoice_status"),
			UpdatedAt:              getCol(record, colMap, "updated_at"),
		})
	}
	return invoices, nil
}

// ParsePhotos parses photos.csv
func ParsePhotos(r io.Reader) ([]*models.Photo, error) {
	reader := csv.NewReader(r)
	header, err := reader.Read()
	if err != nil {
		return nil, fmt.Errorf("reading photos header: %w", err)
	}
	colMap := makeHeaderMap(header)

	var photos []*models.Photo
	for {
		record, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, err
		}
		photos = append(photos, &models.Photo{
			PhotoID:    getCol(record, colMap, "photo_id"),
			InvoiceID:  getCol(record, colMap, "invoice_id"),
			Kind:       getCol(record, colMap, "kind"),
			UploadedAt: getCol(record, colMap, "uploaded_at"),
		})
	}
	return photos, nil
}

// ParsePayments parses payments.csv
func ParsePayments(r io.Reader) ([]*models.Payment, error) {
	reader := csv.NewReader(r)
	header, err := reader.Read()
	if err != nil {
		return nil, fmt.Errorf("reading payments header: %w", err)
	}
	colMap := makeHeaderMap(header)

	var payments []*models.Payment
	for {
		record, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, err
		}
		payments = append(payments, &models.Payment{
			PaymentID:       getCol(record, colMap, "payment_id"),
			InvoiceID:       getCol(record, colMap, "invoice_id"),
			TeamID:          getCol(record, colMap, "team_id"),
			CustomerID:      getCol(record, colMap, "customer_id"),
			CollectedAt:     getCol(record, colMap, "collected_at"),
			AmountUSD:       parseFloat(getCol(record, colMap, "amount_usd")),
			TipUSD:          parseFloat(getCol(record, colMap, "tip_usd")),
			PaymentMethod:   getCol(record, colMap, "payment_method"),
			CardFingerprint: getCol(record, colMap, "card_fingerprint"),
			CardCountry:     getCol(record, colMap, "card_country"),
			CardType:        getCol(record, colMap, "card_type"),
			AVSResult:       getCol(record, colMap, "avs_result"),
			CVVResult:       getCol(record, colMap, "cvv_result"),
			ReceiptSent:     parseBool(getCol(record, colMap, "receipt_sent")),
		})
	}
	return payments, nil
}

// ParseDisputes parses disputes.csv
func ParseDisputes(r io.Reader) ([]*models.Dispute, error) {
	reader := csv.NewReader(r)
	header, err := reader.Read()
	if err != nil {
		return nil, fmt.Errorf("reading disputes header: %w", err)
	}
	colMap := makeHeaderMap(header)

	var disputes []*models.Dispute
	for {
		record, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, err
		}
		disputes = append(disputes, &models.Dispute{
			DisputeID:         getCol(record, colMap, "dispute_id"),
			PaymentID:         getCol(record, colMap, "payment_id"),
			InvoiceID:         getCol(record, colMap, "invoice_id"),
			TeamID:            getCol(record, colMap, "team_id"),
			OpenedAt:          getCol(record, colMap, "opened_at"),
			Reason:            getCol(record, colMap, "reason"),
			AmountUSD:         parseFloat(getCol(record, colMap, "amount_usd")),
			MerchantResponded: parseBool(getCol(record, colMap, "merchant_responded")),
			EvidenceSubmitted: getCol(record, colMap, "evidence_submitted"),
			Outcome:           getCol(record, colMap, "outcome"),
			ClosedAt:          getCol(record, colMap, "closed_at"),
		})
	}
	return disputes, nil
}
