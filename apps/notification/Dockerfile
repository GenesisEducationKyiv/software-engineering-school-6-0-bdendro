FROM node:22-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci


FROM deps AS build

COPY tsconfig.json ./
COPY apps/notification ./apps/notification
COPY libs ./libs

RUN npm run build:notification


FROM node:22-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./

RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist

EXPOSE 3002

CMD ["npm", "run", "start:notification:prod"]