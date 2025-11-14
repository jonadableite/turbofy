FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable
RUN corepack prepare pnpm@10.22.0 --activate
COPY backend/package.json backend/pnpm-lock.yaml backend/tsconfig*.json ./
COPY backend/prisma ./prisma
COPY backend/src ./src
COPY backend/scripts ./scripts
RUN pnpm install --no-frozen-lockfile
RUN pnpm prisma:generate
RUN pnpm build

FROM gcr.io/distroless/nodejs20-debian12:nonroot AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3030
COPY backend/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY backend/docker/healthcheck.js ./healthcheck.js
EXPOSE 3030
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD ["node", "/app/healthcheck.js"]
CMD ["node", "dist/index.js"]