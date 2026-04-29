FROM node:22-alpine AS base

WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma/

# --- Dependencies stage ---
FROM base AS deps

RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# --- Build stage ---
FROM deps AS build

COPY . .
RUN npm run build

# --- Production stage ---
FROM base AS production

ENV NODE_ENV=production

RUN npm ci --omit=dev
RUN npx prisma generate

COPY --from=build /app/dist ./dist

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]

# --- Test stage ---
FROM deps AS test

COPY . .

CMD ["sh", "-c", "npx prisma migrate deploy && npm run test"]
