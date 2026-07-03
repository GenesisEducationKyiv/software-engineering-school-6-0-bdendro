# GitHub Release Subscription API

An API service for subscribing to email notifications about new releases of selected GitHub repositories.

The application validates repositories through the GitHub API, stores subscriptions in PostgreSQL, sends confirmation emails, periodically checks for new releases, and notifies confirmed subscribers when a new release appears.

---

## Implemented Features

- Subscription creation for a GitHub repository in `owner/repo` format
- Repository existence validation through GitHub API
- Email confirmation flow
- Unsubscribe flow via token
- Get all subscriptions by email
- Persistent storage in PostgreSQL
- Prisma migrations
- Scheduled release scanning
- `last_seen_tag` tracking to avoid duplicate notifications
- GitHub API rate limit handling
- Request validation with Zod
- Unit tests for business logic
- Docker and Docker Compose support
- CI pipeline for format check, lint, build, and tests
- Interactive Swagger UI documentation for API exploration and testing

---

## Tech Stack

- Node.js
- TypeScript
- Express
- PostgreSQL
- Prisma
- Axios
- Zod
- Nodemailer
- node-cron
- Jest
- ESLint + Prettier
- Docker

---

## API Documentation

Interactive API documentation is available through Swagger UI.

After starting the application, open:

```text
http://localhost:3000/api-docs
```

The Swagger UI allows you to:

- inspect all available endpoints
- view request and response schemas
- test the API directly from the browser using Try it out

The API contract is defined in `swagger.json`

---

## Run Options

### 1. Run with Docker

Create `.env` from the example file:

```bash
cp .env.example .env
```

Then **manually update** the required values in `.env`.

Start the application:

```bash
docker compose up --build
```

Stop and remove containers:

```bash
docker compose down -v
```

---

### 2. Run locally without Docker

Install dependencies:

```bash
npm install
```

Create `.env` from the example file:

```bash
cp .env.example .env
```

Then **manually update** the required values in `.env`.

Generate Prisma client:

```bash
npm run prisma:generate
```

Generate gRPC contracts:

```bash
npm run proto:generate
```

Apply migrations:

```bash
npm run migrate:prod
```

#### Main API

Start in development mode:

```bash
npm run start
```

Build and run in production mode:

```bash
npm run build
npm run start:prod
```

#### Notification Service

Start in development mode:

```bash
npm run start:notification
```

Build and run in production mode:

```bash
npm run build:notification
npm run start:prod:notification
```

#### Tracker Service

Start in development mode:

```bash
npm run start:tracker
```

Build and run in production mode:

```bash
npm run build:tracker
npm run start:prod:tracker
```

#### GitHub Service

Start in development mode:

```bash
npm run start:github
```

Build and run in production mode:

```bash
npm run build:github
npm run start:prod:github
```

---

### 3. Run tests with Docker

Create `.env.test` manually:

```bash
cp .env.example .env.test
```

Then **manually update** the required values in `.env.test`.

To run tests in Docker see also [`testing.md`](./docs/testing.md)

> **Note**
> The repository contains `.env.example`, but does not include `.env.test.example`, so `.env.test` must be created manually.

---

### 4. Run tests without Docker

Install dependencies:

```bash
npm install
```

Create `.env.test` manually:

```bash
cp .env.example .env.test
```

Generate Prisma client:

```bash
npm run prisma:generate
```

You can run the unit test command:

```bash
npm run test:unit
```

---

## Endpoints

Base path:

```text
/api
```

| Method | Endpoint                                    | Description                                                         |
| ------ | ------------------------------------------- | ------------------------------------------------------------------- |
| `POST` | `/api/subscribe`                            | Subscribe an email to release notifications for a GitHub repository |
| `GET`  | `/api/confirm/{token}`                      | Confirm a subscription using the token from the email               |
| `GET`  | `/api/unsubscribe/{token}`                  | Unsubscribe using the token from the email                          |
| `GET`  | `/api/subscriptions?email=user@example.com` | Get all subscriptions for the given email                           |

### Example request: subscribe

```json
{
  "email": "user@example.com",
  "repo": "golang/go"
}
```

### Example response: subscriptions list

```json
[
  {
    "email": "user@example.com",
    "repo": "golang/go",
    "confirmed": true,
    "last_seen_tag": "go1.25.0"
  }
]
```

---

## Author

[`Oleh Buriachok`](https://github.com/bdendro)
