FROM node:22-alpine AS base

WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma/
COPY public ./public/
COPY prisma.config.ts ./
COPY docs/swagger.json ./docs/swagger.json

# --- Dependencies stage ---
FROM base AS deps

COPY buf.yaml buf.gen.yaml ./

RUN npm ci

# Generate Prisma client
RUN npm run prisma:generate
RUN npm run proto:generate

# --- Migration stage ---
FROM deps AS migration

COPY . .

CMD ["npm", "run", "migrate:prod"]

# --- Build stage ---
FROM deps AS build

COPY . .

RUN npm run build

# --- Production stage ---
FROM base AS production

ENV NODE_ENV=production

RUN npm ci --omit=dev

COPY --from=build /app/dist/src ./dist/src
COPY --from=build /app/dist/libs ./dist/libs

EXPOSE 3000

CMD ["sh", "-c", "npm run start:prod"]

# --- Unit test stage ---
FROM deps AS test-unit

COPY . .

CMD ["sh", "-c", "npm run test:unit"]

# --- Integration test stage ---
FROM deps AS test-int

COPY . .

CMD ["sh", "-c", "npm run test:int"]
