# MuBot Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY mubot-ingestion.py .

# Expose metrics port
EXPOSE 8081

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD python3 -c "import requests; requests.get('http://localhost:8081/health').raise_for_status()" || exit 1

# Start MuBot
CMD ["python3", "mubot-ingestion.py"]

