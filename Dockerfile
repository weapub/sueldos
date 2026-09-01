FROM node:22-slim AS deps
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build?schema=public"
# Orígenes autorizados a embeber sueldos en <iframe> (integración como módulo de
# systeg) — next.config.ts la lee en build time para el header CSP frame-ancestors.
ARG SUELDOS_FRAME_ANCESTORS
ENV SUELDOS_FRAME_ANCESTORS=$SUELDOS_FRAME_ANCESTORS
RUN npx prisma generate
RUN npm run build

# Imagen mínima para correr el server Next.js standalone.
FROM node:22-slim AS runner
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
