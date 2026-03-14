import pandas as pd
import pickle
import os
import numpy as np

from sklearn.model_selection import train_test_split, StratifiedKFold
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score
from sklearn.preprocessing import LabelEncoder
from xgboost import XGBClassifier


# ================================
# PATHS (CHECK THESE)
# ================================

DATA_PATH = "final_training_dataset.csv"
MODEL_PATH = "../trained_models/xgboost_fraud_model.pkl"


# ================================
# LOAD DATA
# ================================

print("Loading dataset...")

df = pd.read_csv(DATA_PATH)

print("Dataset shape:", df.shape)
print("Columns:", df.columns)


# ================================
# DATE FEATURE ENGINEERING
# ================================

df["invoice_date"] = pd.to_datetime(df["invoice_date"])

df["invoice_month"] = df["invoice_date"].dt.month
df["invoice_day"] = df["invoice_date"].dt.day
df["invoice_weekday"] = df["invoice_date"].dt.weekday

df.drop(columns=["invoice_date"], inplace=True)

# ================================
# TARGET
# ================================

TARGET = "is_fraud"

X = df.drop(columns=[TARGET])
y = df[TARGET]


# ================================
# HANDLE FRAUD IMBALANCE
# ================================

fraud_count = y.sum()
normal_count = len(y) - fraud_count

scale_pos_weight = normal_count / fraud_count

print("Scale_pos_weight:", scale_pos_weight)


# ================================
# KFOLD CROSS VALIDATION
# ================================

print("\nStarting KFold validation...")

kfold = StratifiedKFold(
    n_splits=5,
    shuffle=True,
    random_state=42
)

fold_scores = []

for fold, (train_idx, val_idx) in enumerate(kfold.split(X, y)):

    print(f"\nTraining Fold {fold+1}")

    X_train_fold = X.iloc[train_idx]
    y_train_fold = y.iloc[train_idx]

    X_val_fold = X.iloc[val_idx]
    y_val_fold = y.iloc[val_idx]

    model = XGBClassifier(
        n_estimators=300,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        scale_pos_weight=scale_pos_weight,
        eval_metric="logloss",
        random_state=42,
        n_jobs=-1
    )

    model.fit(X_train_fold, y_train_fold)

    y_prob = model.predict_proba(X_val_fold)[:, 1]

    score = roc_auc_score(y_val_fold, y_prob)

    print(f"Fold {fold+1} ROC-AUC:", score)

    fold_scores.append(score)

print("\n===============================")
print("KFold ROC-AUC scores:", fold_scores)
print("Mean ROC-AUC:", np.mean(fold_scores))
print("Std deviation:", np.std(fold_scores))
print("===============================")


# ================================
# TRAIN / TEST SPLIT (FINAL CHECK)
# ================================

print("\nRunning final train/test evaluation...")

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42,
    stratify=y
)

print("Train size:", len(X_train))
print("Test size:", len(X_test))


# ================================
# FINAL MODEL TRAINING
# ================================

model = XGBClassifier(
    n_estimators=300,
    max_depth=6,
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    scale_pos_weight=scale_pos_weight,
    eval_metric="logloss",
    random_state=42,
    n_jobs=-1
)

model.fit(X_train, y_train)

print("Final model training complete")


# ================================
# EVALUATION
# ================================

y_pred = model.predict(X_test)
y_prob = model.predict_proba(X_test)[:, 1]

print("\nClassification Report")
print(classification_report(y_test, y_pred))

print("\nConfusion Matrix")
print(confusion_matrix(y_test, y_pred))

roc = roc_auc_score(y_test, y_prob)
print("\nFinal ROC AUC:", roc)


# ================================
# FEATURE IMPORTANCE
# ================================

importance = model.feature_importances_

importance_df = pd.DataFrame({
    "feature": X.columns,
    "importance": importance
}).sort_values(by="importance", ascending=False)

print("\nTop Important Features:")
print(importance_df.head(10))


# ================================
# SAVE MODEL
# ================================

print("\nSaving model...")

os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)

with open(MODEL_PATH, "wb") as f:
    pickle.dump(model, f)

print("Model saved at:", MODEL_PATH)