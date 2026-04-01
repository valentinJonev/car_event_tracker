FROM python:3.12-slim

WORKDIR /app

# Ensure /app is on Python's import path (needed when bind-mounting)
ENV PYTHONPATH=/app

# Install system dependencies for PostGIS client and building Python packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    libgeos-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency files and install Python dependencies (deps only, no editable install)
COPY pyproject.toml .
RUN pip install --no-cache-dir ".[dev]"

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Run with uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
