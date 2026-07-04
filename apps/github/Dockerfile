FROM node:22-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci


FROM deps AS build

COPY tsconfig.json ./
COPY buf.yaml buf.gen.yaml ./
COPY apps/github ./apps/github
COPY libs ./libs

RUN npm run proto:generate
RUN npm run build:github


FROM node:22-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./

RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist

EXPOSE 3004
EXPOSE 50051

CMD ["npm", "run", "start:prod:github"]