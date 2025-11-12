FROM python:3.11.10-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Native libs for scientific stack (numpy/pandas) and requests/plumbing tools
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    build-essential \
    python3-dev \
    libgomp1 \
    git \
  && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./

RUN pip install --no-cache-dir --upgrade pip \
  && pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "mubot-ingestion:app", "--host", "0.0.0.0", "--port", "8000"]

