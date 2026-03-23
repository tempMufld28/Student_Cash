# =============================================
# FRONTEND Dockerfile — Student-Cash
# Multi-stage: Build (Vite) → Serve (nginx)
# Target: Raspberry Pi (linux/arm64) or x86_64
# Build context: project root (Student_Cash/)
# =============================================

# ── Stage 1: Build the React/Vite app ────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies (dev deps needed for the build step)
COPY frontend/package*.json ./
RUN npm ci

# Copy source and build.
# VITE_API_URL is set to /api so all fetch calls use a relative path.
# nginx then proxies /api → http://backend:5000 internally.
# No hard-coded IP is embedded in the production bundle.
COPY frontend/ .
RUN VITE_API_URL=/api npm run build

# ── Stage 2: Serve with nginx (tiny ~25MB final image) ───────
FROM nginx:1.27-alpine

# Remove default nginx site config
RUN rm /etc/nginx/conf.d/default.conf

# Copy our custom nginx config (proxy + SPA routing)
COPY docker/frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Copy the compiled static files from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
