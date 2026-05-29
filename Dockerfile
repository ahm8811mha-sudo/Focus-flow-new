FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
RUN pnpm install --frozen-lockfile

FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
RUN addgroup -S nodejs && adduser -S lateen -G nodejs
COPY --from=builder --chown=lateen:nodejs /app/dist ./dist
COPY --from=builder --chown=lateen:nodejs /app/package.json ./package.json
COPY --from=builder --chown=lateen:nodejs /app/node_modules ./node_modules
USER lateen
EXPOSE 3000
CMD ["node", "dist/index.js"]
