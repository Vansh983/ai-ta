# Use Python 3.11 as base image (more stable for these packages)
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies required for Python packages
# Including libpq-dev for psycopg2 and other build tools
RUN apt-get update && apt-get install -y \
    build-essential \
    pkg-config \
    libpq-dev \
    postgresql-client \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip and install setuptools first
RUN pip install --upgrade pip setuptools wheel

# Copy requirements first to leverage Docker cache
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code
COPY src/ ./src/
COPY config/ ./config/

# Copy environment file if it exists (optional)
COPY .env* ./

# Create necessary directories
RUN mkdir -p /app/uploads
RUN mkdir -p /app/logs

# Create non-root user for security
RUN useradd --create-home --shell /bin/bash app && chown -R app:app /app
USER app

# Expose the port the app runs on
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Command to run the application
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"] 