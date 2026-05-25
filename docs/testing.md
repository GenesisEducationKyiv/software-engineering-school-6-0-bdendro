# Testing

This project has three test levels:

- Unit tests
- Integration tests
- End-to-end tests

All Docker-based tests are designed to start the required infrastructure from scratch.

## Prerequisites

The machine should have:

- Git
- Docker / Docker Compose
- Node.js

Node.js is only required for local npm scripts. Docker-based test runs install and run project dependencies inside containers.

## Environment file

Create `.env.test` in the project root.

You can use `.env.example` as a base:

```bash
cp .env.example .env.test
```

For Docker-based tests, external services are replaced with test infrastructure:

- PostgreSQL runs in Docker
- GitHub API is replaced by WireMock
- SMTP/email delivery is replaced by Mailpit

A minimal `.env.test` can look like this:

```env
NODE_ENV=test

APP_NAME=GitHub Release Tracker
APP_BASE_URL=http://localhost:3000/api
APP_CLIENT_BASE_URL=http://localhost:3000
APP_TIMEZONE=Europe/Kyiv

EMAIL=test@example.com
EMAIL_PASSWORD=test-password
EMAIL_HOST=mailpit
EMAIL_PORT=1025
EMAIL_SECURE=false

GITHUB_TOKEN=test-token
GITHUB_API_URL=http://wiremock:8080

UNCONFIRMED_EXPIRATION_TIME=10m
```

`DATABASE_URL` is provided by `docker-compose.test.yml`, because test containers must connect to the Docker database service by service name.

## Cleanup

After any Docker test run, clean up containers, networks and test volumes:

```bash
docker compose -f docker-compose.test.yml down -v --remove-orphans
```

This is important because test databases are disposable and should not keep state between runs.

## Unit tests

Unit tests do not require external infrastructure.

Run unit tests in Docker:

```bash
docker compose -f docker-compose.test.yml up --build --abort-on-container-exit --exit-code-from test-unit test-unit
```

Clean up:

```bash
docker compose -f docker-compose.test.yml down -v --remove-orphans
```

## Integration tests

Integration tests run against a real PostgreSQL test database.

The following infrastructure is started automatically:

- `db-test`
- `migrate`
- `test-int`

Run integration tests in Docker:

```bash
docker compose -f docker-compose.test.yml --env-file .env.test up --build --abort-on-container-exit --exit-code-from test-int test-int
```

Clean up:

```bash
docker compose -f docker-compose.test.yml down -v --remove-orphans
```

## End-to-end tests

End-to-end tests run through Playwright and use the real application flow.

The following infrastructure is started automatically:

- `db-test`
- `migrate`
- `wiremock`
- `mailpit`
- `test-e2e`

WireMock replaces GitHub API calls.

Mailpit replaces real email delivery.

Run e2e tests in Docker:

```bash
docker compose -f docker-compose.test.yml --env-file .env.test up --build --abort-on-container-exit --exit-code-from test-e2e test-e2e
```

Clean up:

```bash
docker compose -f docker-compose.test.yml down -v --remove-orphans
```

## Recommended workflow

Run the needed test type:

```bash
docker compose -f docker-compose.test.yml up --build --abort-on-container-exit --exit-code-from test-unit test-unit
```

or:

```bash
docker compose -f docker-compose.test.yml --env-file .env.test up --build --abort-on-container-exit --exit-code-from test-int test-int
```

or:

```bash
docker compose -f docker-compose.test.yml --env-file .env.test up --build --abort-on-container-exit --exit-code-from test-e2e test-e2e
```

Then always clean up:

```bash
docker compose -f docker-compose.test.yml down -v --remove-orphans
```
