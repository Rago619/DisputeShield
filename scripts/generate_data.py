# DS-ledger: tri-stage v2
"""
DisputeShield Synthetic Data Generator
Generates realistic historical data (Months 1-22: Nov 2024 - Aug 2026) for 200 teams,
and sample upload files (Months 23-24: Sep 2026 - Oct 2026) for evaluation.
"""

import os
import random
import csv
from datetime import datetime, timedelta

# Set seeds for deterministic generation
random.seed(42)

HISTORICAL_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "historical")
SAMPLE_UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "sample_upload")
os.makedirs(HISTORICAL_DIR, exist_ok=True)
os.makedirs(SAMPLE_UPLOAD_DIR, exist_ok=True)

PROFESSIONS = [
    "plumber", "locksmith", "hvac", "electrician", 
    "garage_door", "appliance_repair", "pest_control", "roofing"
]

US_STATES = ["CA", "TX", "FL", "NY", "PA", "IL", "OH", "GA", "NC", "MI", "NJ", "VA", "WA", "AZ", "CO"]

JOB_TYPES = {
    "plumber": ["leak_repair", "pipe_replacement", "drain_cleaning", "water_heater_install"],
    "locksmith": ["emergency_lockout", "lock_rekey", "deadbolt_install", "key_duplication"],
    "hvac": ["ac_repair", "furnace_maintenance", "duct_cleaning", "thermostat_install"],
    "electrician": ["panel_upgrade", "wiring_inspection", "outlet_repair", "lighting_fixture"],
    "garage_door": ["spring_replacement", "opener_repair", "cable_adjustment", "roller_replacement"],
    "appliance_repair": ["refrigerator_fix", "washer_repair", "dryer_heating", "dishwasher_pump"],
    "pest_control": ["termite_treatment", "rodent_exclusion", "bed_bug_heat", "general_spray"],
    "roofing": ["shingle_repair", "leak_patching", "gutter_cleaning", "roof_inspection"]
}

DISPUTE_REASONS = ["fraud", "service_not_provided", "not_as_described", "duplicate", "credit_not_processed"]
REASON_WEIGHTS = [0.45, 0.25, 0.15, 0.08, 0.07]

def random_date(start_date, end_date):
    delta = end_date - start_date
    int_delta = int(delta.total_seconds())
    if int_delta <= 0:
        return start_date
    random_second = random.randint(0, int_delta)
    return start_date + timedelta(seconds=random_second)

def generate_dataset(is_sample_upload=False):
    if not is_sample_upload:
        start_date = datetime(2024, 11, 1, 0, 0, 0)
        end_date = datetime(2026, 8, 31, 23, 59, 59)
        output_dir = HISTORICAL_DIR
        num_teams = 200
        jobs_per_team_range = (15, 35) # ~5,000 total jobs
    else:
        start_date = datetime(2026, 9, 1, 0, 0, 0)
        end_date = datetime(2026, 10, 31, 23, 59, 59)
        output_dir = SAMPLE_UPLOAD_DIR
        num_teams = 200
        jobs_per_team_range = (3, 8) # ~1,000 jobs for upload test

    teams = []
    invoices = []
    photos = []
    payments = []
    disputes = []

    # 1. Teams
    for t_idx in range(1, num_teams + 1):
        team_id = f"tm_{t_idx:04d}"
        prof = random.choice(PROFESSIONS)
        state = random.choice(US_STATES)
        onboarded = start_date - timedelta(days=random.randint(30, 365))
        size = random.choice(["1-2", "3-5", "6-10", "11+"])
        teams.append({
            "team_id": team_id,
            "profession": prof,
            "state": state,
            "onboarded_on": onboarded.strftime("%Y-%m-%d"),
            "team_size": size
        })

    # 2. Invoices, Photos, Payments
    invoice_seq = 1 if not is_sample_upload else 50001
    photo_seq = 1 if not is_sample_upload else 50001
    payment_seq = 1 if not is_sample_upload else 50001
    dispute_seq = 1 if not is_sample_upload else 50001

    customer_pool = [f"cust_{i:05d}" for i in range(1, 2500 if not is_sample_upload else 600)]

    for team in teams:
        team_id = team["team_id"]
        prof = team["profession"]
        n_jobs = random.randint(*jobs_per_team_range)

        for _ in range(n_jobs):
            inv_id = f"inv_{invoice_seq:06d}"
            invoice_seq += 1
            cust_id = random.choice(customer_pool)
            created_at = random_date(start_date, end_date - timedelta(days=2))
            completed_at = created_at + timedelta(hours=random.randint(1, 8), minutes=random.randint(0, 59))
            
            job_type = random.choice(JOB_TYPES[prof])
            amount = round(random.uniform(75.0, 1800.0), 2)
            # High ticket items have different risk profile
            if random.random() < 0.15:
                amount = round(random.uniform(2000.0, 6500.0), 2)

            line_items = max(1, int(amount / random.uniform(80.0, 250.0)))
            desc_chars = random.randint(20, 600)
            
            # Evidence features
            addr_present = random.random() < 0.82
            email_present = random.random() < 0.93
            phone_present = random.random() < 0.96
            signed_estimate = random.random() < (0.75 if amount > 500 else 0.40)
            terms_accepted = random.random() < 0.85
            gps_checkin = random.random() < 0.78
            completion_sig = random.random() < 0.72

            n_before = random.choices([0, 1, 2, 3], weights=[0.25, 0.45, 0.20, 0.10])[0]
            n_after = random.choices([0, 1, 2, 3], weights=[0.20, 0.50, 0.20, 0.10])[0]

            for _ in range(n_before):
                photos.append({
                    "photo_id": f"pht_{photo_seq:07d}",
                    "invoice_id": inv_id,
                    "kind": "before",
                    "uploaded_at": (created_at + timedelta(minutes=random.randint(5, 30))).strftime("%Y-%m-%d %H:%M:%S")
                })
                photo_seq += 1

            for _ in range(n_after):
                photos.append({
                    "photo_id": f"pht_{photo_seq:07d}",
                    "invoice_id": inv_id,
                    "kind": "after",
                    "uploaded_at": (completed_at - timedelta(minutes=random.randint(1, 15))).strftime("%Y-%m-%d %H:%M:%S")
                })
                photo_seq += 1

            invoices.append({
                "invoice_id": inv_id,
                "team_id": team_id,
                "customer_id": cust_id,
                "created_at": created_at.strftime("%Y-%m-%d %H:%M:%S"),
                "job_completed_at": completed_at.strftime("%Y-%m-%d %H:%M:%S"),
                "job_type": job_type,
                "amount_usd": f"{amount:.2f}",
                "line_item_count": line_items,
                "job_description_chars": desc_chars,
                "customer_address_present": "true" if addr_present else "false",
                "customer_email_present": "true" if email_present else "false",
                "customer_phone_present": "true" if phone_present else "false",
                "signed_estimate": "true" if signed_estimate else "false",
                "terms_accepted": "true" if terms_accepted else "false",
                "tech_gps_checkin": "true" if gps_checkin else "false",
                "completion_signature": "true" if completion_sig else "false",
                "photos_before_count": n_before,
                "photos_after_count": n_after,
                "invoice_status": "paid",
                "updated_at": (completed_at + timedelta(hours=1)).strftime("%Y-%m-%d %H:%M:%S")
            })

            # Payment
            pmt_id = f"pmt_{payment_seq:06d}"
            payment_seq += 1
            pmt_method = random.choices(["tap", "chip", "keyed", "ach", "bnpl"], weights=[0.35, 0.40, 0.15, 0.07, 0.03])[0]
            tip = round(random.uniform(5.0, 45.0), 2) if random.random() < 0.35 else 0.0
            
            card_fp = f"fp_{random.randint(1000, 99999):05d}" if pmt_method != "ach" else ""
            card_country = "US" if random.random() < 0.97 else random.choice(["CA", "GB", "MX"])
            card_type = random.choice(["visa", "mastercard", "amex", "discover"]) if pmt_method != "ach" else ""
            
            # AVS / CVV matching
            if pmt_method in ["tap", "chip"]:
                avs = "M" # Full match
                cvv = "M"
            elif pmt_method == "keyed":
                avs = random.choices(["M", "A", "Z", "N", "U"], weights=[0.55, 0.15, 0.10, 0.15, 0.05])[0]
                cvv = random.choices(["M", "N", "P"], weights=[0.80, 0.15, 0.05])[0]
            else:
                avs = ""
                cvv = ""
                
            receipt_sent = random.random() < 0.88
            collected_at = completed_at + timedelta(minutes=random.randint(5, 45))

            payments.append({
                "payment_id": pmt_id,
                "invoice_id": inv_id,
                "team_id": team_id,
                "customer_id": cust_id,
                "collected_at": collected_at.strftime("%Y-%m-%d %H:%M:%S"),
                "amount_usd": f"{amount:.2f}",
                "tip_usd": f"{tip:.2f}",
                "payment_method": pmt_method,
                "card_fingerprint": card_fp,
                "card_country": card_country,
                "card_type": card_type,
                "avs_result": avs,
                "cvv_result": cvv,
                "receipt_sent": "true" if receipt_sent else "false"
            })

            # Dispute probability model
            # Base rate ~1.8%
            p_disp = 0.012
            if pmt_method == "keyed":
                p_disp *= 3.2
            if avs in ["N", "U"]:
                p_disp *= 2.5
            if cvv == "N":
                p_disp *= 2.2
            if not addr_present:
                p_disp *= 2.0
            if not completion_sig:
                p_disp *= 1.6
            if amount > 1500:
                p_disp *= 1.8

            if random.random() < p_disp:
                disp_id = f"dsp_{dispute_seq:06d}"
                dispute_seq += 1
                reason = random.choices(DISPUTE_REASONS, weights=REASON_WEIGHTS)[0]
                opened_at = collected_at + timedelta(days=random.randint(7, 45))
                merchant_responded = random.random() < 0.92

                evidence = []
                if completion_sig and random.random() < 0.95:
                    evidence.append("completion_signature")
                if gps_checkin and random.random() < 0.90:
                    evidence.append("tech_gps_checkin")
                if n_after > 0 and random.random() < 0.85:
                    evidence.append("photos_after")
                if signed_estimate and random.random() < 0.80:
                    evidence.append("signed_estimate")
                if addr_present and random.random() < 0.90:
                    evidence.append("customer_address")
                if receipt_sent and random.random() < 0.85:
                    evidence.append("receipt_sent")
                
                evidence_str = ";".join(evidence)

                # Win probability calculation
                win_score = 0.15 # base rate
                if "completion_signature" in evidence:
                    win_score += 0.30
                if "tech_gps_checkin" in evidence:
                    win_score += 0.15
                if "photos_after" in evidence:
                    win_score += 0.15
                if "signed_estimate" in evidence:
                    win_score += 0.15
                if reason == "fraud" and pmt_method in ["chip", "tap"]:
                    win_score += 0.20 # Liability shift
                elif reason == "fraud" and pmt_method == "keyed":
                    win_score -= 0.15

                win_prob = min(0.95, max(0.05, win_score))

                if not is_sample_upload:
                    if not merchant_responded:
                        outcome = "lost"
                    elif random.random() < 0.05:
                        outcome = "withdrawn"
                    elif random.random() < win_prob:
                        outcome = "won"
                    else:
                        outcome = "lost"
                    closed_at = (opened_at + timedelta(days=random.randint(14, 45))).strftime("%Y-%m-%d %H:%M:%S")
                else:
                    # In sample upload (Months 23-24), outcome and closed_at must NOT be present!
                    outcome = ""
                    closed_at = ""

                disputes.append({
                    "dispute_id": disp_id,
                    "payment_id": pmt_id,
                    "invoice_id": inv_id,
                    "team_id": team_id,
                    "opened_at": opened_at.strftime("%Y-%m-%d %H:%M:%S"),
                    "reason": reason,
                    "amount_usd": f"{amount:.2f}",
                    "merchant_responded": "true" if merchant_responded else "false",
                    "evidence_submitted": evidence_str,
                    "outcome": outcome,
                    "closed_at": closed_at
                })

    # Write files
    def write_csv(filepath, data, fields):
        with open(filepath, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fields)
            writer.writeheader()
            writer.writerows(data)

    if not is_sample_upload:
        write_csv(os.path.join(output_dir, "teams.csv"), teams, 
                  ["team_id", "profession", "state", "onboarded_on", "team_size"])
        
    write_csv(os.path.join(output_dir, "invoices.csv"), invoices, 
              ["invoice_id", "team_id", "customer_id", "created_at", "job_completed_at", 
               "job_type", "amount_usd", "line_item_count", "job_description_chars", 
               "customer_address_present", "customer_email_present", "customer_phone_present", 
               "signed_estimate", "terms_accepted", "tech_gps_checkin", "completion_signature", 
               "photos_before_count", "photos_after_count", "invoice_status", "updated_at"])
    
    write_csv(os.path.join(output_dir, "photos.csv"), photos, 
              ["photo_id", "invoice_id", "kind", "uploaded_at"])
    
    write_csv(os.path.join(output_dir, "payments.csv"), payments, 
              ["payment_id", "invoice_id", "team_id", "customer_id", "collected_at", 
               "amount_usd", "tip_usd", "payment_method", "card_fingerprint", "card_country", 
               "card_type", "avs_result", "cvv_result", "receipt_sent"])
    
    # If sample upload, remove outcome and closed_at per brief requirements
    if is_sample_upload:
        sample_disputes = []
        for d in disputes:
            d_copy = dict(d)
            del d_copy["outcome"]
            del d_copy["closed_at"]
            sample_disputes.append(d_copy)
        write_csv(os.path.join(output_dir, "disputes.csv"), sample_disputes, 
                  ["dispute_id", "payment_id", "invoice_id", "team_id", "opened_at", 
                   "reason", "amount_usd", "merchant_responded", "evidence_submitted"])
    else:
        write_csv(os.path.join(output_dir, "disputes.csv"), disputes, 
                  ["dispute_id", "payment_id", "invoice_id", "team_id", "opened_at", 
                   "reason", "amount_usd", "merchant_responded", "evidence_submitted", 
                   "outcome", "closed_at"])

    print(f"Generated {output_dir}: {len(invoices)} invoices, {len(payments)} payments, {len(disputes)} disputes.")

if __name__ == "__main__":
    print("Generating Historical Data (Months 1-22)...")
    generate_dataset(is_sample_upload=False)
    print("Generating Sample Upload Data (Months 23-24)...")
    generate_dataset(is_sample_upload=True)
    print("Data generation complete.")
