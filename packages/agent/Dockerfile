# Vacuum agent runner — Node 20
# Build from repo root: docker build -f packages/agent/Dockerfile .

FROM node:20-alpine AS builder

WORKDIR /app
COPY packages/sdk packages/sdk
COPY packages/agent packages/agent

WORKDIR /app/packages/sdk
RUN npm install && npm run build

WORKDIR /app/packages/agent
RUN npm install && npm run build

FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
COPY --from=builder /app/packages/agent/dist ./dist
COPY --from=builder /app/packages/agent/node_modules ./node_modules
COPY --from=builder /app/packages/agent/package*.json ./

ENV RPC_URL=""
ENV CHAIN_ID=421614
ENV DRY_RUN=true
ENV LOG_LEVEL=info

USER node
CMD ["node", "dist/index.js"]
