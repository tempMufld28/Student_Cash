# =============================================
# BACKEND Dockerfile — Student-Cash
# Target: Raspberry Pi (linux/arm64) or x86_64
# Build context: project root (Student_Cash/)
# =============================================

# Use Node 20 LTS on Alpine (tiny, ~50MB, runs on ARM64)
FROM node:20-alpine

# Install build tools for native sqlite3 bindings
# (node-gyp needs python + make + gcc to compile sqlite3)
RUN apk add --no-cache python3 make g++

# Create a non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# ── Install dependencies ───────────────────────────────────────
# Copy manifests first to leverage Docker layer cache:
# only reinstalled when package.json / package-lock.json change
COPY backend/package*.json ./
RUN npm ci --omit=dev

# ── Copy application source ────────────────────────────────────
COPY backend/ .

# ── Persistent data directory for SQLite ─────────────────────
# The database file lives here; mount a volume at /app/data
RUN mkdir -p /app/data && chown appuser:appgroup /app/data

# Drop privileges before starting the process
USER appuser

# Internal port (matched to PORT env var below)
EXPOSE 5000

CMD ["node", "server.js"]
