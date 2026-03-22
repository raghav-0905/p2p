import pandas as pd
import numpy as np
from sklearn.preprocessing import LabelEncoder

# ================================
# LOAD RAW DATA
# ================================

print("Loading raw data...")

invoices = pd.read_csv("invoices.csv")
behavioural = pd.read_csv("behavioural_features.csv")
labels = pd.read_csv("labels.csv")

print(f"  invoices:    {invoices.shape}")
print(f"  behavioural: {behavioural.shape}")
print(f"  labels:      {labels.shape}")


# ================================
# MERGE (inner join to avoid NaN rows)
# ================================

df = invoices.merge(behavioural, on="invoice_id", how="inner")
df = df.merge(labels[["invoice_id", "is_fraud"]], on="invoice_id", how="inner")

print(f"\nMerged shape: {df.shape}")


# ================================
# DROP LEAKY & IRRELEVANT COLUMNS
# ================================
# split_invoice_flag  → near-perfect proxy for SPLIT fraud (data leakage)
# duplicate_invoice_flag → perfect proxy for DUPLICATE fraud (data leakage)
# currency → single value (ZAR), no information
# image_path → file path, not a feature
# invoice_id → identifier, not a feature

leaky_cols = [
    "split_invoice_flag",
    "duplicate_invoice_flag",
    "invoice_id",
    "currency",
    "image_path",
]

df.drop(columns=[c for c in leaky_cols if c in df.columns], inplace=True)

print(f"After dropping leaky/irrelevant cols: {df.shape}")


# ================================
# DROP UNUSED CATEGORICAL / DATE COLUMNS
# ================================
# payment_terms, invoice_type, invoice_date are not needed
# (their engineered features had < 1% importance)

df.drop(columns=[c for c in ["payment_terms", "invoice_type", "invoice_date"] if c in df.columns], inplace=True)


# ================================
# SUPPLIER-LEVEL AGGREGATED FEATURES
# ================================
# These use the FULL dataset for aggregation.
# In train_model.py we will compute them on train-only to avoid leakage.
# Here we compute them for the full dataset for initial exploration.

supplier_stats = df.groupby("supplier_id").agg(
    supplier_total_invoices=("invoice_amount", "count"),
    supplier_mean_amount=("invoice_amount", "mean"),
    supplier_std_amount=("invoice_amount", "std"),
    supplier_median_amount=("invoice_amount", "median"),
    supplier_max_amount=("invoice_amount", "max"),
).reset_index()

# Fill NaN std (suppliers with 1 invoice)
supplier_stats["supplier_std_amount"] = supplier_stats["supplier_std_amount"].fillna(0)

df = df.merge(supplier_stats, on="supplier_id", how="left")


# ================================
# DEPARTMENT-LEVEL FEATURES
# ================================
# Only dept_mean_amount is needed (for amount_to_dept_avg_ratio)
# dept_total_invoices and dept_mean_amount themselves had < 1% importance
# but we need dept_mean_amount temporarily to compute the ratio

dept_stats = df.groupby("department_id").agg(
    dept_mean_amount=("invoice_amount", "mean"),
).reset_index()

df = df.merge(dept_stats, on="department_id", how="left")


# ================================
# INTERACTION / RATIO FEATURES
# ================================

# How does this invoice compare to its supplier's average?
df["amount_to_supplier_avg_ratio"] = df["invoice_amount"] / (df["supplier_mean_amount"] + 1)

# How many standard deviations from supplier mean?
df["amount_deviation_from_supplier"] = np.where(
    df["supplier_std_amount"] > 0,
    np.abs(df["invoice_amount"] - df["supplier_mean_amount"]) / df["supplier_std_amount"],
    0
)

# Is this a high-amount invoice for this supplier? (above supplier's 90th pct approximation)
df["is_high_amount_for_supplier"] = (
    df["invoice_amount"] > (df["supplier_mean_amount"] + 1.28 * df["supplier_std_amount"])
).astype(int)

# Amount relative to department average
df["amount_to_dept_avg_ratio"] = df["invoice_amount"] / (df["dept_mean_amount"] + 1)

# Log-transform of amount (reduce skewness)
df["log_invoice_amount"] = np.log1p(df["invoice_amount"])


# ================================
# DROP ID COLUMNS (not useful for training)
# ================================

df.drop(columns=["supplier_id", "department_id"], inplace=True)


# ================================
# KEEP ONLY FEATURES WITH >= 1% IMPORTANCE
# ================================

IMPORTANT_FEATURES = [
    "amount_to_supplier_avg_ratio",     # 27.01%
    "is_high_amount_for_supplier",      # 11.77%
    "amount_deviation_from_supplier",   # 10.14%
    "log_invoice_amount",               #  9.34%
    "invoice_amount",                   #  5.84%
    "amount_to_dept_avg_ratio",         #  4.45%
    "supplier_std_amount",              #  3.53%
    "supplier_mean_amount",             #  3.49%
    "supplier_median_amount",           #  3.41%
    "supplier_max_amount",              #  3.13%
    "supplier_total_invoices",          #  2.29%
    "supplier_avg_amount_90d",          #  1.98%
    "supplier_invoice_count_30d",       #  1.40%
    "late_night_submission_flag",       #  1.37%
]

TARGET = "is_fraud"

keep_cols = [c for c in IMPORTANT_FEATURES if c in df.columns] + [TARGET]
df = df[keep_cols]

print(f"\nKept {len(keep_cols) - 1} features (>= 1% importance) + target")


# ================================
# HANDLE MISSING VALUES
# ================================

df.fillna(0, inplace=True)


# ================================
# SAVE
# ================================

# Save to a new file to preserve the original
df.to_csv("final_training_dataset_v2.csv", index=False)

print(f"\n[OK] Preprocessing complete.")
print(f"Final shape: {df.shape}")
print(f"Columns ({len(df.columns)}):")
for c in df.columns:
    print(f"  - {c}")
print(f"\nTarget distribution:")
print(df["is_fraud"].value_counts())
print(f"\nSaved to: final_training_dataset_v2.csv")