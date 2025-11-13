FROM node:20-alpine AS backend-builder
WORKDIR /app/backend
RUN corepack enable && corepack prepare pnpm@10.20.0 --activate
COPY backend/package.json backend/pnpm-lock.yaml ./
COPY backend/tsconfig*.json ./
COPY backend/prisma ./prisma
COPY backend/src ./src
COPY backend/scripts ./scripts
RUN pnpm install --frozen-lockfile
RUN pnpm prisma:generate:force && pnpm build

FROM gcr.io/distroless/nodejs20-debian12:nonroot AS backend-runner
WORKDIR /app/backend
ENV NODE_ENV=production
ENV PORT=3030
COPY backend/package.json ./package.json
COPY --from=backend-builder /app/backend/node_modules ./node_modules
COPY --from=backend-builder /app/backend/dist ./dist
COPY --from=backend-builder /app/backend/prisma ./prisma
COPY backend/docker/healthcheck.js ./healthcheck.js
EXPOSE 3030
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD ["node", "/app/backend/healthcheck.js"]
CMD ["node", "-e", "require('child_process').execSync('node node_modules/.bin/prisma migrate deploy',{stdio:'inherit'}); require('/app/backend/dist/index.js')"]

FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
RUN corepack enable && corepack prepare pnpm@10.20.0 --activate
COPY frontend/package.json frontend/pnpm-lock.yaml ./
COPY frontend/tsconfig.json frontend/next.config.ts ./
COPY frontend/public ./public
COPY frontend/src ./src
RUN pnpm install --frozen-lockfile
RUN pnpm build --webpack

FROM gcr.io/distroless/nodejs20-debian12:nonroot AS frontend-runner
WORKDIR /app/frontend
ENV NODE_ENV=production
ENV PORT=3131
COPY --from=frontend-builder /app/frontend/.next/standalone ./
COPY --from=frontend-builder /app/frontend/.next/static ./.next/static
COPY --from=frontend-builder /app/frontend/public ./public
COPY frontend/docker/healthcheck.js ./healthcheck.js
EXPOSE 3131
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD ["node", "/app/frontend/healthcheck.js"]
CMD ["node", "server.js"]

FROM backend-runner
