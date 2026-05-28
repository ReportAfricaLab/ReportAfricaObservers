# Build stage
FROM node:18-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

RUN npm ci --workspace=@reportafrica/api --workspace=@reportafrica/shared --include-workspace-root

COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

RUN npm run build --workspace=@reportafrica/api

# Production stage
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3001

CMD ["node", "dist/main"]
