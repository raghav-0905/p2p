import pickle
import pandas as pd
from flask import Flask, request, jsonify
from flask_cors import CORS
import os

# ================================
# LOAD MODEL
# ================================

MODEL_PATH = "../trained_models/xgboost_fraud_model.pkl"

with open(MODEL_PATH, "rb") as f:
    model = pickle.load(f)

print("Model loaded successfully")

# ================================
# FLASK APP
# ================================

app = Flask(__name__)
CORS(app)  # Enables CORS for all routes


# ================================
# HEALTH CHECK
# ================================

@app.route("/")
def home():
    return {"status": "Fraud detection API running"}


# ================================
# PREDICT ENDPOINT
# ================================

@app.route("/predict", methods=["POST"])
def predict():

    data = request.json

    try:

        # Convert to DataFrame
        df = pd.DataFrame([data])

        # =========================
        # DATE FEATURE ENGINEERING
        # =========================

        df["invoice_date"] = pd.to_datetime(df["invoice_date"])

        df["invoice_month"] = df["invoice_date"].dt.month
        df["invoice_day"] = df["invoice_date"].dt.day
        df["invoice_weekday"] = df["invoice_date"].dt.weekday

        df.drop(columns=["invoice_date"], inplace=True)
        df.drop(columns=["supplier_id"], inplace = True)

        # =========================
        # SHAP FEATURE CONTRIBUTIONS
        # =========================
        
        # We use shap.TreeExplainer for xgboost models
        import shap
        explainer = shap.TreeExplainer(model)
        shap_values = explainer.shap_values(df)

        prob = model.predict_proba(df)[0][1]
        prediction = int(prob > 0.5)
        
        # Prepare feature contributions dictionary
        feature_contributions = {}
        for i, col in enumerate(df.columns):
            feature_contributions[col] = float(shap_values[0][i])

        return jsonify({
            "fraud_probability": float(prob),
            "is_fraud": prediction,
            "feature_contributions": feature_contributions
        })

    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 400


# ================================
# RUN SERVER
# ================================

if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )