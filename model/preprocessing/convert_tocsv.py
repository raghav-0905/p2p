
import pandas as pd

# === File Paths ===
behavioural_path = "behavioural_features.parquet"
invoices_path = "invoices.parquet"
labels_path = "labels.parquet"

# === Load Parquet Files ===
behavioural_df = pd.read_parquet(behavioural_path, engine="pyarrow")
invoices_df = pd.read_parquet(invoices_path, engine="pyarrow")
labels_df = pd.read_parquet(labels_path, engine="pyarrow")

# === Save as CSV ===
behavioural_df.to_csv("behavioural_features.csv", index=False)
invoices_df.to_csv("invoices.csv", index=False)
labels_df.to_csv("labels.csv", index=False)

print("✅ Conversion complete!")
print("Behavioural shape:", behavioural_df.shape)
print("Invoices shape:", invoices_df.shape)
print("Labels shape:", labels_df.shape)