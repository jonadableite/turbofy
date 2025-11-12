FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml tsconfig.json ./
COPY prisma ./prisma
COPY src ./src
RUN pnpm install --frozen-lockfile
RUN pnpm prisma:generate
RUN pnpm build

FROM gcr.io/distroless/nodejs20-debian12:nonroot AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
COPY package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY docker/healthcheck.js ./healthcheck.js
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD ["node", "/app/healthcheck.js"]
CMD ["node", "-e", "require('child_process').execSync('node node_modules/.bin/prisma migrate deploy',{stdio:'inherit'}); require('/app/dist/index.js')"]