# Ardu MCP server image. Build context = repository root:
#   docker build -f mcp/Dockerfile -t ardu-mcp .
FROM node:22-slim

WORKDIR /app
# The MCP server reuses the backend's generator code (prompt + gates).
COPY backend/package.json backend/package-lock.json backend/
RUN cd backend && npm ci --omit=dev --no-audit --no-fund
COPY mcp/package.json mcp/package-lock.json mcp/
RUN cd mcp && npm ci --omit=dev --no-audit --no-fund

COPY backend/src backend/src
COPY mcp/src mcp/src
COPY evals/results/summary.json evals/results/summary.json

# The backend logger writes files under ./logs
RUN mkdir -p /app/logs && chown node /app/logs
USER node
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8080
EXPOSE 8080
CMD ["node", "mcp/src/http.js"]
