# Xorazm Media — VPS uchun konteyner (Vercel'siz). docker-compose.yml bilan ishlatiladi.
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx next build

FROM node:22-bookworm-slim AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/.next ./.next
COPY public ./public
COPY drizzle ./drizzle
COPY scripts ./scripts
COPY src ./src
COPY tsconfig.json ./
RUN mkdir -p public/uploads && chown -R node:node public/uploads
USER node
EXPOSE 3000
# Har ishga tushishda: migratsiyalar, ma'lumotnomalar (idempotent), keyin server
CMD ["sh", "-c", "npx tsx scripts/migrate.ts && npx tsx scripts/seed.ts && exec npx next start -p ${PORT}"]
