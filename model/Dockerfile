FROM python:3.11-slim

WORKDIR /app

# Install dependencies first (cache layer)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy trained model and API code
COPY trained_models ./trained_models
COPY api ./api

EXPOSE 5000

# Run from /app so the relative model path "../trained_models/" resolves correctly
WORKDIR /app/api

CMD ["python", "app.py"]
