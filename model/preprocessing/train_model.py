import pandas as pd
import pickle
import os
import numpy as np

from sklearn.model_selection import train_test_split, StratifiedKFold
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    roc_auc_score,
    precision_recall_curve,
    average_precision_score,
    f1_score,
)
from xgboost import XGBClassifier


# ================================
# PATHS
# ================================

DATA_PATH = "final_training_dataset_v2.csv"
MODEL_PATH = "../trained_models/xgboost_fraud_model.pkl"


# ================================
# LOAD DATA
# ================================

print("=" * 60)
print("LOADING DATASET")
print("=" * 60)

df = pd.read_csv(DATA_PATH)

print(f"Dataset shape: {df.shape}")
print(f"Columns ({len(df.columns)}): {df.columns.tolist()}")


# ================================
# TARGET & FEATURES
# ================================

TARGET = "is_fraud"
X = df.drop(columns=[TARGET])
y = df[TARGET]

fraud_count = y.sum()
normal_count = len(y) - fraud_count
fraud_ratio = fraud_count / len(y)

print(f"\nFraud:  {fraud_count:,} ({fraud_ratio:.2%})")
print(f"Normal: {normal_count:,} ({1 - fraud_ratio:.2%})")


# ================================
# TRAIN / TEST SPLIT
# ================================

print("\n" + "=" * 60)
print("TRAIN / TEST SPLIT")
print("=" * 60)

X_train, X_test, y_train, y_test = train_test_split(
    X, y,
    test_size=0.2,
    random_state=42,
    stratify=y,
)

print(f"Train: {len(X_train):,} samples")
print(f"Test:  {len(X_test):,} samples")


# ================================
# CLASS WEIGHT
# ================================

train_fraud = y_train.sum()
train_normal = len(y_train) - train_fraud
scale_pos_weight = train_normal / train_fraud  # proper ratio, no arbitrary multiplier

print(f"\nscale_pos_weight: {scale_pos_weight:.2f}")


# ================================
# K-FOLD CROSS VALIDATION
# ================================

print("\n" + "=" * 60)
print("5-FOLD STRATIFIED CROSS VALIDATION")
print("=" * 60)

kfold = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

fold_roc_scores = []
fold_pr_scores = []

for fold, (train_idx, val_idx) in enumerate(kfold.split(X_train, y_train)):
    print(f"\n--- Fold {fold + 1} ---")

    X_tr = X_train.iloc[train_idx]
    y_tr = y_train.iloc[train_idx]
    X_val = X_train.iloc[val_idx]
    y_val = y_train.iloc[val_idx]

    model = XGBClassifier(
        n_estimators=500,
        max_depth=6,
        learning_rate=0.05,
        min_child_weight=5,
        gamma=0.1,
        subsample=0.8,
        colsample_bytree=0.7,
        colsample_bylevel=0.7,
        scale_pos_weight=scale_pos_weight,
        reg_alpha=1.0,
        reg_lambda=2.0,
        max_delta_step=1,
        eval_metric="logloss",
        random_state=42,
        n_jobs=-1,
        early_stopping_rounds=30,
    )

    model.fit(
        X_tr, y_tr,
        eval_set=[(X_val, y_val)],
        verbose=False,
    )

    y_prob = model.predict_proba(X_val)[:, 1]

    roc = roc_auc_score(y_val, y_prob)
    pr_auc = average_precision_score(y_val, y_prob)

    print(f"  ROC-AUC: {roc:.4f}  |  PR-AUC: {pr_auc:.4f}")

    fold_roc_scores.append(roc)
    fold_pr_scores.append(pr_auc)

print(f"\n{'=' * 40}")
print(f"Mean ROC-AUC:  {np.mean(fold_roc_scores):.4f} ± {np.std(fold_roc_scores):.4f}")
print(f"Mean PR-AUC:   {np.mean(fold_pr_scores):.4f} ± {np.std(fold_pr_scores):.4f}")
print(f"{'=' * 40}")


# ================================
# TRAIN FINAL MODEL
# ================================

print("\n" + "=" * 60)
print("TRAINING FINAL MODEL")
print("=" * 60)

final_model = XGBClassifier(
    n_estimators=600,
    max_depth=6,
    learning_rate=0.03,
    min_child_weight=5,
    gamma=0.1,
    subsample=0.8,
    colsample_bytree=0.7,
    colsample_bylevel=0.7,
    scale_pos_weight=scale_pos_weight,
    reg_alpha=1.0,
    reg_lambda=2.0,
    max_delta_step=1,
    eval_metric="logloss",
    random_state=42,
    n_jobs=-1,
    early_stopping_rounds=50,
)

final_model.fit(
    X_train, y_train,
    eval_set=[(X_test, y_test)],
    verbose=False,
)

print("Final model training complete.")
print(f"Best iteration: {final_model.best_iteration}")


# ================================
# THRESHOLD OPTIMIZATION
# ================================

print("\n" + "=" * 60)
print("THRESHOLD OPTIMIZATION (Precision-Recall Curve)")
print("=" * 60)

y_prob_test = final_model.predict_proba(X_test)[:, 1]

precisions, recalls, thresholds = precision_recall_curve(y_test, y_prob_test)

# Find threshold that maximizes F1
f1_scores = 2 * (precisions * recalls) / (precisions + recalls + 1e-8)
best_idx = np.argmax(f1_scores)
best_threshold = thresholds[best_idx] if best_idx < len(thresholds) else 0.5
best_f1 = f1_scores[best_idx]

print(f"\nBest threshold (max F1): {best_threshold:.4f}")
print(f"Best F1 score:          {best_f1:.4f}")
print(f"Precision at best:      {precisions[best_idx]:.4f}")
print(f"Recall at best:         {recalls[best_idx]:.4f}")

# Show a range of thresholds
print(f"\n{'Threshold':<12} {'Precision':<12} {'Recall':<12} {'F1':<12}")
print("-" * 48)
for t in [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8]:
    y_pred_t = (y_prob_test >= t).astype(int)
    p = np.sum((y_pred_t == 1) & (y_test == 1)) / (np.sum(y_pred_t == 1) + 1e-8)
    r = np.sum((y_pred_t == 1) & (y_test == 1)) / (np.sum(y_test == 1) + 1e-8)
    f = 2 * p * r / (p + r + 1e-8)
    print(f"{t:<12.2f} {p:<12.4f} {r:<12.4f} {f:<12.4f}")


# ================================
# EVALUATION AT BEST THRESHOLD
# ================================

print("\n" + "=" * 60)
print(f"EVALUATION (threshold = {best_threshold:.4f})")
print("=" * 60)

y_pred = (y_prob_test >= best_threshold).astype(int)

print("\nClassification Report:")
print(classification_report(y_test, y_pred))

print("Confusion Matrix:")
cm = confusion_matrix(y_test, y_pred)
print(cm)
print(f"  TN={cm[0][0]:,}  FP={cm[0][1]:,}")
print(f"  FN={cm[1][0]:,}  TP={cm[1][1]:,}")

roc_final = roc_auc_score(y_test, y_prob_test)
pr_auc_final = average_precision_score(y_test, y_prob_test)

print(f"\nROC-AUC:  {roc_final:.4f}")
print(f"PR-AUC:   {pr_auc_final:.4f}")


# ================================
# ALSO SHOW EVALUATION AT 0.5 THRESHOLD
# ================================

print("\n" + "=" * 60)
print("EVALUATION (threshold = 0.50, for comparison)")
print("=" * 60)

y_pred_50 = (y_prob_test >= 0.5).astype(int)

print("\nClassification Report:")
print(classification_report(y_test, y_pred_50))

print("Confusion Matrix:")
cm50 = confusion_matrix(y_test, y_pred_50)
print(cm50)


# ================================
# FEATURE IMPORTANCE
# ================================

print("\n" + "=" * 60)
print("FEATURE IMPORTANCE")
print("=" * 60)

importance = final_model.feature_importances_
importance_df = pd.DataFrame({
    "feature": X.columns,
    "importance": importance,
    "importance_pct": (importance / importance.sum()) * 100,
}).sort_values(by="importance", ascending=False)

print(f"\n{'Feature':<40} {'Importance':<12} {'%':<8}")
print("-" * 60)
for _, row in importance_df.iterrows():
    print(f"{row['feature']:<40} {row['importance']:<12.4f} {row['importance_pct']:<8.2f}%")

# Verify no single feature > 50%
max_imp = importance_df["importance_pct"].max()
if max_imp > 50:
    print(f"\n[WARNING] Feature '{importance_df.iloc[0]['feature']}' has {max_imp:.1f}% importance!")
else:
    print(f"\n[OK] No single feature dominates (max = {max_imp:.1f}%)")


# ================================
# ANALYZE WRONG PREDICTIONS
# ================================

print("\n" + "=" * 60)
print("ERROR ANALYSIS")
print("=" * 60)

results_df = X_test.copy()
results_df["actual"] = y_test.values
results_df["predicted"] = y_pred
results_df["probability"] = y_prob_test

# False Negatives (Missed Fraud)
fn = results_df[(results_df["actual"] == 1) & (results_df["predicted"] == 0)]
print(f"\nFalse Negatives (Missed Frauds): {len(fn):,}")
if len(fn) > 0:
    print("  Probability distribution of missed frauds:")
    print(f"    Min: {fn['probability'].min():.4f}")
    print(f"    Median: {fn['probability'].median():.4f}")
    print(f"    Max: {fn['probability'].max():.4f}")

# False Positives (Wrong Alerts)
fp = results_df[(results_df["actual"] == 0) & (results_df["predicted"] == 1)]
print(f"\nFalse Positives (False Alerts): {len(fp):,}")
if len(fp) > 0:
    print("  Probability distribution of false alerts:")
    print(f"    Min: {fp['probability'].min():.4f}")
    print(f"    Median: {fp['probability'].median():.4f}")
    print(f"    Max: {fp['probability'].max():.4f}")


# ================================
# SAVE MODEL
# ================================

print("\n" + "=" * 60)
print("SAVING MODEL")
print("=" * 60)

os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)

model_artifact = {
    "model": final_model,
    "threshold": best_threshold,
    "features": list(X.columns),
    "metrics": {
        "roc_auc": roc_final,
        "pr_auc": pr_auc_final,
        "best_f1": best_f1,
        "best_threshold": best_threshold,
    },
}

with open(MODEL_PATH, "wb") as f:
    pickle.dump(model_artifact, f)

print(f"Model saved at: {MODEL_PATH}")
print(f"Threshold saved: {best_threshold:.4f}")
print(f"Features saved: {len(X.columns)} features")
print("\n[OK] Done!")