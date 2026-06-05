# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

RUN npm ci --workspace=@reportafrica/api --workspace=@reportafrica/shared --include-workspace-root

COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

RUN npm run build --workspace=@reportafrica/api

# Production stage
FROM node:20-alpine AS runner
WORKDIR /app

RUN npm install -g pm2

ENV NODE_ENV=production

COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./
COPY --from=builder /app/node_modules ./node_modules

# PM2 ecosystem config for cluster mode
RUN echo '{"apps":[{"name":"reportafrica-api","script":"dist/main.js","instances":2,"exec_mode":"cluster","max_memory_restart":"400M"}]}' > ecosystem.config.json

EXPOSE 3001

CMD ["pm2-runtime", "ecosystem.config.json"]
