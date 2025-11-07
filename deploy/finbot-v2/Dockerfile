FROM python:3.11.10-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# System dependencies required by prophet and scientific stack
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

CMD ["uvicorn", "finbot-forecast:app", "--host", "0.0.0.0", "--port", "8000"]

