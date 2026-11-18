# Multi-stage Dockerfile for DisputeShield Web Application
# Stage 1: Build React Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Build Golang Backend
FROM golang:1.22-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/go.mod ./
COPY backend/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /app/disputeshield-server ./cmd/server

# Stage 3: Minimal Production Image
FROM alpine:3.19
WORKDIR /app
RUN apk --no-cache add ca-certificates tzdata

# Copy backend binary and static assets
COPY --from=backend-builder /app/disputeshield-server /app/disputeshield-server
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist
COPY data/historical /app/data/historical
COPY data/sample_upload /app/data/sample_upload

# Configure environment variables
ENV PORT=8080
ENV HISTORICAL_DIR=/app/data/historical
ENV SAMPLE_UPLOAD_DIR=/app/data/sample_upload
ENV FRONTEND_DIST=/app/frontend/dist

EXPOSE 8080

CMD ["/app/disputeshield-server"]
