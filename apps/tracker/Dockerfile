FROM node:22-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci


FROM deps AS build

COPY tsconfig.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./
COPY apps/tracker ./apps/tracker
COPY libs ./libs

# Generate Prisma client
RUN npm run prisma:generate

RUN npm run build:tracker


FROM node:22-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./

RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist

EXPOSE 3003

CMD ["npm", "run", "start:prod:tracker"]