# ==============================================================================
# dAIsy HaMINJA Tether Synaptic RAG Microservice Dockerfile
# ==============================================================================
FROM python:3.11-slim AS builder

WORKDIR /usr/src/app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Production Runner
FROM python:3.11-slim AS runner

WORKDIR /usr/src/app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH

COPY src/ ./src

EXPOSE 8000

# Hardened security: Run as non-privileged system user
RUN useradd -u 8888 daisy-tether && chown -R daisy-tether:daisy-tether /usr/src/app
USER daisy-tether

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
