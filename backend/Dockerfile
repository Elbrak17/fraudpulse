# FraudPulse Backend — Lightweight Production Image
FROM python:3.12-slim

# Install curl for dataset download
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies first (layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Download full dataset from GitHub Releases (if DATASET_URL is provided)
ARG DATASET_URL
RUN if [ -n "$DATASET_URL" ]; then \
      echo "Downloading dataset from $DATASET_URL..." && \
      mkdir -p data && \
      curl -L -o data/creditcard.csv.gz "$DATASET_URL" && \
      echo "Dataset downloaded: $(du -h data/creditcard.csv.gz | cut -f1)"; \
    else \
      echo "No DATASET_URL provided, using sample dataset"; \
    fi

# Railway sets PORT automatically
ENV PORT=8080
EXPOSE ${PORT}

# Start uvicorn
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port $PORT"]
