import pandas as pd
from sklearn.preprocessing import LabelEncoder

# Load CSVs
behavioural = pd.read_csv("behavioural_features.csv")
invoices = pd.read_csv("invoices.csv")
labels = pd.read_csv("labels.csv")

# === Merge Datasets ===
# Assuming common key is invoice_id
df = invoices.merge(behavioural, on="invoice_id", how="left")
df = df.merge(labels, on="invoice_id", how="left")

print("Merged shape:", df.shape)

# === Select Required Fields ===
selected_columns = [
    "invoice_id",
    "supplier_id",
    "invoice_date",
    "supplier_avg_amount_90d",
    "payment_terms",
    "supplier_invoice_count_30d",
    "duplicate_invoice_flag",
    "split_invoice_flag",
    "late_night_submission_flag",
    "is_fraud",
    "fraud_type"
]

df = df[selected_columns]

# === Handle Missing Values ===
df.fillna(0, inplace=True)

# === Encode Payment Term (Example: NET30 → 30) ===
def extract_days(term):
    if isinstance(term, str) and "NET" in term:
        return int(term.replace("NET", ""))
    return 0

df["payment_term_days"] = df["payment_terms"].apply(extract_days)
df.drop(columns=["payment_terms"], inplace=True)

# === Encode Fraud Type ===
label_encoder = LabelEncoder()
df["fraud_type_encoded"] = label_encoder.fit_transform(df["fraud_type"])

# Drop original fraud_type if needed
df.drop(columns=["fraud_type"], inplace=True)

# === Drop invoice_id if not needed for training ===
df.drop(columns=["invoice_id"], inplace=True)

# === Save Clean Dataset ===
df.to_csv("final_training_dataset.csv", index=False)

print("✅ Preprocessing complete.")
print(df.head())