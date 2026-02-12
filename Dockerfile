ARG SERVICE=frontend

# ============================================================
# FRONTEND BUILD
# ============================================================
FROM node:22-alpine AS frontend-deps
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

FROM node:22-alpine AS frontend-builder
WORKDIR /app
COPY --from=frontend-deps /app/node_modules ./node_modules
COPY frontend/ .
ARG NEXT_PUBLIC_API_URL
ENV BACKEND_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build

FROM node:22-alpine AS frontend
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=frontend-builder /app/.next/standalone ./
COPY --from=frontend-builder /app/.next/static ./.next/static
USER nextjs
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]

# ============================================================
# BACKEND BUILD
# ============================================================
FROM python:3.11-slim AS backend
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]

# ============================================================
# SERVICE SELECTOR — Railway sets SERVICE env var per service
# ============================================================
FROM ${SERVICE} AS final
