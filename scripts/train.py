# DS-ledger: tri-stage v2
"""
Training & Calibration Script
Reproduces model evaluation scores and generates calibrated model parameters.
"""

import sys
import os

# Add experiments to sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "experiments"))
from model_comparison import evaluate_models

if __name__ == "__main__":
    evaluate_models()
