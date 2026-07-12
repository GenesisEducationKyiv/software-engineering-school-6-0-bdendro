FROM node:22-alpine AS base

WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma/
COPY public ./public/
COPY prisma.config.ts ./
COPY docs/swagger.json ./docs/swagger.json

# --- Dependencies stage ---
FROM base AS deps

RUN npm ci

# Generate Prisma client
RUN npm run generate:prisma

# --- Migration stage ---
FROM deps AS migration

COPY . .

CMD ["npx", "prisma", "migrate", "deploy"]

# --- Build stage ---
FROM deps AS build

COPY . .

RUN npm run build

# --- Unit test stage ---
FROM deps AS test-unit

COPY . .

CMD ["sh", "-c", "npm run test:unit"]

# --- Integration test stage ---
FROM deps AS test-int

COPY . .

CMD ["sh", "-c", "npm run test:int"]

# --- Production stage ---
FROM base AS production

ENV NODE_ENV=production

RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist

EXPOSE 3000

CMD ["sh", "-c", "node dist/main.js"]
