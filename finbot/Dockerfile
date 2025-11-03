# FinBot Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY finbot-forecast.py .
COPY services/ ./services/

# Environment variables for Event Bus
ENV EVENT_BUS_SECRET=ea-plan-event-bus-secret-key-min-32-chars-change-in-production
ENV REDIS_URL=redis://redis:6379

# Expose metrics port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD python3 -c "import requests; requests.get('http://localhost:8080/health').raise_for_status()" || exit 1

# Start FinBot
CMD ["python3", "finbot-forecast.py"]

